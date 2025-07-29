pub mod build_htlc_script;
pub mod generate_preimage;
pub mod parse_htlc_script;
pub mod verify_htlc_script;

// Re-export functions for easy access
pub use build_htlc_script::build_htlc_script;
pub use generate_preimage::{generate_preimage, hash_preimage};
pub use parse_htlc_script::parse_htlc_script;
pub use verify_htlc_script::verify_htlc_script;