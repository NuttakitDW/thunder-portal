use crate::models::{ApiError, HtlcParams};
use crate::services::htlc::build_htlc_script::build_htlc_script;

/// Verify that an HTLC script matches expected parameters
#[allow(dead_code)]
pub fn verify_htlc_script(
    script: &[u8],
    expected_params: &HtlcParams,
) -> Result<bool, ApiError> {
    let built_script = build_htlc_script(expected_params)?;
    Ok(built_script.redeem_script == script)
}

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::secp256k1::{Secp256k1, SecretKey};

    #[test]
    fn test_verify_htlc_script_matching() {
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
        
        let built_script = build_htlc_script(&params).unwrap();
        let result = verify_htlc_script(&built_script.redeem_script, &params).unwrap();
        
        assert!(result);
    }

    #[test]
    fn test_verify_htlc_script_non_matching() {
        let secp = Secp256k1::new();
        let sender_secret_key = SecretKey::from_slice(&[1u8; 32]).unwrap();
        let recipient_secret_key = SecretKey::from_slice(&[2u8; 32]).unwrap();
        
        let params1 = HtlcParams {
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
        
        let params2 = HtlcParams {
            sender_pubkey: bitcoin::PublicKey {
                inner: sender_secret_key.public_key(&secp),
                compressed: true,
            },
            recipient_pubkey: bitcoin::PublicKey {
                inner: recipient_secret_key.public_key(&secp),
                compressed: true,
            },
            payment_hash: [1u8; 32], // Different hash
            timeout: 144,
        };
        
        let built_script = build_htlc_script(&params1).unwrap();
        let result = verify_htlc_script(&built_script.redeem_script, &params2).unwrap();
        
        assert!(!result);
    }
}