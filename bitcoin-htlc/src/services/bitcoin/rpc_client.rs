use crate::models::ApiError;
use reqwest::Client;
use serde_json::{json, Value};
use base64::{Engine as _, engine::general_purpose};

/// Bitcoin RPC client for connecting to local regtest node
#[derive(Debug, Clone)]
pub struct BitcoinRpcClient {
    pub rpc_url: String,
    pub username: String,
    pub password: String,
    pub client: Client,
}

impl BitcoinRpcClient {
    pub fn new() -> Self {
        Self {
            rpc_url: std::env::var("BITCOIN_RPC_URL")
                .unwrap_or_else(|_| "http://localhost:18443".to_string()),
            username: std::env::var("BITCOIN_RPC_USER")
                .unwrap_or_else(|_| "thunderportal".to_string()),
            password: std::env::var("BITCOIN_RPC_PASSWORD")
                .unwrap_or_else(|_| "thunderportal123".to_string()),
            client: Client::new(),
        }
    }

    /// Make an RPC call to the Bitcoin node
    pub async fn rpc_call(&self, method: &str, params: Vec<Value>) -> Result<Value, ApiError> {
        let auth = general_purpose::STANDARD.encode(format!("{}:{}", self.username, self.password));
        
        let request_body = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        });

        let response = self.client
            .post(&self.rpc_url)
            .header("Authorization", format!("Basic {}", auth))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(ApiError::InternalError {
                code: "RPC_ERROR".to_string(),
                message: format!("RPC call failed with status: {}", response.status()),
                details: None,
            });
        }

        let response_json: Value = response.json().await?;
        
        if let Some(error) = response_json.get("error") {
            if !error.is_null() {
                return Err(ApiError::InternalError {
                    code: "RPC_ERROR".to_string(),
                    message: format!("RPC error: {}", error),
                    details: None,
                });
            }
        }

        response_json.get("result")
            .cloned()
            .ok_or_else(|| ApiError::InternalError {
                code: "RPC_NO_RESULT".to_string(),
                message: "No result in RPC response".to_string(),
                details: None,
            })
    }

    /// Get the current block height
    pub async fn get_block_count(&self) -> Result<u32, ApiError> {
        let result = self.rpc_call("getblockcount", vec![]).await?;
        result.as_u64()
            .map(|n| n as u32)
            .ok_or_else(|| ApiError::InternalError {
                code: "INVALID_BLOCK_COUNT".to_string(),
                message: "Invalid block count format".to_string(),
                details: None,
            })
    }

    /// Broadcast a raw transaction
    pub async fn send_raw_transaction(&self, tx_hex: &str) -> Result<String, ApiError> {
        let params = vec![json!(tx_hex)];
        let result = self.rpc_call("sendrawtransaction", params).await?;
        
        result.as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| ApiError::InternalError {
                code: "INVALID_TXID".to_string(),
                message: "Invalid transaction ID format".to_string(),
                details: None,
            })
    }

    /// Get raw transaction data
    pub async fn get_raw_transaction(&self, txid: &str, verbose: bool) -> Result<Value, ApiError> {
        let params = vec![json!(txid), json!(verbose)];
        self.rpc_call("getrawtransaction", params).await
    }

    /// Get transaction info
    pub async fn get_transaction(&self, txid: &str) -> Result<Value, ApiError> {
        let params = vec![json!(txid)];
        self.rpc_call("gettransaction", params).await
    }

    /// List unspent transaction outputs for an address
    pub async fn list_unspent(&self, min_conf: u32, max_conf: Option<u32>, addresses: Option<Vec<String>>) -> Result<Value, ApiError> {
        let mut params = vec![json!(min_conf)];
        
        if let Some(max) = max_conf {
            params.push(json!(max));
        } else {
            params.push(json!(9999999));
        }

        if let Some(addrs) = addresses {
            params.push(json!(addrs));
        }

        self.rpc_call("listunspent", params).await
    }

    /// Get new address
    pub async fn get_new_address(&self, label: Option<&str>) -> Result<String, ApiError> {
        let params = if let Some(l) = label {
            vec![json!(l)]
        } else {
            vec![]
        };
        
        let result = self.rpc_call("getnewaddress", params).await?;
        result.as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| ApiError::InternalError {
                code: "INVALID_ADDRESS".to_string(),
                message: "Invalid address format".to_string(),
                details: None,
            })
    }

    /// Generate blocks (regtest only)
    pub async fn generate_to_address(&self, blocks: u32, address: &str) -> Result<Vec<String>, ApiError> {
        let params = vec![json!(blocks), json!(address)];
        let result = self.rpc_call("generatetoaddress", params).await?;
        
        result.as_array()
            .ok_or_else(|| ApiError::InternalError {
                code: "INVALID_BLOCK_HASHES".to_string(),
                message: "Invalid block hashes format".to_string(),
                details: None,
            })?
            .iter()
            .map(|v| v.as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| ApiError::InternalError {
                    code: "INVALID_BLOCK_HASH".to_string(),
                    message: "Invalid block hash format".to_string(),
                    details: None,
                })
            )
            .collect()
    }

    /// Get wallet balance
    pub async fn get_balance(&self) -> Result<f64, ApiError> {
        let result = self.rpc_call("getbalance", vec![]).await?;
        result.as_f64()
            .ok_or_else(|| ApiError::InternalError {
                code: "INVALID_BALANCE".to_string(),
                message: "Invalid balance format".to_string(),
                details: None,
            })
    }

    /// Estimate smart fee
    pub async fn estimate_smart_fee(&self, conf_target: u32) -> Result<Value, ApiError> {
        let params = vec![json!(conf_target)];
        self.rpc_call("estimatesmartfee", params).await
    }

    /// Get blockchain info
    pub async fn get_blockchain_info(&self) -> Result<Value, ApiError> {
        self.rpc_call("getblockchaininfo", vec![]).await
    }

    /// Create raw transaction
    pub async fn create_raw_transaction(&self, inputs: Value, outputs: Value) -> Result<String, ApiError> {
        let params = vec![inputs, outputs];
        let result = self.rpc_call("createrawtransaction", params).await?;
        
        result.as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| ApiError::InternalError {
                code: "INVALID_RAW_TX".to_string(),
                message: "Invalid raw transaction format".to_string(),
                details: None,
            })
    }

    /// Sign raw transaction with wallet
    pub async fn sign_raw_transaction_with_wallet(&self, tx_hex: &str) -> Result<Value, ApiError> {
        let params = vec![json!(tx_hex)];
        self.rpc_call("signrawtransactionwithwallet", params).await
    }
}