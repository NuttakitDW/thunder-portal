use bitcoin::{
    blockdata::{opcodes, script::Builder},
    hashes::{sha256d, Hash},
    Address, Network,
};
use crate::models::{ApiError, HtlcParams, HtlcScript};

/// Build HTLC script from parameters
pub fn build_htlc_script(params: &HtlcParams) -> Result<HtlcScript, ApiError> {
    // Build the HTLC redeem script
    let redeem_script = Builder::new()
        // IF branch - claim with preimage
        .push_opcode(opcodes::all::OP_IF)
            // Check hash of preimage
            .push_opcode(opcodes::all::OP_SHA256)
            .push_slice(&params.payment_hash)
            .push_opcode(opcodes::all::OP_EQUALVERIFY)
            // Check recipient signature
            .push_key(&params.recipient_pubkey)
            .push_opcode(opcodes::all::OP_CHECKSIG)
        // ELSE branch - refund after timeout
        .push_opcode(opcodes::all::OP_ELSE)
            // Check timeout
            .push_int(params.timeout as i64)
            .push_opcode(opcodes::all::OP_CLTV)
            .push_opcode(opcodes::all::OP_DROP)
            // Check sender signature
            .push_key(&params.sender_pubkey)
            .push_opcode(opcodes::all::OP_CHECKSIG)
        .push_opcode(opcodes::all::OP_ENDIF)
        .into_script();

    // Calculate script hash for P2SH
    let script_hash = sha256d::Hash::hash(redeem_script.as_bytes()).to_byte_array();

    // Create P2SH address
    let network = Network::Testnet; // TODO: Make configurable
    let p2sh_address = Address::p2sh(&redeem_script, network)
        .map_err(|error| ApiError::BitcoinError(format!("Failed to create P2SH address: {}", error)))?;

    Ok(HtlcScript {
        redeem_script: redeem_script.to_bytes(),
        script_hash,
        p2sh_address: p2sh_address.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::secp256k1::{Secp256k1, SecretKey};

    #[test]
    fn test_build_htlc_script_creates_valid_script() {
        let secp = Secp256k1::new();
        
        // Generate test keys
        let sender_secret_key = SecretKey::from_slice(&[1u8; 32]).unwrap();
        let recipient_secret_key = SecretKey::from_slice(&[2u8; 32]).unwrap();
        
        let sender_pubkey = bitcoin::PublicKey {
            inner: sender_secret_key.public_key(&secp),
            compressed: true,
        };
        let recipient_pubkey = bitcoin::PublicKey {
            inner: recipient_secret_key.public_key(&secp),
            compressed: true,
        };
        
        let params = HtlcParams {
            sender_pubkey,
            recipient_pubkey,
            payment_hash: [0u8; 32],
            timeout: 144,
        };
        
        let result = build_htlc_script(&params);
        assert!(result.is_ok());
        
        let script = result.unwrap();
        assert!(!script.redeem_script.is_empty());
        assert_eq!(script.script_hash.len(), 32);
        assert!(script.p2sh_address.starts_with("2")); // Testnet P2SH
    }

    #[test]
    fn test_build_htlc_script_deterministic() {
        let secp = Secp256k1::new();
        let sender_secret_key = SecretKey::from_slice(&[1u8; 32]).unwrap();
        let recipient_secret_key = SecretKey::from_slice(&[2u8; 32]).unwrap();
        
        let params = HtlcParams {
            sender_pubkey: bitcoin::PublicKey {
                inner: sender_secret_key.public_key(&secp),
                compressed: true,
            },
            recipient_pubkey: bitcoin::PublicKey {
                inner: recipient_secret_key.public_key(&secp),
                compressed: true,
            },
            payment_hash: [0u8; 32],
            timeout: 144,
        };
        
        let script1 = build_htlc_script(&params).unwrap();
        let script2 = build_htlc_script(&params).unwrap();
        
        assert_eq!(script1.redeem_script, script2.redeem_script);
        assert_eq!(script1.p2sh_address, script2.p2sh_address);
    }
}