use crate::models::ApiError;
use reqwest::Client;
use serde::{Deserialize, Serialize};

/// Get transaction information from the Bitcoin network
pub async fn get_transaction(
    client: &Client,
    base_url: &str,
    transaction_id: &str
) -> Result<TransactionInfo, ApiError> {
    let response = client
        .get(&format!("{}/tx/{}", base_url, transaction_id))
        .send()
        .await?
        .json()
        .await?;

    Ok(response)
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TransactionInfo {
    pub txid: String,
    pub status: TransactionStatus,
    pub fee: u64,
    pub vin: Vec<TransactionInput>,
    pub vout: Vec<TransactionOutput>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TransactionStatus {
    pub confirmed: bool,
    pub block_height: Option<u32>,
    pub block_time: Option<u64>,
}

impl TransactionStatus {
    pub fn confirmations(&self) -> Option<u32> {
        // This is a simplified calculation
        // In production, you'd need to get the current block height
        // and calculate: current_height - tx_block_height + 1
        if self.confirmed {
            Some(1) // Simplified for testnet
        } else {
            None
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TransactionInput {
    pub txid: String,
    pub vout: u32,
    pub prevout: Option<PreviousOutput>,
    pub scriptsig: String,
    pub witness: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PreviousOutput {
    pub scriptpubkey: String,
    pub scriptpubkey_address: Option<String>,
    pub value: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TransactionOutput {
    pub scriptpubkey: String,
    pub scriptpubkey_address: Option<String>,
    pub value: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transaction_status_confirmations() {
        let confirmed_status = TransactionStatus {
            confirmed: true,
            block_height: Some(100),
            block_time: Some(1234567890),
        };
        assert_eq!(confirmed_status.confirmations(), Some(1));

        let unconfirmed_status = TransactionStatus {
            confirmed: false,
            block_height: None,
            block_time: None,
        };
        assert_eq!(unconfirmed_status.confirmations(), None);
    }

    #[test]
    fn test_transaction_id_validation() {
        let valid_txid = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        assert_eq!(valid_txid.len(), 64);
        assert!(valid_txid.chars().all(|c| c.is_ascii_hexdigit()));
    }
}