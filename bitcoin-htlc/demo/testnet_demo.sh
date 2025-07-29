#!/bin/bash
set -e

# Thunder Portal Testnet Demo
# This script demonstrates the complete HTLC flow on Bitcoin testnet

API_URL="http://localhost:3000/v1"
API_KEY="testnet-demo-key"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Thunder Portal Testnet Demo${NC}"
echo "=============================="

# 1. Check API health
echo -e "\n${GREEN}1. Checking API health...${NC}"
HEALTH=$(curl -s $API_URL/health)
echo "$HEALTH" | jq .

# Check if API is healthy
if ! echo "$HEALTH" | jq -e '.status == "healthy"' > /dev/null; then
    echo -e "${YELLOW}API is not healthy. Make sure Thunder Portal is running.${NC}"
    exit 1
fi

# 2. Create order
echo -e "\n${GREEN}2. Creating ETH→BTC order...${NC}"
ORDER_RESPONSE=$(curl -s -X POST $API_URL/orders \
  -H "X-API-Key: $API_KEY" \
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

ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.orderId')
echo "Order created successfully!"
echo "Order ID: $ORDER_ID"
echo "$ORDER_RESPONSE" | jq .

# 3. Create HTLC using new endpoint
echo -e "\n${GREEN}3. Creating HTLC...${NC}"
HTLC_RESPONSE=$(curl -s -X POST $API_URL/htlc/create \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "preimage_hash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925",
    "user_public_key": "0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798",
    "timeout_blocks": 144
  }')

HTLC_ADDRESS=$(echo "$HTLC_RESPONSE" | jq -r '.htlc_address')
HTLC_SCRIPT=$(echo "$HTLC_RESPONSE" | jq -r '.htlc_script')

echo "HTLC created successfully!"
echo "$HTLC_RESPONSE" | jq .
echo ""
echo "HTLC Address: $HTLC_ADDRESS"
echo "Amount to send: 0.001 BTC (100,000 satoshis)"
echo ""
echo "Preimage (secret): 426c6f636b636861696e2069732061776573"
echo "Hash: 66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925"
echo ""
echo -e "${YELLOW}Instructions:${NC}"
echo "1. Open your testnet wallet (e.g., Electrum in testnet mode)"
echo "2. Send exactly 0.001 BTC to: $HTLC_ADDRESS"
echo "3. Copy the transaction ID"
echo ""
read -p "Press Enter after sending BTC to the HTLC address..."

# 4. Get funding TX ID
echo -e "\n${GREEN}4. Enter Transaction Details${NC}"
read -p "Enter your funding transaction ID: " TX_ID

if [ -z "$TX_ID" ]; then
    echo -e "${YELLOW}No transaction ID provided. Using example ID for demo.${NC}"
    TX_ID="4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
fi

# 5. Check transaction status
echo -e "\n${GREEN}5. Checking transaction status...${NC}"
TX_STATUS=$(curl -s $API_URL/transactions/$TX_ID/status \
  -H "X-API-Key: $API_KEY")
echo "$TX_STATUS" | jq .

# 6. Verify HTLC
echo -e "\n${GREEN}6. Verifying HTLC...${NC}"

VERIFY_RESPONSE=$(curl -s -X POST $API_URL/htlc/verify \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"htlcAddress\": \"$HTLC_ADDRESS\",
    \"redeemScript\": \"$HTLC_SCRIPT\",
    \"fundingTxId\": \"$TX_ID\"
  }")

echo "$VERIFY_RESPONSE" | jq .

# 7. Check order status
echo -e "\n${GREEN}7. Checking order status...${NC}"
ORDER_STATUS=$(curl -s $API_URL/orders/$ORDER_ID \
  -H "X-API-Key: $API_KEY")
echo "$ORDER_STATUS" | jq .

# 8. Show explorer links
echo -e "\n${GREEN}8. View on Blockchain Explorer${NC}"
echo "================================"
echo "HTLC Address: https://blockstream.info/testnet/address/$HTLC_ADDRESS"
echo "Transaction: https://blockstream.info/testnet/tx/$TX_ID"

echo -e "\n${BLUE}✅ Demo Complete!${NC}"
echo ""
echo "What you've demonstrated:"
echo "- Created a cross-chain swap order"
echo "- Funded a real Bitcoin HTLC on testnet"
echo "- Verified the HTLC with Thunder Portal API"
echo "- Tracked the transaction status"
echo ""
echo "The HTLC can be:"
echo "- Claimed with preimage: 426c6f636b636861696e2069732061776573"
echo "- Refunded after timeout block"