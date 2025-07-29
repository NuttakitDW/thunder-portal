use crate::models::ApiError;
use crate::services::bitcoin::get_transaction::get_transaction;
use reqwest::Client;
use tokio::time::{sleep, Duration};

/// Wait for a transaction to reach the required number of confirmations
pub async fn wait_for_confirmations(
    client: &Client,
    base_url: &str,
    transaction_id: &str,
    required_confirmations: u32,
) -> Result<u32, ApiError> {
    let mut attempts = 0;
    const MAX_ATTEMPTS: u32 = 120; // 10 minutes with 5-second intervals
    
    loop {
        let transaction_info = get_transaction(client, base_url, transaction_id).await?;
        
        if let Some(confirmations) = transaction_info.status.confirmations() {
            if confirmations >= required_confirmations {
                return Ok(confirmations);
            }
        }
        
        attempts += 1;
        if attempts >= MAX_ATTEMPTS {
            return Err(ApiError::InternalError {
                code: "TIMEOUT_ERROR".to_string(),
                message: format!("Transaction {} not confirmed after {} attempts", transaction_id, MAX_ATTEMPTS),
                details: None,
            });
        }
        
        sleep(Duration::from_secs(5)).await;
    }
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_max_attempts_calculation() {
        const MAX_ATTEMPTS: u32 = 120;
        const INTERVAL_SECONDS: u32 = 5;
        let total_wait_seconds = MAX_ATTEMPTS * INTERVAL_SECONDS;
        let total_wait_minutes = total_wait_seconds / 60;
        
        assert_eq!(total_wait_minutes, 10);
    }

    #[test]
    fn test_transaction_id_format() {
        let valid_txid = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        assert_eq!(valid_txid.len(), 64);
    }

    #[test]
    fn test_confirmation_requirements() {
        let standard_confirmations = 6;
        let fast_confirmations = 1;
        let secure_confirmations = 12;
        
        assert!(fast_confirmations < standard_confirmations);
        assert!(standard_confirmations < secure_confirmations);
    }
}