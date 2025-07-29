# Thunder Portal - Demo Guide

## 🚀 Quick Demo (5 minutes)

### Prerequisites
- Thunder Portal running (`cargo run`)
- Bitcoin testnet wallet with 0.002 BTC
- Terminal access

### Run the Demo
```bash
./demo/testnet_demo.sh
```

This will:
1. Create a cross-chain swap order
2. Generate an HTLC on Bitcoin testnet
3. Show you how to fund it
4. Verify the HTLC on-chain
5. Track the transaction

## 📊 Full Feature Demo (15 minutes)

### 1. API Health Check
```bash
curl http://localhost:3000/v1/health | jq .
```

### 2. Create HTLC Contract
```bash
curl -X POST http://localhost:3000/v1/htlc/create \
  -H "X-API-Key: testnet-demo-key" \
  -H "Content-Type: application/json" \
  -d '{
    "preimage_hash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925",
    "user_public_key": "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798",
    "timeout_blocks": 144
  }' | jq .
```

**Response:**
```json
{
  "htlc_address": "2N6d4pX7jaTGmi6RvTdeTu4Mcb5TPQxmiYZ",
  "htlc_script": "63a820...",
  "timeout_blocks": 144
}
```

### 3. Create Swap Order
```bash
curl -X POST http://localhost:3000/v1/orders \
  -H "X-API-Key: testnet-demo-key" \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "ETH_TO_BTC",
    "amount": "1000000000000000000",
    "bitcoinAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "bitcoinPublicKey": "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798",
    "fromToken": {
      "symbol": "ETH",
      "address": "0x0000000000000000000000000000000000000000"
    },
    "preimageHash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925"
  }' | jq .
```

### 4. Fund HTLC (Manual Step)
- Open Electrum in testnet mode
- Send 0.001 BTC to the HTLC address
- Copy the transaction ID

### 5. Verify HTLC
```bash
ORDER_ID="your-order-id"
TX_ID="your-transaction-id"
HTLC_ADDRESS="2N6d4pX7jaTGmi6RvTdeTu4Mcb5TPQxmiYZ"
HTLC_SCRIPT="63a820..."

curl -X POST http://localhost:3000/v1/htlc/verify \
  -H "X-API-Key: testnet-demo-key" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"htlcAddress\": \"$HTLC_ADDRESS\",
    \"redeemScript\": \"$HTLC_SCRIPT\",
    \"fundingTxId\": \"$TX_ID\"
  }" | jq .
```

### 6. Track Transaction
```bash
curl http://localhost:3000/v1/transactions/$TX_ID/status \
  -H "X-API-Key: testnet-demo-key" | jq .
```

### 7. View on Explorer
- HTLC: https://blockstream.info/testnet/address/[HTLC_ADDRESS]
- TX: https://blockstream.info/testnet/tx/[TX_ID]

## 🎯 Key Demo Points

### What Makes Thunder Portal Special
1. **Non-Custodial**: Users control their funds
2. **Cross-Chain**: Bitcoin ↔ Ethereum atomic swaps
3. **HTLC-Based**: Cryptographically secure
4. **API-First**: Easy integration

### Technical Highlights
- RESTful API with OpenAPI/Swagger docs
- Real Bitcoin testnet transactions
- Atomic swap protocol implementation
- Transaction tracking and verification

### Use Cases
1. **DEX Integration**: Add Bitcoin to any DEX
2. **Cross-Chain Bridges**: Connect Bitcoin to DeFi
3. **Payment Channels**: Lightning-like functionality
4. **Atomic Swaps**: Trustless exchanges

## 📺 Demo Script for Presentation

### Opening (1 min)
"Thunder Portal enables trustless Bitcoin ↔ Ethereum swaps using HTLCs. Let me show you how it works..."

### Live Demo (3 min)
1. Show Swagger UI - "Complete API documentation"
2. Create HTLC - "Generate a time-locked contract"
3. Fund with testnet BTC - "Real Bitcoin transaction"
4. Verify on explorer - "Transparent and verifiable"

### Technical Deep Dive (2 min)
- HTLC structure and security
- API architecture
- Integration possibilities

### Q&A Points
- Mainnet readiness
- Fee structure
- Security audits
- Performance metrics

## 🛠️ Troubleshooting Demo Issues

### Common Problems
1. **"API Key invalid"** → Use: `testnet-demo-key`
2. **"Transaction not found"** → Wait 10-30 seconds
3. **"Database error"** → Run: `cargo sqlx migrate run`
4. **No testnet BTC** → Faucet: https://bitcoinfaucet.uo1.net/

### Quick Fixes
```bash
# Reset database
rm thunder_portal_testnet.db
cargo sqlx migrate run

# Restart server
pkill -f thunder-portal
cargo run

# Check logs
tail -f logs/*.log
```

## 📝 Demo Checklist

Before starting demo:
- [ ] Thunder Portal running
- [ ] Testnet wallet ready
- [ ] 0.002+ testnet BTC available
- [ ] Swagger UI accessible
- [ ] Demo script tested

During demo:
- [ ] Show API health check
- [ ] Create HTLC live
- [ ] Fund with real BTC
- [ ] Verify on Blockstream
- [ ] Explain security model

After demo:
- [ ] Share API docs link
- [ ] Provide testnet tutorial
- [ ] Follow up on questions

## 🎬 One-Liner Demo Commands

```bash
# Complete demo in one command
./demo/testnet_demo.sh

# Just create HTLC
curl -sX POST http://localhost:3000/v1/htlc/create \
  -H "X-API-Key: testnet-demo-key" \
  -H "Content-Type: application/json" \
  -d '{"preimage_hash":"66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925","user_public_key":"0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798","timeout_blocks":144}' | jq .

# Check API docs
open http://localhost:3000/swagger-ui
```

## 🔗 Resources

- **API Docs**: http://localhost:3000/swagger-ui
- **Testnet Faucet**: https://bitcoinfaucet.uo1.net/
- **Block Explorer**: https://blockstream.info/testnet/
- **Tutorial**: See TESTNET_TUTORIAL.md