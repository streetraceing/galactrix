use std::collections::HashMap;
use std::sync::Mutex;

use futures_util::future::{select, Either};
use rusqlite::Connection;
use tokio::sync::{oneshot, oneshot::error::TryRecvError};

use crate::i18n::{keys, CommandError, CommandResult};
use crate::models::{CompletionResult, Message, Provider, RetrySettings};
use crate::provider_client;

enum GenerationControl {
    Active(oneshot::Sender<()>),
    Cancelled,
}

pub(crate) struct AppState {
    pub(crate) database: Mutex<Connection>,
    generations: Mutex<HashMap<String, GenerationControl>>,
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
        generation_id: &str,
    ) -> CommandResult<oneshot::Receiver<()>> {
        let (sender, receiver) = oneshot::channel();
        let mut generations = self.generations.lock().map_err(CommandError::internal)?;

        match generations.remove(generation_id) {
            Some(GenerationControl::Active(previous)) => {
                let _ = previous.send(());
            }
            Some(GenerationControl::Cancelled) => {
                drop(sender);
                return Ok(receiver);
            }
            None => {}
        }

        generations.insert(generation_id.to_owned(), GenerationControl::Active(sender));
        Ok(receiver)
    }

    pub(crate) fn finish_generation(&self, generation_id: &str) {
        if let Ok(mut generations) = self.generations.lock() {
            generations.remove(generation_id);
        }
    }

    pub(crate) fn cancel_generation(&self, generation_id: String) -> CommandResult<bool> {
        let mut generations = self.generations.lock().map_err(CommandError::internal)?;
        match generations.remove(&generation_id) {
            Some(GenerationControl::Active(sender)) => Ok(sender.send(()).is_ok()),
            Some(GenerationControl::Cancelled) => {
                generations.insert(generation_id, GenerationControl::Cancelled);
                Ok(true)
            }
            None => {
                generations.insert(generation_id, GenerationControl::Cancelled);
                Ok(true)
            }
        }
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    fn state() -> AppState {
        AppState::new(Connection::open_in_memory().expect("in-memory database"))
    }

    #[test]
    fn cancellation_requested_before_registration_is_not_lost() {
        let state = state();
        assert!(state
            .cancel_generation("generation".into())
            .expect("cancel request"));

        let mut receiver = state
            .register_generation("generation")
            .expect("register generation");
        assert!(matches!(
            receiver.try_recv(),
            Ok(()) | Err(TryRecvError::Closed)
        ));
    }

    #[test]
    fn replacing_an_active_generation_cancels_the_previous_receiver() {
        let state = state();
        let mut previous = state
            .register_generation("generation")
            .expect("register first generation");
        let _current = state
            .register_generation("generation")
            .expect("replace generation");

        assert!(matches!(
            previous.try_recv(),
            Ok(()) | Err(TryRecvError::Closed)
        ));
    }
}
