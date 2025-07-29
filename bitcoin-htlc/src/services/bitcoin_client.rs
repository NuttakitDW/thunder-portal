use crate::models::ApiError;
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct BitcoinClient {
    base_url: String,
    client: reqwest::Client,
}

impl BitcoinClient {
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    pub async fn get_block_height(&self) -> Result<u32, ApiError> {
        let response = self.client
            .get(&format!("{}/blocks/tip/height", self.base_url))
            .send()
            .await?
            .text()
            .await?;

        response.parse()
            .map_err(|e| ApiError::BitcoinError(format!("Failed to parse block height: {}", e)))
    }

    pub async fn broadcast_transaction(&self, tx_hex: &str) -> Result<String, ApiError> {
        let response = self.client
            .post(&format!("{}/tx", self.base_url))
            .body(tx_hex.to_string())
            .send()
            .await?;

        if response.status().is_success() {
            Ok(response.text().await?)
        } else {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(ApiError::BitcoinError(format!("Failed to broadcast transaction: {}", error_text)))
        }
    }

    pub async fn get_transaction(&self, txid: &str) -> Result<TransactionInfo, ApiError> {
        let response = self.client
            .get(&format!("{}/tx/{}", self.base_url, txid))
            .send()
            .await?
            .json()
            .await?;

        Ok(response)
    }

    pub async fn get_utxos(&self, address: &str) -> Result<Vec<Utxo>, ApiError> {
        let response = self.client
            .get(&format!("{}/address/{}/utxo", self.base_url, address))
            .send()
            .await?
            .json()
            .await?;

        Ok(response)
    }

    pub async fn get_fee_estimates(&self) -> Result<FeeEstimates, ApiError> {
        // For Blockstream API, we'll use a fixed fee rate for testnet
        // In production, you'd want to use a proper fee estimation service
        Ok(FeeEstimates {
            fastest: 5,
            half_hour: 3,
            hour: 2,
            economy: 1,
        })
    }

    pub async fn wait_for_confirmations(
        &self,
        txid: &str,
        required_confirmations: u32,
    ) -> Result<u32, ApiError> {
        use tokio::time::{sleep, Duration};
        
        let mut attempts = 0;
        const MAX_ATTEMPTS: u32 = 120; // 10 minutes with 5-second intervals
        
        loop {
            let tx_info = self.get_transaction(txid).await?;
            
            if let Some(confirmations) = tx_info.status.confirmations() {
                if confirmations >= required_confirmations {
                    return Ok(confirmations);
                }
            }
            
            attempts += 1;
            if attempts >= MAX_ATTEMPTS {
                return Err(ApiError::TimeoutError(
                    format!("Transaction {} not confirmed after {} attempts", txid, MAX_ATTEMPTS)
                ));
            }
            
            sleep(Duration::from_secs(5)).await;
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TransactionInfo {
    pub txid: String,
    pub status: TransactionStatus,
    pub fee: u64,
    pub vin: Vec<Vin>,
    pub vout: Vec<Vout>,
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
pub struct Vin {
    pub txid: String,
    pub vout: u32,
    pub prevout: Option<Prevout>,
    pub scriptsig: String,
    pub witness: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Prevout {
    pub scriptpubkey: String,
    pub scriptpubkey_address: Option<String>,
    pub value: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Vout {
    pub scriptpubkey: String,
    pub scriptpubkey_address: Option<String>,
    pub value: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Utxo {
    pub txid: String,
    pub vout: u32,
    pub value: u64,
    pub status: TransactionStatus,
}

#[derive(Debug, Serialize)]
pub struct FeeEstimates {
    pub fastest: u32,
    pub half_hour: u32,
    pub hour: u32,
    pub economy: u32,
}