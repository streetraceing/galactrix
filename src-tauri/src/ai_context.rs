use std::collections::HashMap;

use crate::dynamic_context;
use crate::i18n::{CommandError, CommandResult};
use crate::models::{
    CompletionResult, DynamicContextSettings, DynamicContextState, Message, Provider,
    RetrySettings, SemanticMemoryCandidate,
};
use crate::provider_client;

pub struct AnalysisOutcome {
    pub state: DynamicContextState,
    pub usage: Option<CompletionResult>,
    pub warning: Option<CommandError>,
}

pub async fn analyze_dialogue(
    settings: &DynamicContextSettings,
    previous: Option<&DynamicContextState>,
    batch: &[Message],
    provider: Option<&Provider>,
    api_key: Option<&str>,
    retry: &RetrySettings,
) -> AnalysisOutcome {
    let local = dynamic_context::local_analysis(previous, batch);
    if settings.mode == "local" || provider.is_none() {
        return AnalysisOutcome {
            state: local,
            usage: None,
            warning: None,
        };
    }

    let provider = provider.expect("provider checked above");
    let mut analysis_provider = provider.clone();
    analysis_provider.temperature = 0.1;
    analysis_provider.top_p = 0.3;
    analysis_provider.max_tokens = analysis_provider.max_tokens.clamp(512, 2_048);

    let prompt = dynamic_context::analysis_system_prompt(&settings.analysis_prompt);
    let request = dynamic_context::analysis_user_prompt(
        previous,
        batch,
        (settings.mode == "hybrid").then_some(&local),
    );
    match provider_client::complete(
        &analysis_provider,
        api_key,
        &[],
        Some(&prompt),
        Some(&request),
        retry,
    )
    .await
    {
        Ok(completion) => {
            let covered = batch.last().map(|message| message.id.clone());
            let state = dynamic_context::parse_analysis_response(&completion.content, covered)
                .unwrap_or_else(|| local.clone());
            AnalysisOutcome {
                state,
                usage: Some(completion),
                warning: None,
            }
        }
        Err(error) => AnalysisOutcome {
            state: local,
            usage: None,
            warning: Some(error),
        },
    }
}

pub async fn embed_missing_candidates(
    provider: &Provider,
    api_key: Option<&str>,
    retry: &RetrySettings,
    candidates: &[SemanticMemoryCandidate],
    indexed: &HashMap<(String, String), String>,
    batch_size: usize,
) -> CommandResult<Vec<(SemanticMemoryCandidate, Vec<f32>)>> {
    let missing = candidates
        .iter()
        .filter(|candidate| {
            indexed.get(&(candidate.source_kind.clone(), candidate.source_id.clone()))
                != Some(&candidate.content)
        })
        .cloned()
        .collect::<Vec<_>>();
    let mut embedded = Vec::with_capacity(missing.len());
    for batch in missing.chunks(batch_size.clamp(1, 64)) {
        let inputs = batch
            .iter()
            .map(|candidate| candidate.content.clone())
            .collect::<Vec<_>>();
        let result = provider_client::embed(provider, api_key, &inputs, retry).await?;
        embedded.extend(batch.iter().cloned().zip(result.embeddings));
    }
    Ok(embedded)
}
