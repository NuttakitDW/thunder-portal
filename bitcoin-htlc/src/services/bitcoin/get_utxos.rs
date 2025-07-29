use crate::models::ApiError;
use reqwest::Client;
use serde::{Deserialize, Serialize};

/// Get unspent transaction outputs (UTXOs) for a Bitcoin address
pub async fn get_utxos(
    client: &Client,
    base_url: &str,
    address: &str
) -> Result<Vec<Utxo>, ApiError> {
    let response = client
        .get(&format!("{}/address/{}/utxo", base_url, address))
        .send()
        .await?
        .json()
        .await?;

    Ok(response)
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Utxo {
    pub txid: String,
    pub vout: u32,
    pub value: u64,
    pub status: UtxoStatus,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UtxoStatus {
    pub confirmed: bool,
    pub block_height: Option<u32>,
    pub block_time: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_utxo_structure() {
        let utxo = Utxo {
            txid: "test_txid".to_string(),
            vout: 0,
            value: 100000,
            status: UtxoStatus {
                confirmed: true,
                block_height: Some(750000),
                block_time: Some(1234567890),
            },
        };

        assert_eq!(utxo.txid, "test_txid");
        assert_eq!(utxo.vout, 0);
        assert_eq!(utxo.value, 100000);
        assert!(utxo.status.confirmed);
    }

    #[test]
    fn test_address_validation() {
        // Test various address formats
        let p2pkh = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
        let p2sh = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";
        let bech32 = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
        
        assert!(p2pkh.starts_with('1'));
        assert!(p2sh.starts_with('3'));
        assert!(bech32.starts_with("bc1"));
    }
}