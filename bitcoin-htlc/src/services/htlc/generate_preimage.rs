use sha2::{Sha256, Digest};

/// Generate a random preimage and its hash
pub fn generate_preimage() -> ([u8; 32], [u8; 32]) {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let mut preimage = [0u8; 32];
    rng.fill(&mut preimage);
    
    let payment_hash = hash_preimage(&preimage);
    (preimage, payment_hash)
}

/// Generate a payment hash from a preimage
pub fn hash_preimage(preimage: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(preimage);
    hasher.finalize().into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_preimage_creates_unique_values() {
        let (preimage1, hash1) = generate_preimage();
        let (preimage2, hash2) = generate_preimage();
        
        // Preimages should be different (extremely unlikely to be same)
        assert_ne!(preimage1, preimage2);
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_hash_preimage_deterministic() {
        let preimage = [1u8; 32];
        let hash1 = hash_preimage(&preimage);
        let hash2 = hash_preimage(&preimage);
        
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_preimage_correct_size() {
        let preimage = b"test preimage data";
        let hash = hash_preimage(preimage);
        
        assert_eq!(hash.len(), 32);
    }

    #[test]
    fn test_generate_preimage_hash_relationship() {
        let (preimage, hash) = generate_preimage();
        let computed_hash = hash_preimage(&preimage);
        
        assert_eq!(hash, computed_hash);
    }
}