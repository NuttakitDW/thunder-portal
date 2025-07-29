#!/bin/bash
set -e

# Demo script for the new /v1/htlc/create endpoint
# This demonstrates creating HTLC scripts and addresses

API_URL="http://localhost:3000/v1"
API_KEY="testnet-demo-key"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 HTLC Create Endpoint Demo${NC}"
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

# 2. Create HTLC with full parameters
echo -e "\n${GREEN}2. Creating HTLC with resolver public key...${NC}"
HTLC_RESPONSE=$(curl -s -X POST $API_URL/htlc/create \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "preimage_hash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925",
    "user_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
    "timeout_blocks": 144,
    "resolver_public_key": "03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd"
  }')

echo "HTLC created successfully!"
echo "$HTLC_RESPONSE" | jq .

# Extract values
HTLC_ADDRESS=$(echo "$HTLC_RESPONSE" | jq -r '.htlc_address')
HTLC_SCRIPT=$(echo "$HTLC_RESPONSE" | jq -r '.htlc_script')
SCRIPT_HASH=$(echo "$HTLC_RESPONSE" | jq -r '.script_hash')
TIMEOUT_BLOCKS=$(echo "$HTLC_RESPONSE" | jq -r '.timeout_blocks')
TIMEOUT_TIMESTAMP=$(echo "$HTLC_RESPONSE" | jq -r '.estimated_timeout_timestamp')

# 3. Create HTLC without resolver (uses user key for both)
echo -e "\n${GREEN}3. Creating HTLC without resolver public key...${NC}"
SIMPLE_HTLC_RESPONSE=$(curl -s -X POST $API_URL/htlc/create \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "preimage_hash": "426c6f636b636861696e2069732061776573206f6d650000000000000000000",
    "user_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
    "timeout_blocks": 72
  }')

echo "Simple HTLC created successfully!"
echo "$SIMPLE_HTLC_RESPONSE" | jq .

# 4. Display summary
echo -e "\n${GREEN}4. HTLC Creation Summary${NC}"
echo "================================"
echo "Full HTLC Details:"
echo "  Address: $HTLC_ADDRESS"
echo "  Script: $HTLC_SCRIPT"
echo "  Script Hash: $SCRIPT_HASH"
echo "  Timeout: $TIMEOUT_BLOCKS blocks"
echo "  Estimated timeout: $(date -d @$TIMEOUT_TIMESTAMP 2>/dev/null || date -r $TIMEOUT_TIMESTAMP)"
echo ""
echo "The HTLC can be:"
echo "  - Funded by sending BTC to: $HTLC_ADDRESS"
echo "  - Claimed with the preimage corresponding to the hash"
echo "  - Refunded after the timeout period"
echo ""
echo -e "${YELLOW}Note:${NC} The preimage hash should be the SHA256 hash of your secret preimage"

# 5. Test error handling
echo -e "\n${GREEN}5. Testing error handling...${NC}"

# Invalid preimage hash
echo -e "\n${YELLOW}Testing invalid preimage hash:${NC}"
ERROR_RESPONSE=$(curl -s -X POST $API_URL/htlc/create \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "preimage_hash": "invalid_hash",
    "user_public_key": "02789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd",
    "timeout_blocks": 144
  }')
echo "$ERROR_RESPONSE" | jq .

# Invalid public key
echo -e "\n${YELLOW}Testing invalid public key:${NC}"
ERROR_RESPONSE=$(curl -s -X POST $API_URL/htlc/create \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "preimage_hash": "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925",
    "user_public_key": "invalid_pubkey",
    "timeout_blocks": 144
  }')
echo "$ERROR_RESPONSE" | jq .

echo -e "\n${BLUE}✅ Demo Complete!${NC}"