use std::collections::HashMap;
use std::future::Future;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use futures_util::future::{select, Either};
use rusqlite::Connection;
use tokio::sync::{oneshot, oneshot::error::TryRecvError};

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{
    CompletionResult, GenerationJob, GenerationStatus, Message, Provider, RetrySettings,
};
use crate::provider_client;

const PRE_CANCEL_TTL_SECONDS: i64 = 60;
const MAX_PRE_CANCELLED_GENERATIONS: usize = 64;
const MAX_GENERATION_ID_LENGTH: usize = 128;

enum GenerationControl {
    Active(oneshot::Sender<()>),
    Cancelling,
    PreCancelled { requested_at: i64 },
}

struct GenerationEntry {
    job: Option<GenerationJob>,
    control: GenerationControl,
}

pub(crate) struct GenerationLease<'state> {
    state: &'state AppState,
    generation_id: String,
}

impl Drop for GenerationLease<'_> {
    fn drop(&mut self) {
        self.state.finish_generation(&self.generation_id);
    }
}

pub(crate) struct AppState {
    pub(crate) database: Mutex<Connection>,
    generations: Mutex<HashMap<String, GenerationEntry>>,
}

impl AppState {
    pub(crate) fn new(database: Connection) -> Self {
        Self {
            database: Mutex::new(database),
            generations: Mutex::new(HashMap::new()),
        }
    }

    pub(crate) fn register_generation(
        &self,
        mut job: GenerationJob,
    ) -> CommandResult<(oneshot::Receiver<()>, GenerationLease<'_>)> {
        validate_generation_id(&job.id)?;
        let (sender, receiver) = oneshot::channel();
        let mut generations = self.generations.lock().map_err(CommandError::internal)?;
        prune_pre_cancelled(&mut generations);

        if generations
            .values()
            .filter_map(|entry| entry.job.as_ref())
            .any(|active| active.chat_id == job.chat_id)
        {
            return Err(CommandError::new(keys::GENERATION_CHAT_BUSY));
        }

        if generations
            .get(&job.id)
            .is_some_and(|entry| entry.job.is_some())
        {
            return Err(CommandError::new(keys::GENERATION_ID_IN_USE));
        }

        let generation_id = job.id.clone();
        job.status = GenerationStatus::Running;
        let pre_cancelled = generations
            .remove(&job.id)
            .is_some_and(|entry| matches!(entry.control, GenerationControl::PreCancelled { .. }));

        if pre_cancelled {
            job.status = GenerationStatus::Cancelling;
            drop(sender);
            generations.insert(
                job.id.clone(),
                GenerationEntry {
                    job: Some(job),
                    control: GenerationControl::Cancelling,
                },
            );
            let lease = GenerationLease {
                state: self,
                generation_id,
            };
            return Ok((receiver, lease));
        }

        generations.insert(
            job.id.clone(),
            GenerationEntry {
                job: Some(job),
                control: GenerationControl::Active(sender),
            },
        );
        let lease = GenerationLease {
            state: self,
            generation_id,
        };
        Ok((receiver, lease))
    }

    pub(crate) fn finish_generation(&self, generation_id: &str) {
        if let Ok(mut generations) = self.generations.lock() {
            generations.remove(generation_id);
        }
    }

    pub(crate) fn cancel_generation(&self, generation_id: String) -> CommandResult<bool> {
        validate_generation_id(&generation_id)?;
        let mut generations = self.generations.lock().map_err(CommandError::internal)?;
        prune_pre_cancelled(&mut generations);

        if let Some(entry) = generations.remove(&generation_id) {
            let job = entry.job.map(|mut job| {
                job.status = GenerationStatus::Cancelling;
                job
            });
            match entry.control {
                GenerationControl::Active(sender) => {
                    let signalled = sender.send(()).is_ok();
                    generations.insert(
                        generation_id,
                        GenerationEntry {
                            job,
                            control: GenerationControl::Cancelling,
                        },
                    );
                    return Ok(signalled);
                }
                GenerationControl::Cancelling | GenerationControl::PreCancelled { .. } => {
                    generations.insert(
                        generation_id,
                        GenerationEntry {
                            job,
                            control: GenerationControl::Cancelling,
                        },
                    );
                    return Ok(true);
                }
            }
        }

        if pre_cancelled_count(&generations) >= MAX_PRE_CANCELLED_GENERATIONS {
            return Ok(false);
        }
        generations.insert(
            generation_id,
            GenerationEntry {
                job: None,
                control: GenerationControl::PreCancelled {
                    requested_at: now_unix(),
                },
            },
        );
        Ok(true)
    }

    pub(crate) fn cancel_chat_generation(&self, chat_id: &str) -> CommandResult<usize> {
        let generation_ids = {
            let generations = self.generations.lock().map_err(CommandError::internal)?;
            generations
                .iter()
                .filter(|(_, entry)| entry.job.as_ref().is_some_and(|job| job.chat_id == chat_id))
                .map(|(id, _)| id.clone())
                .collect::<Vec<_>>()
        };

        let mut cancelled = 0;
        for generation_id in generation_ids {
            if self.cancel_generation(generation_id)? {
                cancelled += 1;
            }
        }
        Ok(cancelled)
    }

    pub(crate) fn generation_jobs(&self) -> CommandResult<Vec<GenerationJob>> {
        let mut jobs = self
            .generations
            .lock()
            .map_err(CommandError::internal)?
            .values()
            .filter_map(|entry| entry.job.clone())
            .collect::<Vec<_>>();
        jobs.sort_by(|left, right| {
            left.started_at
                .cmp(&right.started_at)
                .then_with(|| left.id.cmp(&right.id))
        });
        Ok(jobs)
    }

    pub(crate) fn has_active_generations(&self) -> CommandResult<bool> {
        let generations = self.generations.lock().map_err(CommandError::internal)?;
        Ok(generations.values().any(|entry| entry.job.is_some()))
    }
}

fn validate_generation_id(generation_id: &str) -> CommandResult<()> {
    if generation_id.trim().is_empty() || generation_id.len() > MAX_GENERATION_ID_LENGTH {
        return Err(CommandError::new(keys::GENERATION_ID_INVALID));
    }
    Ok(())
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn pre_cancelled_count(generations: &HashMap<String, GenerationEntry>) -> usize {
    generations
        .values()
        .filter(|entry| matches!(entry.control, GenerationControl::PreCancelled { .. }))
        .count()
}

fn prune_pre_cancelled(generations: &mut HashMap<String, GenerationEntry>) {
    let oldest_allowed = now_unix().saturating_sub(PRE_CANCEL_TTL_SECONDS);
    generations.retain(|_, entry| match entry.control {
        GenerationControl::PreCancelled { requested_at } => requested_at >= oldest_allowed,
        _ => true,
    });
}

pub(crate) async fn complete_cancellable(
    provider: &Provider,
    secret: Option<&str>,
    history: &[Message],
    system_prompt: Option<&str>,
    appended_user_message: Option<&str>,
    retry: &RetrySettings,
    mut cancellation: oneshot::Receiver<()>,
) -> CommandResult<CompletionResult> {
    match cancellation.try_recv() {
        Ok(()) | Err(TryRecvError::Closed) => {
            return Err(CommandError::new(keys::PROVIDER_REQUEST_CANCELLED));
        }
        Err(TryRecvError::Empty) => {}
    }

    let completion = Box::pin(provider_client::complete(
        provider,
        secret,
        history,
        system_prompt,
        appended_user_message,
        retry,
    ));
    let cancellation = Box::pin(cancellation);
    match select(completion, cancellation).await {
        Either::Left((result, _)) => result,
        Either::Right((_, _)) => Err(CommandError::new(keys::PROVIDER_REQUEST_CANCELLED)),
    }
}

pub(crate) async fn await_cancellable<T, F>(
    operation: F,
    cancellation: oneshot::Receiver<()>,
) -> CommandResult<(T, oneshot::Receiver<()>)>
where
    F: Future<Output = CommandResult<T>>,
{
    let operation = Box::pin(operation);
    let cancellation = Box::pin(cancellation);
    match select(operation, cancellation).await {
        Either::Left((result, cancellation)) => {
            Ok((result?, *std::pin::Pin::into_inner(cancellation)))
        }
        Either::Right((_, _)) => Err(CommandError::new(keys::PROVIDER_REQUEST_CANCELLED)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::GenerationMode;

    fn state() -> AppState {
        AppState::new(Connection::open_in_memory().expect("in-memory database"))
    }

    fn job(id: &str, chat_id: &str) -> GenerationJob {
        GenerationJob::new(
            id.into(),
            chat_id.into(),
            format!("message-{id}"),
            GenerationMode::Send,
        )
    }

    #[test]
    fn cancellation_requested_before_registration_is_not_lost() {
        let state = state();
        assert!(state
            .cancel_generation("generation".into())
            .expect("cancel request"));

        let (mut receiver, _lease) = state
            .register_generation(job("generation", "chat"))
            .expect("register generation");
        assert!(matches!(
            receiver.try_recv(),
            Ok(()) | Err(TryRecvError::Closed)
        ));
        assert_eq!(
            state.generation_jobs().expect("jobs")[0].status,
            GenerationStatus::Cancelling
        );
    }

    #[test]
    fn different_chats_can_generate_while_each_chat_stays_single_flight() {
        let state = state();
        let (_first, _first_lease) = state
            .register_generation(job("first", "chat-a"))
            .expect("first chat");
        let (_second, _second_lease) = state
            .register_generation(job("second", "chat-b"))
            .expect("second chat");

        let error = match state.register_generation(job("duplicate", "chat-a")) {
            Ok(_) => panic!("same chat must stay single-flight"),
            Err(error) => error,
        };
        assert_eq!(error.key, keys::GENERATION_CHAT_BUSY);
        assert_eq!(state.generation_jobs().expect("jobs").len(), 2);
    }

    #[test]
    fn cancelling_one_chat_does_not_touch_another_chat() {
        let state = state();
        let (mut first, _first_lease) = state
            .register_generation(job("first", "chat-a"))
            .expect("first chat");
        let (mut second, _second_lease) = state
            .register_generation(job("second", "chat-b"))
            .expect("second chat");

        assert_eq!(
            state.cancel_chat_generation("chat-a").expect("cancel chat"),
            1
        );
        assert!(matches!(
            first.try_recv(),
            Ok(()) | Err(TryRecvError::Closed)
        ));
        assert!(matches!(second.try_recv(), Err(TryRecvError::Empty)));
        let jobs = state.generation_jobs().expect("jobs");
        assert_eq!(jobs[0].status, GenerationStatus::Cancelling);
        assert_eq!(jobs[1].status, GenerationStatus::Running);
    }
}
