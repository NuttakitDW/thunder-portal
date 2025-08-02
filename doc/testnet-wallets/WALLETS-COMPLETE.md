# Thunder Portal Testnet Wallets - Complete Information

Generated: 2025-08-02T08:47:18.149Z

> **Note for Judges**: This file contains all wallet information including seed phrases for easy testing and demonstration of the Thunder Portal cross-chain atomic swap functionality.

## 🚀 Quick Setup

```bash
# Copy the environment file to project root
cp doc/testnet-wallets/.env.testnet .env

# Update RPC endpoints with your API keys
# Then run:
make swap-testnet
```

## 📊 Complete Wallet Information

### Bitcoin Testnet3 Wallets

#### 1. Maker Wallet (User Sending BTC)
- **Address**: `tb1qthmpa24ghlyfcx654ahr65we2fry285jmxnd87`
- **Private Key**: `cSKLGgedNWc2VfxHWUn7ktfJfgtYUM1BC1JhCc3vdPYzeVd3QtwB`
- **Mnemonic**: `banana soon video try hip affair move hub blast forget punch alpha category either sword unique become pepper actual scorpion spread ethics scatter junk`
- **Derivation Path**: `m/84'/1'/0'/0/0`
- **Funding Required**: 0.1-1 BTC
- **Purpose**: User initiating the swap by sending BTC

#### 2. Resolver Service Wallet (BTC Liquidity Provider)
- **Address**: `tb1qh3kya4ejyypt8e29kz2v6jfzxw9mxwuvv8xdut`
- **Private Key**: `cMmu6yzZUQp1qnNwjTiYg37Wr9LcBpDj9eQJpUcisvyLVQWknEvJ`
- **Mnemonic**: `spot fog access danger bubble upper valid castle liquid silk carpet bleak flash advice sorry mirror vast access boost snap squeeze surge similar ankle`
- **Derivation Path**: `m/84'/1'/0'/0/0`
- **Funding Required**: 1-5 BTC
- **Purpose**: Provides Bitcoin liquidity for swaps

#### 3. Taker Wallet (User Receiving BTC)
- **Address**: `tb1qavrzvqd36gumpe42dm6nsjfphmefs0appcufya`
- **Private Key**: `cUEabYupRGQQcBRugphGk3nTKHVd5KXrneohYsJLudfLrJF2FLbJ`
- **Mnemonic**: `festival maze west pass reveal crater wreck merge mimic avoid neither birth peanut manual gorilla staff rely joke goose hero lock liar become layer`
- **Derivation Path**: `m/84'/1'/0'/0/0`
- **Funding Required**: None (receives BTC)
- **Purpose**: User completing the swap by receiving BTC

### Ethereum Sepolia Wallets

#### 1. Maker Wallet (User Receiving ETH)
- **Address**: `0x36c147F1C7CC81a53DE10F190bac157988c5A175`
- **Private Key**: `0xeb45c14e54d9f65a630ac985ae2204b559d85f1029cc3f7fea7bce44d690fdbb`
- **Mnemonic**: `identify clip spread olive right tragic tank elephant vibrant cake banana negative`
- **Derivation Path**: `m/44'/60'/0'/0/0`
- **Funding Required**: 0.1 ETH (for gas)
- **Purpose**: User receiving ETH in exchange for BTC

#### 2. Resolver Service Wallet (ETH Liquidity Provider)
- **Address**: `0xF79e5800150C8DFB3730C9Da17a157dD9D53E6db`
- **Private Key**: `0x10d9248835570af19b9ad9dc4835ae6a57a8c2509c119257344d39b9dfa954bc`
- **Mnemonic**: `call april still fiber talk beach theme frost cake alpha obscure afford`
- **Derivation Path**: `m/44'/60'/0'/0/0`
- **Funding Required**: 5-10 ETH
- **Purpose**: Provides ETH liquidity and deploys escrow contracts

#### 3. Taker Wallet (User Sending ETH)
- **Address**: `0x4cDe35b45BE7E9982c51B5c2F44b79d0078D85BE`
- **Private Key**: `0xc3b01acd8fdc2cd3bcc74fe7d7a0d5d080ec1059caf5f7dfd413176a1e89e3dd`
- **Mnemonic**: `uncle aspect bleak mind damage twenty fortune shift bundle pact demand off`
- **Derivation Path**: `m/44'/60'/0'/0/0`
- **Funding Required**: 1-5 ETH
- **Purpose**: User initiating ETH side of the swap

## 💰 Funding Summary

### Total Required:
- **Bitcoin testnet3**: ~6-11 BTC
- **Ethereum Sepolia**: ~6.6-15.6 ETH

### Priority Funding Order:
1. **Bitcoin Resolver**: 1-5 BTC (most important)
2. **Ethereum Resolver**: 5-10 ETH (most important)
3. **Bitcoin Maker**: 0.1-1 BTC
4. **Ethereum Taker**: 1-5 ETH
5. **Ethereum Maker**: 0.1 ETH (gas only)

## 🔗 Testnet Faucets

### Bitcoin Testnet3
- [CoinFaucet.eu](https://coinfaucet.eu/en/btc-testnet/) - 0.01 BTC per request
- [Bitcoin Faucet UO1](https://bitcoinfaucet.uo1.net/) - 0.002 BTC per request
- [Testnet Faucet](https://testnet-faucet.com/btc-testnet/) - Variable amounts

### Ethereum Sepolia
- [Sepolia Faucet](https://sepoliafaucet.com/) - 0.5 ETH daily
- [Sepolia Dev Faucet](https://faucet.sepolia.dev/) - 0.5 ETH per request
- [PK910 Faucet](https://sepolia-faucet.pk910.de/) - PoW-based faucet

## 🔄 Swap Flow Demonstration

```
1. User A (Maker) wants to swap 0.1 BTC for ETH
2. User A locks 0.1 BTC in HTLC (Bitcoin testnet3)
3. Resolver provides 0.1 BTC worth of ETH on Sepolia
4. User B (Taker) sends ETH to claim the BTC
5. Secret is revealed, completing the atomic swap
6. User A receives ETH, User B receives BTC
```

## 📝 Environment Configuration

The `.env.testnet` file contains:

```bash
# Bitcoin Testnet3
BTC_MAKER_ADDRESS=tb1qthmpa24ghlyfcx654ahr65we2fry285jmxnd87
BTC_MAKER_PRIVATE_KEY=cSKLGgedNWc2VfxHWUn7ktfJfgtYUM1BC1JhCc3vdPYzeVd3QtwB
BTC_RESOLVER_ADDRESS=tb1qh3kya4ejyypt8e29kz2v6jfzxw9mxwuvv8xdut
BTC_RESOLVER_PRIVATE_KEY=cMmu6yzZUQp1qnNwjTiYg37Wr9LcBpDj9eQJpUcisvyLVQWknEvJ
BTC_TAKER_ADDRESS=tb1qavrzvqd36gumpe42dm6nsjfphmefs0appcufya
BTC_TAKER_PRIVATE_KEY=cUEabYupRGQQcBRugphGk3nTKHVd5KXrneohYsJLudfLrJF2FLbJ

# Ethereum Sepolia
ETH_MAKER_ADDRESS=0x36c147F1C7CC81a53DE10F190bac157988c5A175
ETH_MAKER_PRIVATE_KEY=0xeb45c14e54d9f65a630ac985ae2204b559d85f1029cc3f7fea7bce44d690fdbb
ETH_RESOLVER_ADDRESS=0xF79e5800150C8DFB3730C9Da17a157dD9D53E6db
ETH_RESOLVER_PRIVATE_KEY=0x10d9248835570af19b9ad9dc4835ae6a57a8c2509c119257344d39b9dfa954bc
ETH_TAKER_ADDRESS=0x4cDe35b45BE7E9982c51B5c2F44b79d0078D85BE
ETH_TAKER_PRIVATE_KEY=0xc3b01acd8fdc2cd3bcc74fe7d7a0d5d080ec1059caf5f7dfd413176a1e89e3dd

# RPC Endpoints (update with your API keys)
BTC_TESTNET_RPC=https://testnet.bitcoinrpc.com/
ETH_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

## 🎯 Demo Script for Judges

1. **Show the problem**: "$2.5B lost to bridge hacks"
2. **Run the demo**: `make swap-testnet`
3. **Highlight key points**:
   - No bridges, no wrapped tokens
   - True atomic execution
   - Presigned transactions for instant UX
   - 1inch Fusion+ integration
4. **Show blockchain explorers**:
   - Bitcoin: https://blockstream.info/testnet/
   - Ethereum: https://sepolia.etherscan.io/
5. **Emphasize innovation**:
   - Lightning-inspired presigned transactions
   - Cross-chain liquidity aggregation
   - Production-ready architecture

## ⚡ Important Notes

1. These are TESTNET wallets - safe to share for demo
2. Fund wallets before hackathon demo day
3. Test the complete flow at least once before judging
4. Have backup RPC endpoints configured
5. Keep this document handy during presentation