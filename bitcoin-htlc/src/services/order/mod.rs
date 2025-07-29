pub mod create_order;
pub mod get_order;
pub mod submit_fusion_proof;

// Re-export functions for easy access
pub use create_order::create_order;
pub use get_order::get_order;
pub use submit_fusion_proof::submit_fusion_proof;

// Re-export OrderService for backward compatibility
use crate::models::*;
use crate::services::bitcoin::BitcoinClient;
use bitcoin::{Network, PublicKey};
use sqlx::SqlitePool;
use std::env;
use std::str::FromStr;
use uuid::Uuid;

#[derive(Clone)]
pub struct OrderService {
    pool: SqlitePool,
    bitcoin_client: BitcoinClient,
    #[allow(dead_code)]
    network: Network,
    resolver_pubkey: Option<PublicKey>,
}

impl OrderService {
    pub fn new(pool: SqlitePool, bitcoin_client: BitcoinClient) -> Self {
        let network = match env::var("BITCOIN_NETWORK").as_deref() {
            Ok("mainnet") => Network::Bitcoin,
            Ok("testnet") | _ => Network::Testnet,
        };

        // Resolver public key is optional - only needed if Thunder Portal acts as a resolver
        let resolver_pubkey = env::var("RESOLVER_PUBLIC_KEY").ok()
            .and_then(|key| PublicKey::from_str(&key).ok());

        Self {
            pool,
            bitcoin_client,
            network,
            resolver_pubkey,
        }
    }
    
    pub fn bitcoin_client(&self) -> &BitcoinClient {
        &self.bitcoin_client
    }

    pub async fn create_order(&self, request: CreateOrderRequest) -> Result<CreateOrderResponse, ApiError> {
        // Use resolver pubkey from request if provided, otherwise use configured one (if any)
        let resolver_pubkey = request.resolver_public_key.as_ref()
            .and_then(|key| PublicKey::from_str(key).ok())
            .or(self.resolver_pubkey);
            
        create_order(&self.pool, resolver_pubkey.as_ref(), request).await
    }

    pub async fn get_order(&self, order_id: Uuid) -> Result<OrderDetails, ApiError> {
        get_order(&self.pool, order_id).await
    }

    pub async fn submit_fusion_proof(
        &self,
        order_id: Uuid,
        proof: FusionProofRequest,
    ) -> Result<FusionProofResponse, ApiError> {
        submit_fusion_proof(&self.pool, &self.bitcoin_client, order_id, proof).await
    }
}