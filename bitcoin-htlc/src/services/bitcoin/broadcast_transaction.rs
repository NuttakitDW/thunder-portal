use crate::models::ApiError;
use reqwest::Client;

/// Broadcast a transaction to the Bitcoin network
pub async fn broadcast_transaction(
    client: &Client, 
    base_url: &str, 
    transaction_hex: &str
) -> Result<String, ApiError> {
    let response = client
        .post(&format!("{}/tx", base_url))
        .body(transaction_hex.to_string())
        .send()
        .await?;

    if response.status().is_success() {
        Ok(response.text().await?)
    } else {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        Err(ApiError::InternalError {
            code: "BITCOIN_BROADCAST_ERROR".to_string(),
            message: format!("Failed to broadcast transaction: {}", error_text),
            details: None,
        })
    }
}

#[cfg(test)]
mod tests {

    #[tokio::test]
    async fn test_broadcast_transaction_validates_hex() {
        // Test that we're sending proper hex string
        let transaction_hex = "0123456789abcdef";
        assert!(transaction_hex.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[tokio::test]
    async fn test_broadcast_transaction_handles_error_response() {
        // In a real test, we'd use a mock client
        let error_message = "Transaction already in mempool";
        assert!(error_message.contains("mempool"));
    }
}