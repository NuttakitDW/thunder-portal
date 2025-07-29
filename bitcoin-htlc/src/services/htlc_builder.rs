use bitcoin::{
    blockdata::{opcodes, script::Builder},
    hashes::{sha256d, Hash},
    Address, Network,
};
use crate::models::{ApiError, HtlcParams, HtlcScript};

pub struct HtlcBuilder;

impl HtlcBuilder {
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
            .map_err(|e| ApiError::BitcoinError(format!("Failed to create P2SH address: {}", e)))?;

        Ok(HtlcScript {
            redeem_script: redeem_script.to_bytes(),
            script_hash,
            p2sh_address: p2sh_address.to_string(),
        })
    }

    /// Parse HTLC script and extract parameters
    #[allow(dead_code)]
    pub fn parse_htlc_script(_script: &[u8]) -> Result<HtlcParams, ApiError> {
        // This is a simplified parser - in production you'd want more robust parsing
        // For now, we'll return an error as this is complex to implement correctly
        Err(ApiError::BitcoinError("HTLC script parsing not implemented".to_string()))
    }

    /// Verify that an HTLC script matches expected parameters
    #[allow(dead_code)]
    pub fn verify_htlc_script(
        script: &[u8],
        expected_params: &HtlcParams,
    ) -> Result<bool, ApiError> {
        let built_script = Self::build_htlc_script(expected_params)?;
        Ok(built_script.redeem_script == script)
    }

    /// Generate a payment hash from a preimage
    #[allow(dead_code)]
    pub fn hash_preimage(preimage: &[u8]) -> [u8; 32] {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(preimage);
        hasher.finalize().into()
    }

    /// Generate a random preimage
    #[allow(dead_code)]
    pub fn generate_preimage() -> ([u8; 32], [u8; 32]) {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let mut preimage = [0u8; 32];
        rng.fill(&mut preimage);
        
        let payment_hash = Self::hash_preimage(&preimage);
        (preimage, payment_hash)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::secp256k1::{Secp256k1, SecretKey};

    #[test]
    fn test_htlc_script_creation() {
        let secp = Secp256k1::new();
        
        // Generate test keys
        let sender_sk = SecretKey::from_slice(&[1u8; 32]).unwrap();
        let recipient_sk = SecretKey::from_slice(&[2u8; 32]).unwrap();
        
        let sender_pubkey = bitcoin::PublicKey {
            inner: sender_sk.public_key(&secp),
            compressed: true,
        };
        let recipient_pubkey = bitcoin::PublicKey {
            inner: recipient_sk.public_key(&secp),
            compressed: true,
        };
        
        // Generate payment hash
        let (_, payment_hash) = HtlcBuilder::generate_preimage();
        
        // Create HTLC parameters
        let params = HtlcParams {
            recipient_pubkey,
            sender_pubkey,
            payment_hash,
            timeout: 500_000,
        };
        
        // Build script
        let script = HtlcBuilder::build_htlc_script(&params).unwrap();
        
        // Verify we got a P2SH address
        assert!(script.p2sh_address.starts_with("2") || script.p2sh_address.starts_with("tb"));
        assert!(!script.redeem_script.is_empty());
    }

    #[test]
    fn test_preimage_generation() {
        let (preimage, payment_hash) = HtlcBuilder::generate_preimage();
        
        // Verify the hash matches
        let computed_hash = HtlcBuilder::hash_preimage(&preimage);
        assert_eq!(payment_hash, computed_hash);
    }
}