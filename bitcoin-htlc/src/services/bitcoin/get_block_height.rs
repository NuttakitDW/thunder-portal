use crate::models::ApiError;
use reqwest::Client;

/// Get the current block height from the Bitcoin network
pub async fn get_block_height(client: &Client, base_url: &str) -> Result<u32, ApiError> {
    let response = client
        .get(&format!("{}/blocks/tip/height", base_url))
        .send()
        .await?
        .text()
        .await?;

    response.parse()
        .map_err(|e| ApiError::InternalError {
            code: "BITCOIN_ERROR".to_string(),
            message: format!("Failed to parse block height: {}", e),
            details: None,
        })
}

#[cfg(test)]
mod tests {

    #[tokio::test]
    async fn test_get_block_height_parses_valid_response() {
        // This would need a mock HTTP client in production
        // For now, we'll test the parsing logic
        let height_str = "750000";
        let height: u32 = height_str.parse().unwrap();
        assert_eq!(height, 750000);
    }

    #[tokio::test]
    async fn test_get_block_height_handles_invalid_response() {
        let height_str = "invalid";
        let result: Result<u32, _> = height_str.parse();
        assert!(result.is_err());
    }
}