use bitcoin::hashes::Hash;
use sha2::{Sha256, Digest};
use once_cell::sync::Lazy;
use regex::Regex;
use std::str::FromStr;
use bitcoin::Address;

// Validation regex patterns
pub static BITCOIN_ADDRESS_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^tb1[a-z0-9]{39,59}$|^[2mn][a-km-zA-HJ-NP-Z1-9]{25,34}$").unwrap()
});

pub static PUBKEY_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-fA-F0-9]{66}$").unwrap()
});

pub static ETH_ADDRESS_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^0x[a-fA-F0-9]{40}$").unwrap()
});

pub static HASH_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-fA-F0-9]{64}$").unwrap()
});

pub static FUSION_ORDER_HASH_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^0x[a-fA-F0-9]{64}$").unwrap()
});

pub static FUSION_SIGNATURE_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^0x[a-fA-F0-9]{130}$").unwrap()
});

pub static AMOUNT_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^\d+$").unwrap()
});

/// Convert hex string to bytes
#[allow(dead_code)]
pub fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, hex::FromHexError> {
    hex::decode(hex)
}

/// Convert bytes to hex string
#[allow(dead_code)]
pub fn bytes_to_hex(bytes: &[u8]) -> String {
    hex::encode(bytes)
}

/// Calculate SHA256 hash
#[allow(dead_code)]
pub fn sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

/// Calculate double SHA256 hash (used in Bitcoin)
#[allow(dead_code)]
pub fn sha256d(data: &[u8]) -> [u8; 32] {
    use bitcoin::hashes::sha256d;
    sha256d::Hash::hash(data).to_byte_array()
}

/// Validate Bitcoin address for the given network
#[allow(dead_code)]
pub fn validate_bitcoin_address(address: &str, network: bitcoin::Network) -> bool {
    Address::from_str(address)
        .ok()
        .and_then(|addr| addr.require_network(network).ok())
        .is_some()
}

/// Validate Ethereum address format
#[allow(dead_code)]
pub fn validate_ethereum_address(address: &str) -> bool {
    if !address.starts_with("0x") || address.len() != 42 {
        return false;
    }
    
    address[2..].chars().all(|c| c.is_ascii_hexdigit())
}

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::Network;

    #[test]
    fn test_hex_conversion() {
        let data = b"Hello, World!";
        let hex = bytes_to_hex(data);
        let decoded = hex_to_bytes(&hex).unwrap();
        assert_eq!(data.to_vec(), decoded);
    }

    #[test]
    fn test_sha256() {
        let data = b"test data";
        let hash = sha256(data);
        assert_eq!(hash.len(), 32);
    }

    #[test]
    fn test_bitcoin_address_validation() {
        // Valid testnet address
        assert!(validate_bitcoin_address("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", Network::Testnet));
        
        // Invalid address for testnet
        assert!(!validate_bitcoin_address("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", Network::Testnet));
    }

    #[test]
    fn test_ethereum_address_validation() {
        // Valid address
        assert!(validate_ethereum_address("0x742d35Cc6634C0532925a3b844Bc9e7595f62490"));
        
        // Invalid addresses
        assert!(!validate_ethereum_address("0x742d35Cc6634C0532925a3b844Bc9e7595f6249")); // Too short
        assert!(!validate_ethereum_address("742d35Cc6634C0532925a3b844Bc9e7595f62490")); // No 0x prefix
        assert!(!validate_ethereum_address("0x742d35Cc6634C0532925a3b844Bc9e7595f6249G")); // Invalid character
    }
}