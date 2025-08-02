#!/usr/bin/env node

const { ethers } = require('ethers');
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const { ECPairFactory } = require('ecpair');

// Initialize with secp256k1 library
bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

const fs = require('fs');
const path = require('path');

// Networks
const btcTestnet = bitcoin.networks.testnet;

// Generate wallets for Thunder Portal testnet swap
async function generateWallets() {
    console.log('🔐 Generating Thunder Portal Testnet Wallets...\n');
    
    const wallets = {
        bitcoin: {},
        ethereum: {},
        timestamp: new Date().toISOString()
    };

    // Generate Bitcoin wallets
    console.log('📙 Bitcoin Testnet3 Wallets:');
    console.log('=' .repeat(60));
    
    // 1. Bitcoin Maker Wallet (User sending BTC)
    const btcMakerMnemonic = bip39.generateMnemonic(256);
    const btcMakerSeed = bip39.mnemonicToSeedSync(btcMakerMnemonic);
    const btcMakerRoot = bip32.fromSeed(btcMakerSeed, btcTestnet);
    const btcMakerPath = "m/84'/1'/0'/0/0"; // BIP84 testnet
    const btcMakerChild = btcMakerRoot.derivePath(btcMakerPath);
    const btcMakerP2wpkh = bitcoin.payments.p2wpkh({ 
        pubkey: Buffer.from(btcMakerChild.publicKey), 
        network: btcTestnet 
    });
    
    wallets.bitcoin.maker = {
        mnemonic: btcMakerMnemonic,
        path: btcMakerPath,
        address: btcMakerP2wpkh.address,
        privateKey: btcMakerChild.toWIF(),
        publicKey: btcMakerChild.publicKey.toString('hex'),
        role: 'User sending BTC, needs 0.001 BTC funding'
    };
    
    console.log('\n1. Maker Wallet (BTC Sender)');
    console.log(`   Address: ${btcMakerP2wpkh.address}`);
    console.log(`   Role: ${wallets.bitcoin.maker.role}`);
    
    // 2. Bitcoin Resolver Service Wallet (Liquidity Provider)
    const btcResolverMnemonic = bip39.generateMnemonic(256);
    const btcResolverSeed = bip39.mnemonicToSeedSync(btcResolverMnemonic);
    const btcResolverRoot = bip32.fromSeed(btcResolverSeed, btcTestnet);
    const btcResolverPath = "m/84'/1'/0'/0/0";
    const btcResolverChild = btcResolverRoot.derivePath(btcResolverPath);
    const btcResolverP2wpkh = bitcoin.payments.p2wpkh({ 
        pubkey: Buffer.from(btcResolverChild.publicKey), 
        network: btcTestnet 
    });
    
    wallets.bitcoin.resolver = {
        mnemonic: btcResolverMnemonic,
        path: btcResolverPath,
        address: btcResolverP2wpkh.address,
        privateKey: btcResolverChild.toWIF(),
        publicKey: btcResolverChild.publicKey.toString('hex'),
        role: 'Liquidity provider, needs 0.01 BTC funding'
    };
    
    console.log('\n2. Resolver Service Wallet (BTC Liquidity)');
    console.log(`   Address: ${btcResolverP2wpkh.address}`);
    console.log(`   Role: ${wallets.bitcoin.resolver.role}`);
    
    // 3. Bitcoin Taker Wallet (User receiving BTC)
    const btcTakerMnemonic = bip39.generateMnemonic(256);
    const btcTakerSeed = bip39.mnemonicToSeedSync(btcTakerMnemonic);
    const btcTakerRoot = bip32.fromSeed(btcTakerSeed, btcTestnet);
    const btcTakerPath = "m/84'/1'/0'/0/0";
    const btcTakerChild = btcTakerRoot.derivePath(btcTakerPath);
    const btcTakerP2wpkh = bitcoin.payments.p2wpkh({ 
        pubkey: Buffer.from(btcTakerChild.publicKey), 
        network: btcTestnet 
    });
    
    wallets.bitcoin.taker = {
        mnemonic: btcTakerMnemonic,
        path: btcTakerPath,
        address: btcTakerP2wpkh.address,
        privateKey: btcTakerChild.toWIF(),
        publicKey: btcTakerChild.publicKey.toString('hex'),
        role: 'User receiving BTC, no initial funding needed'
    };
    
    console.log('\n3. Taker Wallet (BTC Receiver)');
    console.log(`   Address: ${btcTakerP2wpkh.address}`);
    console.log(`   Role: ${wallets.bitcoin.taker.role}`);
    
    // Note about HTLC Escrow
    console.log('\n4. HTLC Escrow Address');
    console.log('   Note: This will be generated dynamically for each swap');
    console.log('   Type: P2WSH address derived from HTLC script');
    
    // Generate Ethereum wallets
    console.log('\n\n📘 Ethereum Sepolia Wallets:');
    console.log('=' .repeat(60));
    
    // 1. Ethereum Maker Wallet (User receiving ETH)
    const ethMakerWallet = ethers.Wallet.createRandom();
    const ethMakerMnemonic = ethMakerWallet.mnemonic.phrase;
    
    wallets.ethereum.maker = {
        mnemonic: ethMakerMnemonic,
        path: "m/44'/60'/0'/0/0",
        address: ethMakerWallet.address,
        privateKey: ethMakerWallet.privateKey,
        publicKey: ethMakerWallet.publicKey,
        role: 'User receiving ETH, needs 0.1 ETH for gas'
    };
    
    console.log('\n1. Maker Wallet (ETH Receiver)');
    console.log(`   Address: ${ethMakerWallet.address}`);
    console.log(`   Role: ${wallets.ethereum.maker.role}`);
    
    // 2. Ethereum Resolver Service Wallet (Liquidity Provider)
    const ethResolverWallet = ethers.Wallet.createRandom();
    const ethResolverMnemonic = ethResolverWallet.mnemonic.phrase;
    
    wallets.ethereum.resolver = {
        mnemonic: ethResolverMnemonic,
        path: "m/44'/60'/0'/0/0",
        address: ethResolverWallet.address,
        privateKey: ethResolverWallet.privateKey,
        publicKey: ethResolverWallet.publicKey,
        role: 'Liquidity provider & contract deployer, needs 0.5-1 ETH'
    };
    
    console.log('\n2. Resolver Service Wallet (ETH Liquidity)');
    console.log(`   Address: ${ethResolverWallet.address}`);
    console.log(`   Role: ${wallets.ethereum.resolver.role}`);
    
    // 3. Ethereum Taker Wallet (User sending ETH)
    const ethTakerWallet = ethers.Wallet.createRandom();
    const ethTakerMnemonic = ethTakerWallet.mnemonic.phrase;
    
    wallets.ethereum.taker = {
        mnemonic: ethTakerMnemonic,
        path: "m/44'/60'/0'/0/0",
        address: ethTakerWallet.address,
        privateKey: ethTakerWallet.privateKey,
        publicKey: ethTakerWallet.publicKey,
        role: 'User sending ETH, needs 0.1-0.5 ETH funding'
    };
    
    console.log('\n3. Taker Wallet (ETH Sender)');
    console.log(`   Address: ${ethTakerWallet.address}`);
    console.log(`   Role: ${wallets.ethereum.taker.role}`);
    
    // Note about Escrow Contract
    console.log('\n4. Escrow Contract Address');
    console.log('   Note: This will be deployed by SimpleEscrowFactory');
    console.log('   Type: Smart contract address on Sepolia');
    
    // Save wallet data
    const walletsDir = path.join(__dirname, '..', 'doc', 'testnet-wallets');
    if (!fs.existsSync(walletsDir)) {
        fs.mkdirSync(walletsDir, { recursive: true });
    }
    
    // Save full wallet data (SENSITIVE - DO NOT COMMIT)
    const sensitiveFile = path.join(walletsDir, 'wallets-sensitive.json');
    fs.writeFileSync(sensitiveFile, JSON.stringify(wallets, null, 2));
    
    // Create public addresses only file (SAFE TO SHARE)
    const publicData = {
        bitcoin: {
            maker: wallets.bitcoin.maker.address,
            resolver: wallets.bitcoin.resolver.address,
            taker: wallets.bitcoin.taker.address
        },
        ethereum: {
            maker: wallets.ethereum.maker.address,
            resolver: wallets.ethereum.resolver.address,
            taker: wallets.ethereum.taker.address
        },
        timestamp: wallets.timestamp
    };
    
    const publicFile = path.join(walletsDir, 'wallets-public.json');
    fs.writeFileSync(publicFile, JSON.stringify(publicData, null, 2));
    
    // Generate environment variables file
    const envContent = `# Thunder Portal Testnet Wallets
# Generated: ${wallets.timestamp}
# ⚠️  DO NOT COMMIT THIS FILE TO GIT ⚠️

# Bitcoin Testnet3
BTC_MAKER_ADDRESS=${wallets.bitcoin.maker.address}
BTC_MAKER_PRIVATE_KEY=${wallets.bitcoin.maker.privateKey}
BTC_RESOLVER_ADDRESS=${wallets.bitcoin.resolver.address}
BTC_RESOLVER_PRIVATE_KEY=${wallets.bitcoin.resolver.privateKey}
BTC_TAKER_ADDRESS=${wallets.bitcoin.taker.address}
BTC_TAKER_PRIVATE_KEY=${wallets.bitcoin.taker.privateKey}

# Ethereum Sepolia
ETH_MAKER_ADDRESS=${wallets.ethereum.maker.address}
ETH_MAKER_PRIVATE_KEY=${wallets.ethereum.maker.privateKey}
ETH_RESOLVER_ADDRESS=${wallets.ethereum.resolver.address}
ETH_RESOLVER_PRIVATE_KEY=${wallets.ethereum.resolver.privateKey}
ETH_TAKER_ADDRESS=${wallets.ethereum.taker.address}
ETH_TAKER_PRIVATE_KEY=${wallets.ethereum.taker.privateKey}

# RPC Endpoints (update with your API keys)
BTC_TESTNET_RPC=https://testnet.bitcoinrpc.com/
ETH_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
`;
    
    const envFile = path.join(walletsDir, '.env.testnet');
    fs.writeFileSync(envFile, envContent);
    
    console.log('\n\n✅ Wallet Generation Complete!');
    console.log('=' .repeat(60));
    console.log(`📁 Files created in: ${walletsDir}`);
    console.log('   - wallets-sensitive.json (⚠️  KEEP PRIVATE)');
    console.log('   - wallets-public.json (✅ Safe to share)');
    console.log('   - .env.testnet (⚠️  KEEP PRIVATE)');
    
    console.log('\n🚨 IMPORTANT: Add these files to .gitignore:');
    console.log('   doc/testnet-wallets/wallets-sensitive.json');
    console.log('   doc/testnet-wallets/.env.testnet');
    
    console.log('\n💰 Next Steps:');
    console.log('1. Fund the wallets using testnet faucets');
    console.log('2. Copy .env.testnet to your service directories');
    console.log('3. Update RPC endpoints with your API keys');
    
    return wallets;
}

// Run the generator
generateWallets().catch(console.error);