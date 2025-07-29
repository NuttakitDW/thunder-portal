use bitcoin::hashes::Hash;
use sha2::{Sha256, Digest};

/// Convert hex string to bytes
pub fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, hex::FromHexError> {
    hex::decode(hex)
}

/// Convert bytes to hex string
pub fn bytes_to_hex(bytes: &[u8]) -> String {
    hex::encode(bytes)
}

/// Calculate SHA256 hash
pub fn sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

/// Calculate double SHA256 hash (used in Bitcoin)
pub fn sha256d(data: &[u8]) -> [u8; 32] {
    use bitcoin::hashes::sha256d;
    sha256d::Hash::hash(data).to_byte_array()
}

/// Validate Bitcoin address for the given network
pub fn validate_bitcoin_address(address: &str, network: bitcoin::Network) -> bool {
    bitcoin::Address::from_str(address)
        .map(|addr| addr.network == network)
        .unwrap_or(false)
}

/// Validate Ethereum address format
pub fn validate_ethereum_address(address: &str) -> bool {
    if !address.starts_with("0x") || address.len() != 42 {
        return false;
    }
    
    address[2..].chars().all(|c| c.is_ascii_hexdigit())
}

use std::str::FromStr;

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