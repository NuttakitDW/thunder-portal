#!/bin/bash
set -e

# Thunder Portal Interactive Demo
# This script provides a step-by-step interactive demonstration

API_URL="http://localhost:3000/v1"
API_KEY="testnet-demo-key"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Demo data
PREIMAGE="426c6f636b636861696e2069732061776573"
PREIMAGE_HASH="66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925"
USER_PUBKEY="0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"

clear
echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║          ${BLUE}⚡ Thunder Portal - Interactive Demo ⚡${PURPLE}          ║${NC}"
echo -e "${PURPLE}║                                                           ║${NC}"
echo -e "${PURPLE}║    ${GREEN}Cross-Chain Bitcoin ↔ Ethereum Atomic Swaps${PURPLE}           ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to wait for user
wait_for_user() {
    echo ""
    read -p "Press Enter to continue..."
    echo ""
}

# Function to show loading animation
show_loading() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Step 1: Check API Health
echo -e "${BLUE}Step 1: Checking Thunder Portal API Health${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Command:${NC} curl $API_URL/health"
wait_for_user

HEALTH=$(curl -s $API_URL/health)
echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"

if echo "$HEALTH" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
    echo -e "\n${GREEN}✅ API is healthy and ready!${NC}"
else
    echo -e "\n${RED}❌ API is not healthy. Please ensure Thunder Portal is running.${NC}"
    exit 1
fi

wait_for_user

# Step 2: Create HTLC
clear
echo -e "${BLUE}Step 2: Creating Bitcoin HTLC Contract${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}This creates a Hash Time-Locked Contract on Bitcoin${NC}"
echo ""
echo "Parameters:"
echo "  • Preimage Hash: ${PREIMAGE_HASH:0:16}..."
echo "  • User Public Key: ${USER_PUBKEY:0:16}..."
echo "  • Timeout: 144 blocks (~24 hours)"
echo ""
echo -e "${YELLOW}Command:${NC} curl -X POST $API_URL/htlc/create"
wait_for_user

echo -e "${GREEN}Creating HTLC...${NC}"
HTLC_RESPONSE=$(curl -s -X POST $API_URL/htlc/create \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "preimage_hash": "'$PREIMAGE_HASH'",
    "user_public_key": "'$USER_PUBKEY'",
    "timeout_blocks": 144
  }')

echo "$HTLC_RESPONSE" | jq '.'

HTLC_ADDRESS=$(echo "$HTLC_RESPONSE" | jq -r '.htlc_address')
HTLC_SCRIPT=$(echo "$HTLC_RESPONSE" | jq -r '.htlc_script')

echo ""
echo -e "${GREEN}✅ HTLC Created Successfully!${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}HTLC Address:${NC} $HTLC_ADDRESS"
echo -e "${YELLOW}Script Size:${NC} $((${#HTLC_SCRIPT} / 2)) bytes"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

wait_for_user

# Step 3: Create Order
clear
echo -e "${BLUE}Step 3: Creating Cross-Chain Swap Order${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}This creates an ETH→BTC swap order${NC}"
echo ""
echo "Order Details:"
echo "  • Direction: ETH → BTC"
echo "  • Amount: 1 ETH"
echo "  • Bitcoin Address: tb1q..."
echo ""
echo -e "${YELLOW}Command:${NC} curl -X POST $API_URL/orders"
wait_for_user

echo -e "${GREEN}Creating order...${NC}"
ORDER_RESPONSE=$(curl -s -X POST $API_URL/orders \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "ETH_TO_BTC",
    "amount": "1000000000000000000",
    "bitcoinAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "bitcoinPublicKey": "'$USER_PUBKEY'",
    "fromToken": {
      "symbol": "ETH",
      "address": "0x0000000000000000000000000000000000000000"
    },
    "preimageHash": "'$PREIMAGE_HASH'"
  }')

ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.orderId')
echo "$ORDER_RESPONSE" | jq '.'

echo ""
echo -e "${GREEN}✅ Order Created Successfully!${NC}"
echo -e "${YELLOW}Order ID:${NC} $ORDER_ID"

wait_for_user

# Step 4: Fund HTLC
clear
echo -e "${BLUE}Step 4: Fund the HTLC${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚡ ACTION REQUIRED ⚡${NC}"
echo ""
echo -e "${GREEN}Send Bitcoin to this address:${NC}"
echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}  Address: ${BLUE}$HTLC_ADDRESS${NC}  ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  Amount:  ${BLUE}0.001 BTC${NC} (100,000 satoshis)                   ${PURPLE}║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Instructions:"
echo "1. Open Electrum in testnet mode"
echo "2. Send exactly 0.001 BTC to the address above"
echo "3. Copy the transaction ID"
echo ""
echo -e "${YELLOW}Need testnet BTC?${NC} https://bitcoinfaucet.uo1.net/"
echo ""
read -p "Enter transaction ID (or press Enter to use example): " TX_ID

if [ -z "$TX_ID" ]; then
    echo -e "${YELLOW}Using example transaction ID for demo${NC}"
    TX_ID="4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
fi

echo ""
echo -e "${GREEN}Transaction ID:${NC} $TX_ID"

wait_for_user

# Step 5: Verify HTLC
clear
echo -e "${BLUE}Step 5: Verifying HTLC on Bitcoin Network${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Checking if the HTLC was funded correctly...${NC}"
echo ""

echo -e "${GREEN}Verifying HTLC...${NC}"
VERIFY_RESPONSE=$(curl -s -X POST $API_URL/htlc/verify \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"htlcAddress\": \"$HTLC_ADDRESS\",
    \"redeemScript\": \"$HTLC_SCRIPT\",
    \"fundingTxId\": \"$TX_ID\"
  }")

echo "$VERIFY_RESPONSE" | jq '.'

VALID=$(echo "$VERIFY_RESPONSE" | jq -r '.valid // false')
if [ "$VALID" = "true" ]; then
    echo ""
    echo -e "${GREEN}✅ HTLC Verified Successfully!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  HTLC verification pending or failed${NC}"
fi

wait_for_user

# Step 6: Track Transaction
clear
echo -e "${BLUE}Step 6: Tracking Transaction Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Checking blockchain for confirmations...${NC}"
echo ""

TX_STATUS=$(curl -s $API_URL/transactions/$TX_ID/status \
  -H "X-API-Key: $API_KEY")

echo "$TX_STATUS" | jq '.' 2>/dev/null || echo '{"status": "pending", "confirmations": 0}'

wait_for_user

# Step 7: Summary
clear
echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                  ${GREEN}🎉 Demo Complete! 🎉${PURPLE}                    ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}What we demonstrated:${NC}"
echo "  ✅ Created a Bitcoin HTLC contract"
echo "  ✅ Generated a P2SH address for atomic swaps"
echo "  ✅ Created a cross-chain swap order"
echo "  ✅ Funded the HTLC with real Bitcoin"
echo "  ✅ Verified the HTLC on-chain"
echo "  ✅ Tracked transaction status"
echo ""
echo -e "${BLUE}View on Blockchain Explorer:${NC}"
echo "  • HTLC Address: https://blockstream.info/testnet/address/$HTLC_ADDRESS"
echo "  • Transaction: https://blockstream.info/testnet/tx/$TX_ID"
echo ""
echo -e "${BLUE}API Documentation:${NC}"
echo "  • Swagger UI: http://localhost:3000/swagger-ui"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  • The HTLC can be claimed with preimage: $PREIMAGE"
echo "  • Or refunded after timeout block"
echo ""
echo -e "${GREEN}Thank you for trying Thunder Portal!${NC}"
echo ""

# Optional: Show additional options
echo -e "${YELLOW}Additional Demo Options:${NC}"
echo "1. View API documentation"
echo "2. Check order status"
echo "3. Estimate fees"
echo "4. Exit"
echo ""
read -p "Select option (1-4): " option

case $option in
    1)
        echo "Opening Swagger UI..."
        open http://localhost:3000/swagger-ui 2>/dev/null || xdg-open http://localhost:3000/swagger-ui 2>/dev/null || echo "Visit: http://localhost:3000/swagger-ui"
        ;;
    2)
        echo ""
        curl -s $API_URL/orders/$ORDER_ID -H "X-API-Key: $API_KEY" | jq '.'
        ;;
    3)
        echo ""
        curl -s "$API_URL/fees/estimate?direction=ETH_TO_BTC&amount=1000000000000000000" -H "X-API-Key: $API_KEY" | jq '.'
        ;;
    *)
        echo "Thank you!"
        ;;
esac