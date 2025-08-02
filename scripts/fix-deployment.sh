#!/bin/bash

# Fix script for stuck smart contract deployment
# Run this on the other device after services start

echo "⚡ Thunder Portal - Deployment Fix"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if services are running
echo -e "${YELLOW}Checking services...${NC}"
if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${RED}❌ Ethereum node is not running!${NC}"
    echo "Please start services first with: make start"
    exit 1
fi

if ! curl -s http://localhost:3000/v1/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Bitcoin HTLC API is not running!${NC}"
    echo "Please start services first with: make start"
    exit 1
fi

echo -e "${GREEN}✅ Services are running${NC}"

# Deploy contracts manually
echo -e "\n${YELLOW}Deploying smart contracts...${NC}"

# 1. Deploy WETH9 first (required for Limit Order Protocol)
echo -e "\n${YELLOW}1. Deploying WETH9...${NC}"
cd "$(dirname "$0")/.." || exit 1

cat > scripts/deploy-weth9.js << 'EOF'
const hre = require("hardhat");

async function main() {
    const WETH = await hre.ethers.getContractFactory("WETH9");
    const weth = await WETH.deploy();
    await weth.waitForDeployment();
    const address = await weth.getAddress();
    console.log("WETH9 deployed to:", address);
    return address;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
EOF

WETH_ADDRESS=$(npx hardhat run scripts/deploy-weth9.js --network localhost 2>&1 | grep "deployed to:" | awk '{print $NF}')
echo -e "${GREEN}✅ WETH9 deployed at: $WETH_ADDRESS${NC}"

# 2. Deploy Limit Order Protocol
echo -e "\n${YELLOW}2. Deploying 1inch Limit Order Protocol...${NC}"
npx hardhat run scripts/deploy-limit-order-protocol.js --network localhost
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Limit Order Protocol deployed successfully${NC}"
else
    echo -e "${RED}❌ Failed to deploy Limit Order Protocol${NC}"
fi

# 3. Deploy Simple Escrow Factory
echo -e "\n${YELLOW}3. Deploying Simple Escrow Factory...${NC}"
npx hardhat run scripts/deploy-simple-escrow-factory.js --network localhost
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Simple Escrow Factory deployed successfully${NC}"
else
    echo -e "${RED}❌ Failed to deploy Simple Escrow Factory${NC}"
fi

# 4. Deploy with Forge (if available)
echo -e "\n${YELLOW}4. Deploying Thunder Portal contracts...${NC}"
if command -v forge &> /dev/null; then
    cd evm-resolver && ./scripts/deploy-with-forge.sh
    cd ..
else
    echo -e "${YELLOW}⚠️  Forge not found, skipping Thunder Portal contracts${NC}"
fi

# 5. Restart services to pick up new contracts
echo -e "\n${YELLOW}Restarting services with new contracts...${NC}"
pkill -f "node.*relayer" 2>/dev/null || true
pkill -f "node.*resolver" 2>/dev/null || true
sleep 2

cd relayer && node index.js > ../logs/relayer.log 2>&1 &
cd ../resolver && node index.js > ../logs/resolver.log 2>&1 &
cd ..

sleep 3

# 6. Verify deployment
echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment fix complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

if [ -f "deployments/limit-order-protocol.json" ]; then
    LOP_ADDRESS=$(cat deployments/limit-order-protocol.json | grep -o '"limitOrderProtocol": "[^"]*"' | cut -d'"' -f4)
    echo -e "Limit Order Protocol: ${GREEN}$LOP_ADDRESS${NC}"
fi

if [ -f "deployments/simple-escrow-factory.json" ]; then
    SEF_ADDRESS=$(cat deployments/simple-escrow-factory.json | grep -o '"address": "[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "Simple Escrow Factory: ${GREEN}$SEF_ADDRESS${NC}"
fi

echo -e "\n${YELLOW}Services status:${NC}"
curl -s http://localhost:3001/health > /dev/null && echo -e "✅ Relayer: Running" || echo -e "❌ Relayer: Not running"
curl -s http://localhost:3002/health > /dev/null && echo -e "✅ Resolver: Running" || echo -e "❌ Resolver: Not running"

echo -e "\n${GREEN}Ready to run Thunder Portal!${NC}"