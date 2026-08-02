use rusqlite::Connection;
use uuid::Uuid;

use crate::ai_context;
use crate::db;
use crate::dynamic_context;
use crate::i18n::{CommandError, CommandResult};
use crate::models::{Message, Provider, RetrySettings};
use crate::prompt_builder;
use crate::provider_client;
use crate::provider_support;
use crate::runtime::AppState;
use crate::semantic_memory;

pub(crate) struct PreparedGeneration {
    pub(crate) history: Vec<Message>,
    pub(crate) system_prompt: Option<String>,
    pub(crate) retry: RetrySettings,
}

pub(crate) async fn prepare(
    state: &AppState,
    chat_id: &str,
    full_history: &[Message],
    chat_provider: &Provider,
    query_text: &str,
    response_language: Option<&str>,
) -> CommandResult<PreparedGeneration> {
    let (
        settings,
        mut context,
        mut system_prompt,
        analysis_provider,
        embedding_provider,
        recent_message_limit,
    ) = {
        let database = state.database.lock().map_err(CommandError::internal)?;
        let settings = db::get_settings(&database)?;
        let context = db::get_dynamic_context(&database, chat_id)?;
        let system_prompt =
            build_chat_system_prompt(&database, chat_id, full_history, response_language)?;
        let analysis_provider = settings
            .ai_modules
            .dynamic_context
            .provider_id
            .as_deref()
            .and_then(|id| db::provider_optional(&database, id).ok().flatten())
            .or_else(|| Some(chat_provider.clone()));
        let recent_message_limit = db::chat_recent_message_limit(&database, chat_id)?;
        let embedding_provider = settings
            .ai_modules
            .semantic_memory
            .provider_id
            .as_deref()
            .and_then(|id| db::provider_optional(&database, id).ok().flatten())
            .or_else(|| Some(chat_provider.clone()));
        (
            settings,
            context,
            system_prompt,
            analysis_provider,
            embedding_provider,
            recent_message_limit,
        )
    };

    let retry = settings.ai_modules.retry.clone();
    let dynamic_settings = &settings.ai_modules.dynamic_context;
    if dynamic_settings.enabled {
        let batch =
            dynamic_context::pending_batch(full_history, context.as_ref(), dynamic_settings);
        if !batch.is_empty() {
            let analysis_secret = analysis_provider.as_ref().and_then(provider_secret_or_none);
            let model_provider = if dynamic_settings.mode == "local" {
                None
            } else {
                analysis_provider.as_ref()
            };
            let outcome = ai_context::analyze_dialogue(
                dynamic_settings,
                context.as_ref(),
                &batch,
                model_provider,
                analysis_secret.as_deref(),
                &retry,
            )
            .await;
            if let Some(warning) = outcome.warning.as_ref() {
                eprintln!("Dynamic context analysis fell back to local mode: {warning}");
            }
            {
                let database = state.database.lock().map_err(CommandError::internal)?;
                db::save_dynamic_context(&database, chat_id, &outcome.state)?;
                if let (Some(usage), Some(provider)) =
                    (outcome.usage.as_ref(), analysis_provider.as_ref())
                {
                    db::record_usage(
                        &database,
                        &Uuid::new_v4().to_string(),
                        &provider.id,
                        &provider.model,
                        usage.input_tokens,
                        usage.output_tokens,
                    )?;
                }
            }
            context = Some(outcome.state);
        }
        append_prompt_section(
            &mut system_prompt,
            context
                .as_ref()
                .and_then(dynamic_context::render_context_section),
        );
    }

    let semantic_settings = &settings.ai_modules.semantic_memory;
    if semantic_settings.enabled {
        if let Some(provider) = embedding_provider.as_ref() {
            let embedding_model = provider
                .embedding_model
                .as_deref()
                .map(str::trim)
                .filter(|model| !model.is_empty());
            if let Some(embedding_model) = embedding_model {
                let semantic_context = dynamic_settings
                    .enabled
                    .then_some(context.as_ref())
                    .flatten();
                let candidates = semantic_memory::build_candidates(
                    full_history,
                    semantic_context,
                    semantic_settings,
                );
                let embedding_secret = provider_secret_or_none(provider);
                let indexed = {
                    let database = state.database.lock().map_err(CommandError::internal)?;
                    db::prune_semantic_memories(
                        &database,
                        chat_id,
                        &provider.id,
                        embedding_model,
                        &candidates,
                    )?;
                    db::semantic_memory_indexed_contents(
                        &database,
                        chat_id,
                        &provider.id,
                        embedding_model,
                    )?
                };

                match ai_context::embed_missing_candidates(
                    provider,
                    embedding_secret.as_deref(),
                    &retry,
                    &candidates,
                    &indexed,
                    semantic_settings.batch_size,
                )
                .await
                {
                    Ok(embedded) if !embedded.is_empty() => {
                        let database = state.database.lock().map_err(CommandError::internal)?;
                        db::upsert_semantic_memories(
                            &database,
                            chat_id,
                            &provider.id,
                            embedding_model,
                            &embedded,
                        )?;
                    }
                    Ok(_) => {}
                    Err(error) => {
                        eprintln!("Semantic memory indexing skipped: {error}");
                    }
                }

                let query = query_text.trim();
                if !query.is_empty() {
                    match provider_client::embed(
                        provider,
                        embedding_secret.as_deref(),
                        &[query.to_owned()],
                        &retry,
                    )
                    .await
                    {
                        Ok(result) => {
                            if let Some(query_embedding) = result.embeddings.first() {
                                let mut records = {
                                    let database =
                                        state.database.lock().map_err(CommandError::internal)?;
                                    db::list_semantic_memories(
                                        &database,
                                        chat_id,
                                        &provider.id,
                                        embedding_model,
                                    )?
                                };
                                let selected = semantic_memory::select_relevant(
                                    &mut records,
                                    query_embedding,
                                    semantic_settings.top_k,
                                    semantic_settings.similarity_threshold,
                                );
                                append_prompt_section(
                                    &mut system_prompt,
                                    semantic_memory::render_memory_section(&selected),
                                );
                            }
                        }
                        Err(error) => {
                            eprintln!("Semantic memory retrieval skipped: {error}");
                        }
                    }
                }
            } else {
                eprintln!(
                    "Semantic memory is enabled, but provider '{}' has no embedding model",
                    provider.name
                );
            }
        }
    }

    let history = if dynamic_settings.enabled {
        dynamic_context::trim_history(
            full_history,
            context.as_ref(),
            dynamic_settings.direct_message_limit,
        )
    } else {
        full_history.to_vec()
    };
    let history = if recent_message_limit > 0 && history.len() > recent_message_limit {
        history[history.len() - recent_message_limit..].to_vec()
    } else {
        history
    };

    Ok(PreparedGeneration {
        history,
        system_prompt,
        retry,
    })
}

fn build_chat_system_prompt(
    database: &Connection,
    chat_id: &str,
    history: &[Message],
    response_language: Option<&str>,
) -> CommandResult<Option<String>> {
    let context = db::get_chat_prompt_context(database, chat_id)?;
    let prompt = prompt_builder::build_system_prompt(&context, history, response_language);
    Ok(prompt.map(|prompt| prompt_builder::resolve_assistant_placeholders(prompt, &context)))
}

fn append_prompt_section(base: &mut Option<String>, section: Option<String>) {
    let Some(section) = section
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
    else {
        return;
    };
    match base {
        Some(prompt) if !prompt.trim().is_empty() => {
            prompt.push_str("\n\n");
            prompt.push_str(&section);
        }
        _ => *base = Some(section),
    }
}

fn provider_secret_or_none(provider: &Provider) -> Option<String> {
    match provider_support::saved_secret(provider) {
        Ok(secret) => secret,
        Err(error) => {
            eprintln!(
                "AI auxiliary provider '{}' is unavailable: {}",
                provider.name, error
            );
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prompt_sections_are_trimmed_and_separated_consistently() {
        let mut prompt = Some("base".to_owned());
        append_prompt_section(&mut prompt, Some("  context  ".to_owned()));
        append_prompt_section(&mut prompt, Some("   ".to_owned()));

        assert_eq!(prompt.as_deref(), Some("base\n\ncontext"));
    }
}
