pub mod htlc;
pub mod transaction;
pub mod bitcoin;
pub mod order;

// Re-export commonly used items
pub use htlc::{
    build_htlc_script,
    generate_preimage,
    hash_preimage,
    parse_htlc_script,
    verify_htlc_script,
};

pub use transaction::{
    create_funding_transaction,
    create_claim_transaction,
    create_refund_transaction,
};

pub use bitcoin::BitcoinClient;
pub use order::OrderService;