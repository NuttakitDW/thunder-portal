pub mod health_check;
pub mod create_order;
pub mod get_order;
pub mod submit_fusion_proof;
pub mod create_htlc;
pub mod verify_htlc;
pub mod claim_htlc;
pub mod refund_htlc;
pub mod transaction_status;
pub mod webhooks;
pub mod fee_estimate;

// Re-export handlers for easy access
pub use health_check::health_check;
pub use create_order::create_order;
pub use get_order::get_order;
pub use submit_fusion_proof::submit_fusion_proof;
pub use create_htlc::create_htlc;
pub use verify_htlc::verify_htlc;
pub use claim_htlc::claim_htlc;
pub use refund_htlc::refund_htlc;
pub use transaction_status::get_transaction_status;
pub use webhooks::register_webhook;
pub use fee_estimate::estimate_fees;