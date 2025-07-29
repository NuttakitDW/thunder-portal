use actix_web::{web, HttpResponse};
use crate::{models::*, AppState};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct WebhookRegistration {
    #[validate(url)]
    pub url: String,
    pub events: Vec<WebhookEvent>,
    #[validate(length(min = 32))]
    pub secret: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WebhookEvent {
    #[serde(rename = "order.created")]
    OrderCreated,
    #[serde(rename = "order.fusion_proof_submitted")]
    OrderFusionProofSubmitted,
    #[serde(rename = "order.bitcoin_htlc_created")]
    OrderBitcoinHtlcCreated,
    #[serde(rename = "order.bitcoin_htlc_funded")]
    OrderBitcoinHtlcFunded,
    #[serde(rename = "order.bitcoin_htlc_verified")]
    OrderBitcoinHtlcVerified,
    #[serde(rename = "order.bitcoin_htlc_confirmed")]
    OrderBitcoinHtlcConfirmed,
    #[serde(rename = "order.fusion_order_filled")]
    OrderFusionOrderFilled,
    #[serde(rename = "order.preimage_revealed")]
    OrderPreimageRevealed,
    #[serde(rename = "order.completed")]
    OrderCompleted,
    #[serde(rename = "order.failed")]
    OrderFailed,
    #[serde(rename = "order.expired")]
    OrderExpired,
    #[serde(rename = "order.refunded")]
    OrderRefunded,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookResponse {
    pub webhook_id: Uuid,
    pub url: String,
    pub events: Vec<String>,
    pub secret: Option<String>,
}

/// Register webhook for order status updates
pub async fn register_webhook(
    _state: web::Data<AppState>,
    request: web::Json<WebhookRegistration>,
) -> Result<HttpResponse, ApiError> {
    request.0.validate()?;
    
    // Generate webhook ID
    let webhook_id = Uuid::new_v4();
    
    // Generate secret if not provided
    let secret = request.secret.clone().unwrap_or_else(|| {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let bytes: Vec<u8> = (0..32).map(|_| rng.gen::<u8>()).collect();
        hex::encode(bytes)
    });
    
    // In a real implementation, this would store the webhook in the database
    // For now, we'll just return a response
    
    let response = WebhookResponse {
        webhook_id,
        url: request.url.clone(),
        events: request.events.iter().map(|e| {
            match e {
                WebhookEvent::OrderCreated => "order.created",
                WebhookEvent::OrderFusionProofSubmitted => "order.fusion_proof_submitted",
                WebhookEvent::OrderBitcoinHtlcCreated => "order.bitcoin_htlc_created",
                WebhookEvent::OrderBitcoinHtlcFunded => "order.bitcoin_htlc_funded",
                WebhookEvent::OrderBitcoinHtlcVerified => "order.bitcoin_htlc_verified",
                WebhookEvent::OrderBitcoinHtlcConfirmed => "order.bitcoin_htlc_confirmed",
                WebhookEvent::OrderFusionOrderFilled => "order.fusion_order_filled",
                WebhookEvent::OrderPreimageRevealed => "order.preimage_revealed",
                WebhookEvent::OrderCompleted => "order.completed",
                WebhookEvent::OrderFailed => "order.failed",
                WebhookEvent::OrderExpired => "order.expired",
                WebhookEvent::OrderRefunded => "order.refunded",
            }.to_string()
        }).collect(),
        secret: Some(secret),
    };
    
    Ok(HttpResponse::Created().json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_webhook_validation() {
        let valid_webhook = WebhookRegistration {
            url: "https://example.com/webhook".to_string(),
            events: vec![WebhookEvent::OrderCreated],
            secret: Some("a".repeat(32)),
        };
        
        assert!(valid_webhook.validate().is_ok());
        
        let invalid_webhook = WebhookRegistration {
            url: "not-a-url".to_string(),
            events: vec![],
            secret: Some("short".to_string()),
        };
        
        assert!(invalid_webhook.validate().is_err());
    }
}