use actix_web::{web, HttpResponse};
use crate::{models::*, AppState};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct TransactionPath {
    tx_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionStatus {
    tx_id: String,
    status: TransactionStatusEnum,
    confirmations: u32,
    block_height: Option<u32>,
    fee: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TransactionStatusEnum {
    Pending,
    Confirmed,
    Failed,
}

/// Get Bitcoin transaction status
pub async fn get_transaction_status(
    state: web::Data<AppState>,
    path: web::Path<TransactionPath>,
) -> Result<HttpResponse, ApiError> {
    // Validate transaction ID format
    if !path.tx_id.chars().all(|c| c.is_ascii_hexdigit()) || path.tx_id.len() != 64 {
        return Err(ApiError::BadRequest {
            code: "INVALID_TX_ID".to_string(),
            message: "Invalid transaction ID format".to_string(),
            details: None,
        });
    }

    // Get transaction from Bitcoin node
    let bitcoin_client = state.order_service.bitcoin_client();
    
    match bitcoin_client.get_transaction(&path.tx_id).await {
        Ok(tx_info) => {
            let confirmations = tx_info.status.confirmations().unwrap_or(0);
            let status = if tx_info.status.confirmed {
                TransactionStatusEnum::Confirmed
            } else {
                TransactionStatusEnum::Pending
            };

            let response = TransactionStatus {
                tx_id: path.tx_id.clone(),
                status,
                confirmations,
                block_height: tx_info.status.block_height,
                fee: Some(tx_info.fee.to_string()),
            };

            Ok(HttpResponse::Ok().json(response))
        }
        Err(_) => {
            Err(ApiError::NotFound {
                code: "TX_NOT_FOUND".to_string(),
                message: "Transaction not found".to_string(),
                details: None,
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transaction_id_validation() {
        let valid_tx_id = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
        assert_eq!(valid_tx_id.len(), 64);
        assert!(valid_tx_id.chars().all(|c| c.is_ascii_hexdigit()));

        let invalid_tx_id = "invalid_tx_id";
        assert!(!invalid_tx_id.chars().all(|c| c.is_ascii_hexdigit()));
    }
}