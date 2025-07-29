# Thunder Portal - Demo Quick Reference

## 🚀 Start Demo
```bash
# Option 1: Interactive Demo (Recommended)
./demo/interactive_demo.sh

# Option 2: Automated Demo
./demo/testnet_demo.sh
```

## 📋 Copy-Paste Commands

### 1. Health Check
```bash
curl http://localhost:3000/v1/health | jq .
```

### 2. Create HTLC
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

### 3. Create Order
```bash
curl -X POST http://localhost:3000/v1/orders \
  -H "X-API-Key: testnet-demo-key" \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "ETH_TO_BTC",
    "amount": "1000000000000000000",
    "bitcoinAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "bitcoinPublicKey": "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798",
    "fromToken": {"symbol": "ETH", "address": "0x0000000000000000000000000000000000000000"},
    "preimageHash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925"
  }' | jq .
```

### 4. Verify HTLC (after funding)
```bash
# Set variables
ORDER_ID="your-order-id"
TX_ID="your-tx-id"
HTLC_ADDRESS="2N6d4pX7jaTGmi6RvTdeTu4Mcb5TPQxmiYZ"
HTLC_SCRIPT="63a820..."

# Verify
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

### 5. Check Transaction
```bash
curl http://localhost:3000/v1/transactions/YOUR_TX_ID/status \
  -H "X-API-Key: testnet-demo-key" | jq .
```

## 🔑 Demo Constants

```bash
# API Key
API_KEY="testnet-demo-key"

# Preimage and Hash
PREIMAGE="426c6f636b636861696e2069732061776573"
PREIMAGE_HASH="66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925"

# Public Key
USER_PUBKEY="0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"

# Demo Bitcoin Address
BTC_ADDRESS="tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
```

## 🌐 Important URLs

- **Swagger UI**: http://localhost:3000/swagger-ui
- **Testnet Faucet**: https://bitcoinfaucet.uo1.net/
- **Block Explorer**: https://blockstream.info/testnet/

## ⚡ Quick Tips

1. **Need testnet BTC?**
   - https://bitcoinfaucet.uo1.net/
   - https://testnet-faucet.com/btc-testnet/
   - https://coinfaucet.eu/en/btc-testnet/

2. **Electrum Testnet Mode**
   ```bash
   /Applications/Electrum.app/Contents/MacOS/run_electrum --testnet
   ```

3. **Reset Everything**
   ```bash
   rm thunder_portal_testnet.db
   cargo sqlx migrate run
   cargo run
   ```

4. **View Logs**
   ```bash
   RUST_LOG=debug cargo run
   ```

## 📊 Demo Flow

```
1. Health Check ✓
   ↓
2. Create HTLC → Get P2SH Address
   ↓
3. Create Order → Get Order ID
   ↓
4. Fund HTLC → Send BTC to P2SH
   ↓
5. Verify HTLC → Confirm funding
   ↓
6. Track TX → Monitor confirmations
   ↓
7. View on Explorer → Show transparency
```

## 🎯 Key Points to Emphasize

- **Non-Custodial**: Users control funds
- **Atomic**: All-or-nothing execution
- **Cross-Chain**: Bitcoin ↔ Ethereum
- **API-First**: Easy integration
- **Testnet Ready**: Real transactions

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "API key invalid" | Use: `testnet-demo-key` |
| "Transaction not found" | Wait 10-30 seconds |
| "Database error" | Run: `cargo sqlx migrate run` |
| "HTLC verification failed" | Check amount is exactly 0.001 BTC |