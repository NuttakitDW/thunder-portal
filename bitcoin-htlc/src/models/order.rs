use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SwapDirection {
    #[serde(rename = "ETH_TO_BTC")]
    EthToBtc,
    #[serde(rename = "BTC_TO_ETH")]
    BtcToEth,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    Created,
    AwaitingFusionProof,
    FusionProofVerified,
    BitcoinHtlcCreated,
    BitcoinHtlcFunded,
    BitcoinHtlcConfirmed,
    FusionOrderFillable,
    FusionOrderFilling,
    FusionOrderFilled,
    PreimageRevealed,
    BitcoinHtlcClaimed,
    Completed,
    Expired,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenInfo {
    pub symbol: String,
    #[serde(with = "address_format")]
    pub address: String,
}

mod address_format {
    use serde::{self, Deserialize, Deserializer, Serializer};
    use regex::Regex;
    use once_cell::sync::Lazy;
    
    static ADDRESS_PATTERN: Lazy<Regex> = Lazy::new(|| {
        Regex::new(r"^0x[a-fA-F0-9]{40}$").unwrap()
    });
    
    pub fn serialize<S>(address: &str, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(address)
    }
    
    pub fn deserialize<'de, D>(deserializer: D) -> Result<String, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        if ADDRESS_PATTERN.is_match(&s) {
            Ok(s)
        } else {
            Err(serde::de::Error::custom("Invalid Ethereum address format"))
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateOrderRequest {
    pub direction: SwapDirection,
    
    #[validate(regex(path = "crate::utils::AMOUNT_REGEX"))]
    pub amount: String,
    
    // For ETH_TO_BTC
    #[serde(rename = "fromToken")]
    pub from_token: Option<TokenInfo>,
    #[serde(rename = "bitcoinAddress")]
    #[validate(regex(path = "crate::utils::BITCOIN_ADDRESS_REGEX"))]
    pub bitcoin_address: Option<String>,
    #[serde(rename = "bitcoinPublicKey")]
    #[validate(regex(path = "crate::utils::PUBKEY_REGEX"))]
    pub bitcoin_public_key: Option<String>,
    
    // For BTC_TO_ETH
    #[serde(rename = "toToken")]
    pub to_token: Option<TokenInfo>,
    #[serde(rename = "ethereumAddress")]
    #[validate(regex(path = "crate::utils::ETH_ADDRESS_REGEX"))]
    pub ethereum_address: Option<String>,
    
    // HTLC parameters
    #[serde(rename = "preimageHash")]
    #[validate(regex(path = "crate::utils::HASH_REGEX"))]
    pub preimage_hash: String,
    
    // Resolver configuration
    #[serde(rename = "resolverPublicKey")]
    #[validate(regex(path = "crate::utils::PUBKEY_REGEX"))]
    pub resolver_public_key: Option<String>,
    
    // Confirmation requirements
    #[serde(rename = "confirmationRequirements")]
    pub confirmation_requirements: Option<ConfirmationRequirements>,
    
    // Timeout configuration
    pub timeouts: Option<TimeoutConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfirmationRequirements {
    #[serde(default = "default_bitcoin_confirmations")]
    pub bitcoin: u32,
    #[serde(default = "default_ethereum_confirmations")]
    pub ethereum: u32,
}

fn default_bitcoin_confirmations() -> u32 { 3 }
fn default_ethereum_confirmations() -> u32 { 12 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeoutConfig {
    #[serde(default = "default_ethereum_blocks")]
    pub ethereum_blocks: u32,
    #[serde(default = "default_bitcoin_blocks")]
    pub bitcoin_blocks: u32,
}

fn default_ethereum_blocks() -> u32 { 300 }
fn default_bitcoin_blocks() -> u32 { 144 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderResponse {
    pub order_id: Uuid,
    pub direction: SwapDirection,
    pub status: OrderStatus,
    pub expected_steps: Vec<String>,
    pub expires_at: DateTime<Utc>,
    pub eth_to_btc_instructions: Option<EthToBtcInstructions>,
    pub btc_to_eth_instructions: Option<BtcToEthInstructions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthToBtcInstructions {
    pub fusion_order_requirements: FusionOrderRequirements,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FusionOrderRequirements {
    pub resolver_address: String,
    pub preimage_hash: String,
    pub token_amount: String,
    pub deadline: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BtcToEthInstructions {
    pub htlc_requirements: HtlcRequirements,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HtlcRequirements {
    pub user_public_key: String,
    pub resolver_public_key: String,
    pub payment_hash: String,
    pub amount: String,
    pub timeout_height: u32,
    pub script_template: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct FusionProofRequest {
    pub fusion_order_id: String,
    #[validate(regex(path = "crate::utils::FUSION_ORDER_HASH_REGEX"))]
    pub fusion_order_hash: String,
    #[validate(regex(path = "crate::utils::FUSION_SIGNATURE_REGEX"))]
    pub fusion_order_signature: String,
    pub fusion_order_data: Option<FusionOrderData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FusionOrderData {
    pub maker: String,
    pub resolver: String,
    pub src_token: String,
    pub dst_token: String,
    pub src_amount: String,
    pub dst_amount: String,
    pub deadline: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FusionProofResponse {
    pub accepted: bool,
    pub next_step: String,
    pub bitcoin_htlc: Option<BitcoinHtlcInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BitcoinHtlcInfo {
    pub htlc_id: Uuid,
    pub address: String,
    pub redeem_script: String,
    pub funding_amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: Uuid,
    pub direction: String,
    pub status: String,
    pub preimage_hash: String,
    pub bitcoin_amount: Option<i64>,
    pub bitcoin_address: Option<String>,
    pub bitcoin_public_key: Option<String>,
    pub ethereum_address: Option<String>,
    pub resolver_public_key: String,
    pub bitcoin_timeout_blocks: i64,
    pub ethereum_timeout_blocks: i64,
    pub bitcoin_confirmations_required: i64,
    pub ethereum_confirmations_required: i64,
    pub fusion_order_id: Option<String>,
    pub fusion_order_hash: Option<String>,
    pub htlc_id: Option<Uuid>,
    pub htlc_address: Option<String>,
    pub htlc_redeem_script: Option<String>,
    pub htlc_funding_tx: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderDetails {
    pub order_id: Uuid,
    pub direction: SwapDirection,
    pub status: OrderStatus,
    pub amounts: OrderAmounts,
    pub addresses: OrderAddresses,
    pub htlc_details: Option<HtlcDetails>,
    pub fusion_order: Option<FusionOrder>,
    pub timestamps: OrderTimestamps,
    pub confirmations: OrderConfirmations,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderAmounts {
    pub bitcoin_amount: Option<u64>,
    pub ethereum_amount: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderAddresses {
    pub bitcoin_address: Option<String>,
    pub ethereum_address: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HtlcDetails {
    pub htlc_id: Uuid,
    pub address: String,
    pub redeem_script: String,
    pub funding_tx: Option<String>,
    pub claim_tx: Option<String>,
    pub refund_tx: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FusionOrder {
    pub order_id: String,
    pub order_hash: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderTimestamps {
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderConfirmations {
    pub bitcoin_required: u32,
    pub bitcoin_current: u32,
    pub ethereum_required: u32,
    pub ethereum_current: u32,
}