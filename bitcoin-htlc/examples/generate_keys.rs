use bitcoin::{secp256k1::{rand, Secp256k1}, PrivateKey, Network};

fn main() {
    println!("Bitcoin Key Generator for Thunder Portal");
    println!("========================================\n");

    // Generate for testnet
    generate_keypair(Network::Testnet);
    
    println!("\n");
    
    // Generate for mainnet (be careful!)
    generate_keypair(Network::Bitcoin);
}

fn generate_keypair(network: Network) {
    let secp = Secp256k1::new();
    let (secret_key, _) = secp.generate_keypair(&mut rand::thread_rng());
    let private_key = PrivateKey::new(secret_key, network);
    let public_key = private_key.public_key(&secp);
    
    println!("Network: {:?}", network);
    println!("─────────────────────────────────────────");
    println!("Private Key (WIF): {}", private_key);
    println!("Private Key (Hex): {}", hex::encode(secret_key.as_ref()));
    println!("Public Key (Hex):  {}", public_key);
    println!();
    
    // Generate P2PKH address
    let p2pkh_address = bitcoin::Address::p2pkh(&public_key, network);
    println!("P2PKH Address: {}", p2pkh_address);
    
    // Generate P2WPKH address (native segwit)
    if let Ok(p2wpkh_address) = bitcoin::Address::p2wpkh(&public_key, network) {
        println!("P2WPKH Address: {}", p2wpkh_address);
    }
    
    println!("\n⚠️  IMPORTANT: Store the private key securely!");
    if network == Network::Bitcoin {
        println!("⚠️  This is a MAINNET key - real money at risk!");
    }
}