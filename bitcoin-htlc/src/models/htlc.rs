use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct VerifyHtlcRequest {
    pub transaction_hex: String,
    pub output_index: u32,
    pub expected_amount: u64,
    #[validate(regex(path = "crate::utils::HASH_REGEX"))]
    pub expected_payment_hash: String,
    #[validate(regex(path = "crate::utils::PUBKEY_REGEX"))]
    pub expected_recipient_pubkey: String,
    #[validate(regex(path = "crate::utils::PUBKEY_REGEX"))]
    pub expected_sender_pubkey: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyHtlcResponse {
    pub valid: bool,
    pub htlc_address: String,
    pub actual_amount: u64,
    pub timeout_height: u32,
    pub validation_errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct ClaimRequest {
    #[validate(regex(path = "crate::utils::HASH_REGEX"))]
    pub preimage: String,
    pub bitcoin_tx_hex: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimResponse {
    pub transaction_id: String,
    pub status: String,
    pub claim_address: String,
    pub claimed_amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefundResponse {
    pub transaction_id: String,
    pub status: String,
    pub refund_address: String,
    pub refunded_amount: u64,
}

#[derive(Debug, Clone)]
pub struct HtlcScript {
    pub redeem_script: Vec<u8>,
    #[allow(dead_code)]
    pub script_hash: [u8; 32],
    pub p2sh_address: String,
}

#[derive(Debug, Clone)]
pub struct HtlcParams {
    pub recipient_pubkey: bitcoin::PublicKey,
    pub sender_pubkey: bitcoin::PublicKey,
    pub payment_hash: [u8; 32],
    pub timeout: u32,
}