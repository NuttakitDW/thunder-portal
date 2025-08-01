pub mod get_block_height;
pub mod broadcast_transaction;
pub mod get_transaction;
pub mod get_utxos;
pub mod get_fee_estimates;
pub mod wait_for_confirmations;
pub mod rpc_client;

// Re-export functions for easy access
pub use get_block_height::get_block_height;
pub use broadcast_transaction::broadcast_transaction;
pub use get_transaction::{get_transaction, TransactionInfo, TransactionStatus, TransactionInput, TransactionOutput};
pub use get_utxos::{get_utxos, Utxo, UtxoStatus};
pub use get_fee_estimates::{get_fee_estimates, FeeEstimates};
pub use wait_for_confirmations::wait_for_confirmations;
pub use rpc_client::BitcoinRpcClient;

// Re-export the BitcoinClient for backward compatibility
use reqwest::Client;

#[derive(Debug, Clone)]
pub struct BitcoinClient {
    pub base_url: String,
    pub client: Client,
    pub rpc_client: Option<BitcoinRpcClient>,
}

impl BitcoinClient {
    pub fn new() -> Self {
        // Check if we should use RPC client (local regtest) or API client (external)
        let use_rpc = std::env::var("BITCOIN_NETWORK").unwrap_or_default() == "regtest" ||
                      std::env::var("BITCOIN_RPC_URL").is_ok();
        
        Self {
            base_url: std::env::var("BITCOIN_API_URL")
                .unwrap_or_else(|_| "https://blockstream.info/testnet/api".to_string()),
            client: Client::new(),
            rpc_client: if use_rpc { Some(BitcoinRpcClient::new()) } else { None },
        }
    }

    pub async fn get_block_height(&self) -> Result<u32, crate::models::ApiError> {
        if let Some(ref rpc) = self.rpc_client {
            rpc.get_block_count().await
        } else {
            get_block_height(&self.client, &self.base_url).await
        }
    }

    pub async fn broadcast_transaction(&self, tx_hex: &str) -> Result<String, crate::models::ApiError> {
        if let Some(ref rpc) = self.rpc_client {
            rpc.send_raw_transaction(tx_hex).await
        } else {
            broadcast_transaction(&self.client, &self.base_url, tx_hex).await
        }
    }

    pub async fn get_transaction(&self, txid: &str) -> Result<TransactionInfo, crate::models::ApiError> {
        if let Some(ref rpc) = self.rpc_client {
            // Convert RPC response to TransactionInfo
            let tx_data = rpc.get_raw_transaction(txid, true).await?;
            
            // Parse the RPC response to create TransactionInfo
            let confirmations = tx_data.get("confirmations")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as u32;
            
            let status = TransactionStatus {
                confirmed: confirmations > 0,
                block_height: tx_data.get("blockheight")
                    .and_then(|v| v.as_u64())
                    .map(|h| h as u32),
                block_time: tx_data.get("blocktime")
                    .and_then(|v| v.as_u64()),
            };

            Ok(TransactionInfo {
                txid: txid.to_string(),
                status,
                fee: tx_data.get("fee")
                    .and_then(|v| v.as_f64())
                    .map(|f| (f * 100_000_000.0) as u64)
                    .unwrap_or(0), // Convert to satoshis
                vin: vec![], // TODO: parse inputs from tx_data
                vout: vec![], // TODO: parse outputs from tx_data
            })
        } else {
            get_transaction(&self.client, &self.base_url, txid).await
        }
    }

    pub async fn get_utxos(&self, address: &str) -> Result<Vec<Utxo>, crate::models::ApiError> {
        if let Some(ref rpc) = self.rpc_client {
            // Use RPC to get UTXOs
            let result = rpc.list_unspent(0, None, Some(vec![address.to_string()])).await?;
            
            let utxos = result.as_array()
                .ok_or_else(|| crate::models::ApiError::InternalError {
                    code: "INVALID_UTXOS".to_string(),
                    message: "Invalid UTXOs format".to_string(),
                    details: None,
                })?
                .iter()
                .filter_map(|utxo| {
                    Some(Utxo {
                        txid: utxo.get("txid")?.as_str()?.to_string(),
                        vout: utxo.get("vout")?.as_u64()? as u32,
                        value: (utxo.get("amount")?.as_f64()? * 100_000_000.0) as u64, // Convert to satoshis
                        status: UtxoStatus {
                            confirmed: utxo.get("confirmations").and_then(|c| c.as_u64()).unwrap_or(0) > 0,
                            block_height: None,
                            block_time: None,
                        },
                    })
                })
                .collect();

            Ok(utxos)
        } else {
            get_utxos(&self.client, &self.base_url, address).await
        }
    }

    pub async fn get_fee_estimates(&self) -> Result<FeeEstimates, crate::models::ApiError> {
        if let Some(ref rpc) = self.rpc_client {
            // Use RPC to estimate fees
            let fast = rpc.estimate_smart_fee(1).await
                .and_then(|v| Ok(v.get("feerate")
                    .and_then(|f| f.as_f64())
                    .map(|rate| (rate * 100_000_000.0) as u64) // Convert to sat/byte
                    .unwrap_or(10))) // Default fallback
                .unwrap_or(10);
            
            let medium = rpc.estimate_smart_fee(6).await
                .and_then(|v| Ok(v.get("feerate")
                    .and_then(|f| f.as_f64())
                    .map(|rate| (rate * 100_000_000.0) as u64)
                    .unwrap_or(5)))
                .unwrap_or(5);

            let slow = rpc.estimate_smart_fee(144).await
                .and_then(|v| Ok(v.get("feerate")
                    .and_then(|f| f.as_f64())
                    .map(|rate| (rate * 100_000_000.0) as u64)
                    .unwrap_or(1)))
                .unwrap_or(1);

            Ok(FeeEstimates {
                fastest: fast as u32,
                half_hour: medium as u32,
                hour: medium as u32,
                economy: slow as u32,
            })
        } else {
            get_fee_estimates().await
        }
    }

    pub async fn wait_for_confirmations(
        &self,
        txid: &str,
        required_confirmations: u32,
    ) -> Result<u32, crate::models::ApiError> {
        if let Some(ref rpc) = self.rpc_client {
            // Custom implementation for RPC client
            use tokio::time::{sleep, Duration};
            
            for _ in 0..60 { // Try for up to 5 minutes
                match rpc.get_raw_transaction(txid, true).await {
                    Ok(tx_data) => {
                        let confirmations = tx_data.get("confirmations")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(0) as u32;
                        
                        if confirmations >= required_confirmations {
                            return Ok(confirmations);
                        }
                    }
                    Err(_) => {
                        // Transaction not found yet, keep waiting
                    }
                }
                
                sleep(Duration::from_secs(5)).await;
            }
            
            Err(crate::models::ApiError::InternalError {
                code: "CONFIRMATION_TIMEOUT".to_string(),
                message: "Timeout waiting for confirmations".to_string(),
                details: None,
            })
        } else {
            wait_for_confirmations(&self.client, &self.base_url, txid, required_confirmations).await
        }
    }

    // Additional RPC-specific methods
    pub async fn generate_blocks(&self, blocks: u32, address: &str) -> Result<Vec<String>, crate::models::ApiError> {
        if let Some(ref rpc) = self.rpc_client {
            rpc.generate_to_address(blocks, address).await
        } else {
            Err(crate::models::ApiError::InternalError {
                code: "RPC_ONLY_METHOD".to_string(),
                message: "Block generation only available with RPC client".to_string(),
                details: None,
            })
        }
    }

    pub async fn get_balance(&self) -> Result<f64, crate::models::ApiError> {
        if let Some(ref rpc) = self.rpc_client {
            rpc.get_balance().await
        } else {
            Err(crate::models::ApiError::InternalError {
                code: "RPC_ONLY_METHOD".to_string(),
                message: "Balance check only available with RPC client".to_string(),
                details: None,
            })
        }
    }

    pub async fn get_new_address(&self, label: Option<&str>) -> Result<String, crate::models::ApiError> {
        if let Some(ref rpc) = self.rpc_client {
            rpc.get_new_address(label).await
        } else {
            Err(crate::models::ApiError::InternalError {
                code: "RPC_ONLY_METHOD".to_string(),
                message: "Address generation only available with RPC client".to_string(),
                details: None,
            })
        }
    }
}