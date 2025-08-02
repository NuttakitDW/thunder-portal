#!/bin/bash

# Test deployment script
echo "Testing Thunder Portal deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test if services are running
echo -e "\n${YELLOW}1. Testing service connectivity...${NC}"
curl -s http://localhost:8545 > /dev/null && echo -e "✅ Ethereum: ${GREEN}Connected${NC}" || echo -e "❌ Ethereum: ${RED}Not running${NC}"
curl -s http://localhost:3000/v1/health > /dev/null && echo -e "✅ Bitcoin HTLC: ${GREEN}Connected${NC}" || echo -e "❌ Bitcoin HTLC: ${RED}Not running${NC}"

# Test contract compilation
echo -e "\n${YELLOW}2. Testing contract compilation...${NC}"
cd evm-resolver
npx hardhat compile
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Contracts compiled successfully${NC}"
else
    echo -e "${RED}❌ Contract compilation failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}Test complete!${NC}"