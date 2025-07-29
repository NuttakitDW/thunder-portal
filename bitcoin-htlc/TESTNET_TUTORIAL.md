# Thunder Portal - Bitcoin Testnet Tutorial

This tutorial shows you **exactly** how to run Thunder Portal on Bitcoin testnet and create real HTLCs that you can see on the blockchain.

## Prerequisites

1. **Rust** (latest stable)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Bitcoin Testnet Wallet**
   - Download: [Electrum](https://electrum.org/#download) 
   - In Electrum: Tools → Network → Testnet

3. **Testnet Bitcoin**
   - Get from: https://bitcoinfaucet.uo1.net/
   - Amount needed: 0.002 BTC

## Step 1: Setup Thunder Portal

```bash
# Clone and enter directory
cd bitcoin-htlc

# Copy testnet configuration
cp .env.testnet .env

# Install dependencies and build
cargo build --release

# Run database migrations
cargo sqlx migrate run

# Start Thunder Portal
cargo run
```

Thunder Portal is now running at http://localhost:3000

## Step 2: Verify API is Working

```bash
# Check health
curl http://localhost:3000/v1/health | jq .

# Should return:
{
  "status": "healthy",
  "dependencies": {
    "bitcoinNode": { "connected": true },
    "database": { "connected": true }
  }
}
```

## Step 3: Create Your First Order

```bash
# Create ETH→BTC swap order
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/v1/orders \
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
  }')

# Extract order ID
ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.orderId')
echo "Order created: $ORDER_ID"
```

## Step 4: Create and Fund HTLC

### Option A: Use Pre-calculated HTLC (Fastest)

```bash
# HTLC Details
HTLC_ADDRESS="2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF"
HTLC_SCRIPT="63a82066687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925882103789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fdac6704c0d82400b1752103789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fdac68"

# Send 0.001 BTC to this address from your testnet wallet
echo "Send testnet BTC to: $HTLC_ADDRESS"
```

### Option B: Generate Your Own HTLC

Use the Bitcoin Script examples in the API documentation to generate custom HTLCs with your own parameters.

## Step 5: Verify HTLC with API

After funding the HTLC (wait for 1 confirmation):

```bash
# Get your funding transaction ID from wallet or explorer
FUNDING_TX_ID="your-transaction-id-here"

# Verify HTLC
curl -X POST http://localhost:3000/v1/htlc/verify \
  -H "X-API-Key: testnet-demo-key" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"htlcAddress\": \"$HTLC_ADDRESS\",
    \"redeemScript\": \"$HTLC_SCRIPT\",
    \"fundingTxId\": \"$FUNDING_TX_ID\"
  }" | jq .
```

## Step 6: Track Transaction Status

```bash
# Check transaction status
curl http://localhost:3000/v1/transactions/$FUNDING_TX_ID/status \
  -H "X-API-Key: testnet-demo-key" | jq .

# Response:
{
  "txId": "your-tx-id",
  "status": "confirmed",
  "confirmations": 3,
  "blockHeight": 2584000
}
```

## Step 7: View on Blockchain Explorer

Open in browser:
- HTLC Address: https://blockstream.info/testnet/address/2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF
- Your Transaction: https://blockstream.info/testnet/tx/YOUR_TX_ID

## Complete Demo Script

Save as `testnet_demo.sh`:

```bash
#!/bin/bash
set -e

API_URL="http://localhost:3000/v1"
API_KEY="testnet-demo-key"

echo "🚀 Thunder Portal Testnet Demo"
echo "=============================="

# 1. Check API health
echo -e "\n1. Checking API health..."
curl -s $API_URL/health | jq .

# 2. Create order
echo -e "\n2. Creating order..."
ORDER_ID=$(curl -s -X POST $API_URL/orders \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "ETH_TO_BTC",
    "amount": "1000000000000000000",
    "bitcoinAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "bitcoinPublicKey": "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798",
    "fromToken": {"symbol": "ETH", "address": "0x0000000000000000000000000000000000000000"},
    "preimageHash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925"
  }' | jq -r '.orderId')

echo "Order ID: $ORDER_ID"

# 3. Show HTLC details
echo -e "\n3. HTLC to fund:"
echo "Address: 2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF"
echo "Amount: 0.001 BTC (100,000 satoshis)"
echo ""
echo "Send testnet BTC to the address above, then continue..."
read -p "Press Enter after funding the HTLC: "

# 4. Get funding TX ID
read -p "Enter funding transaction ID: " TX_ID

# 5. Verify HTLC
echo -e "\n5. Verifying HTLC..."
curl -s -X POST $API_URL/htlc/verify \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"htlcAddress\": \"2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF\",
    \"redeemScript\": \"63a82066687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925882103789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fdac6704c0d82400b1752103789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fdac68\",
    \"fundingTxId\": \"$TX_ID\"
  }" | jq .

# 6. Check transaction status
echo -e "\n6. Transaction status:"
curl -s $API_URL/transactions/$TX_ID/status \
  -H "X-API-Key: $API_KEY" | jq .

# 7. View on explorer
echo -e "\n7. View on Blockstream:"
echo "https://blockstream.info/testnet/tx/$TX_ID"

echo -e "\n✅ Demo complete!"
```

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/health` | GET | Check service health |
| `/v1/orders` | POST | Create swap order |
| `/v1/orders/{id}` | GET | Get order details |
| `/v1/htlc/verify` | POST | Verify HTLC |
| `/v1/transactions/{txId}/status` | GET | Check transaction |
| `/v1/fees/estimate` | GET | Estimate fees |

## Troubleshooting

**API returns 401 Unauthorized**
- Include `X-API-Key` header with value `testnet-demo-key`

**Transaction not found**
- Wait 10-30 seconds for propagation
- Ensure you're on testnet

**Database errors**
- Run: `cargo sqlx migrate run`
- Delete `thunder_portal_testnet.db` and restart

**Can't get testnet BTC**
- Try: https://testnet-faucet.com/btc-testnet/
- Or: https://coinfaucet.eu/en/btc-testnet/

## Next Steps

1. Try BTC→ETH order flow
2. Test webhook notifications
3. Explore Swagger UI at http://localhost:3000/swagger-ui

## Resources

- Blockstream Testnet: https://blockstream.info/testnet/
- Bitcoin Testnet Faucet: https://bitcoinfaucet.uo1.net/
- API Documentation: http://localhost:3000/swagger-ui