# Simplified Architecture for Thunder Portal

## Why Current Design is Complex

The current implementation assumes Thunder Portal needs:
- **Resolver Private Key**: To sign Bitcoin transactions
- **Resolver Public Key**: To be included in HTLC scripts
- **Bitcoin Wallet**: To hold and manage funds

This creates a **custodial** service where Thunder Portal holds user funds - unnecessary complexity!

## Simplified Non-Custodial Design

### What Thunder Portal Should Do:
1. **Track Orders**: Store order state in database
2. **Verify HTLCs**: Check that user-created HTLCs are valid
3. **Coordinate Swaps**: Help users find counterparties
4. **Monitor Blockchain**: Watch for transaction confirmations

### What Thunder Portal Should NOT Do:
1. Hold private keys
2. Control user funds  
3. Sign transactions
4. Create HTLCs with its own funds

## Simplified Flow

### ETH → BTC Swap:
1. User A wants to swap ETH for BTC
2. User B wants to swap BTC for ETH
3. Thunder Portal matches them and creates order
4. User B creates HTLC on Bitcoin (their own keys!)
5. Thunder Portal verifies the HTLC is correct
6. User A creates Fusion+ order on Ethereum
7. Thunder Portal monitors both chains for completion

### No Private Keys Needed!
- Users control their own keys
- Thunder Portal just coordinates and verifies
- Much simpler and more secure

## Simplified Configuration

```env
# Simple configuration - no keys needed!
DATABASE_URL=sqlite://thunder_portal.db
HOST=127.0.0.1
PORT=3000
BITCOIN_NETWORK=testnet
BITCOIN_API_URL=https://blockstream.info/testnet/api

# Optional: Just for API authentication
API_KEYS=test-key-1,test-key-2
```

## Benefits
1. **Simpler**: No key management
2. **Safer**: No funds at risk
3. **Clearer**: Easy to understand flow
4. **Demo-Ready**: Focus on core swap logic