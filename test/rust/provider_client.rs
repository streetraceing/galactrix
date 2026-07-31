use super::{exponential_delay, is_retryable_status};

#[test]
fn exponential_backoff_doubles_and_respects_the_cap() {
    assert_eq!(exponential_delay(750, 8_000, 1).as_millis(), 750);
    assert_eq!(exponential_delay(750, 8_000, 2).as_millis(), 1_500);
    assert_eq!(exponential_delay(750, 8_000, 3).as_millis(), 3_000);
    assert_eq!(exponential_delay(750, 8_000, 6).as_millis(), 8_000);
}

#[test]
fn only_temporary_http_failures_are_retried() {
    for status in [408, 409, 425, 429, 500, 502, 503, 599] {
        assert!(is_retryable_status(status), "{status} should retry");
    }
    for status in [400, 401, 403, 404, 422, 600] {
        assert!(!is_retryable_status(status), "{status} should not retry");
    }
}
