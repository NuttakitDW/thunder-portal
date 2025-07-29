pub mod get_block_height;
pub mod broadcast_transaction;
pub mod get_transaction;
pub mod get_utxos;
pub mod get_fee_estimates;
pub mod wait_for_confirmations;

// Re-export functions for easy access
pub use get_block_height::get_block_height;
pub use broadcast_transaction::broadcast_transaction;
pub use get_transaction::{get_transaction, TransactionInfo, TransactionStatus};
pub use get_utxos::{get_utxos, Utxo};
pub use get_fee_estimates::{get_fee_estimates, FeeEstimates};
pub use wait_for_confirmations::wait_for_confirmations;

// Re-export the BitcoinClient for backward compatibility
use reqwest::Client;

#[derive(Debug, Clone)]
pub struct BitcoinClient {
    pub base_url: String,
    pub client: Client,
}

impl BitcoinClient {
    pub fn new() -> Self {
        Self {
            base_url: std::env::var("BITCOIN_API_URL")
                .unwrap_or_else(|_| "https://blockstream.info/testnet/api".to_string()),
            client: Client::new(),
        }
    }

    pub async fn get_block_height(&self) -> Result<u32, crate::models::ApiError> {
        get_block_height(&self.client, &self.base_url).await
    }

    pub async fn broadcast_transaction(&self, tx_hex: &str) -> Result<String, crate::models::ApiError> {
        broadcast_transaction(&self.client, &self.base_url, tx_hex).await
    }

    pub async fn get_transaction(&self, txid: &str) -> Result<TransactionInfo, crate::models::ApiError> {
        get_transaction(&self.client, &self.base_url, txid).await
    }

    pub async fn get_utxos(&self, address: &str) -> Result<Vec<Utxo>, crate::models::ApiError> {
        get_utxos(&self.client, &self.base_url, address).await
    }

    pub async fn get_fee_estimates(&self) -> Result<FeeEstimates, crate::models::ApiError> {
        get_fee_estimates().await
    }

    pub async fn wait_for_confirmations(
        &self,
        txid: &str,
        required_confirmations: u32,
    ) -> Result<u32, crate::models::ApiError> {
        wait_for_confirmations(&self.client, &self.base_url, txid, required_confirmations).await
    }
}