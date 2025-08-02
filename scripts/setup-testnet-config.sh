#!/bin/bash

# Thunder Portal Testnet Configuration Script
# Sets up all services for Bitcoin testnet3 and Ethereum Sepolia

set -e

echo "⚡ Thunder Portal Testnet Configuration"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Copy wallet configuration
echo -e "\n${YELLOW}1. Setting up wallet configuration...${NC}"
if [ -f "doc/testnet-wallets/.env.testnet" ]; then
    cp doc/testnet-wallets/.env.testnet .env.testnet
    echo -e "${GREEN}✅ Copied wallet configuration${NC}"
else
    echo -e "${RED}❌ Error: Wallet configuration not found${NC}"
    exit 1
fi

# Step 2: Create Bitcoin testnet3 configuration
echo -e "\n${YELLOW}2. Configuring Bitcoin testnet3...${NC}"
cat > .env.bitcoin-testnet <<EOF
# Bitcoin Testnet3 Configuration
BITCOIN_NETWORK=testnet3
BITCOIN_RPC_URL=https://bitcoin-testnet.public.blastapi.io
BITCOIN_RPC_USER=public
BITCOIN_RPC_PASSWORD=public
BITCOIN_API_URL=https://blockstream.info/testnet/api

# Alternative RPC endpoints (if primary fails):
# BITCOIN_RPC_URL=https://testnet.bitcoin.securerpc.com
# BITCOIN_RPC_URL=https://testnet.bitcoinrpc.com
EOF
echo -e "${GREEN}✅ Created Bitcoin testnet3 configuration${NC}"

# Step 3: Configure Bitcoin HTLC service
echo -e "\n${YELLOW}3. Configuring Bitcoin HTLC service...${NC}"
cd bitcoin-htlc

# Create .env file for Bitcoin HTLC service
cat > .env <<EOF
# Bitcoin HTLC Service Configuration
HOST=127.0.0.1
PORT=3000
DATABASE_URL=sqlite:data/thunder_portal_testnet.db

# Bitcoin Network
BITCOIN_NETWORK=testnet3
BITCOIN_RPC_URL=https://bitcoin-testnet.public.blastapi.io
BITCOIN_RPC_USER=public
BITCOIN_RPC_PASSWORD=public
BITCOIN_API_URL=https://blockstream.info/testnet/api

# Resolver wallet (from generated wallets)
RESOLVER_PUBLIC_KEY=03b96637177e2d6bc7c6869f7007945163665e667fbd6c812c065d1509d7f9c7a172
RESOLVER_PRIVATE_KEY=cMmu6yzZUQp1qnNwjTiYg37Wr9LcBpDj9eQJpUcisvyLVQWknEvJ

# API Configuration
API_KEY=testnet-demo-key-123
EOF

cd ..
echo -e "${GREEN}✅ Configured Bitcoin HTLC service${NC}"

# Step 4: Configure Resolver service
echo -e "\n${YELLOW}4. Configuring Resolver service...${NC}"
cd resolver

# Load testnet wallet addresses
source ../doc/testnet-wallets/.env.testnet

cat > .env <<EOF
# Resolver Service Configuration
PORT=3002

# Ethereum Configuration
ETH_RPC_URL=${ETH_SEPOLIA_RPC}
ETH_PRIVATE_KEY=${ETH_RESOLVER_PRIVATE_KEY}
ETH_RESOLVER_ADDRESS=${ETH_RESOLVER_ADDRESS}

# Bitcoin Configuration
BITCOIN_HTLC_API_URL=http://localhost:3000
BITCOIN_API_KEY=testnet-demo-key-123

# Contract Addresses (will be updated after deployment)
ESCROW_FACTORY_ADDRESS=
LIMIT_ORDER_PROTOCOL_ADDRESS=
EOF

cd ..
echo -e "${GREEN}✅ Configured Resolver service${NC}"

# Step 5: Configure Relayer service
echo -e "\n${YELLOW}5. Configuring Relayer service...${NC}"
cd relayer

cat > .env <<EOF
# Relayer Service Configuration
PORT=3001

# Ethereum Configuration
ETH_RPC_URL=${ETH_SEPOLIA_RPC}
ETH_PRIVATE_KEY=${ETH_RESOLVER_PRIVATE_KEY}

# Service URLs
RESOLVER_API_URL=http://localhost:3002
BITCOIN_HTLC_API_URL=http://localhost:3000

# API Keys
BITCOIN_API_KEY=testnet-demo-key-123
EOF

cd ..
echo -e "${GREEN}✅ Configured Relayer service${NC}"

# Step 6: Create testnet deployment script
echo -e "\n${YELLOW}6. Creating deployment scripts...${NC}"
cat > scripts/deploy-sepolia-contracts.js <<'EOF'
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying contracts to Sepolia testnet...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  // Deploy SimpleEscrowFactory
  console.log("\n📦 Deploying SimpleEscrowFactory...");
  const SimpleEscrowFactory = await hre.ethers.getContractFactory("SimpleEscrowFactory");
  const factory = await SimpleEscrowFactory.deploy();
  await factory.deployed();
  console.log("✅ SimpleEscrowFactory deployed to:", factory.address);
  
  // Save deployment info
  const deployments = {
    network: "sepolia",
    contracts: {
      SimpleEscrowFactory: {
        address: factory.address,
        deployedAt: new Date().toISOString()
      }
    }
  };
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, "sepolia-contracts.json"),
    JSON.stringify(deployments, null, 2)
  );
  
  console.log("\n✅ Deployment complete!");
  console.log("📄 Deployment info saved to deployments/sepolia-contracts.json");
  
  // Update service configurations
  console.log("\n🔧 Updating service configurations...");
  
  // Update resolver .env
  const resolverEnvPath = path.join(__dirname, "..", "resolver", ".env");
  let resolverEnv = fs.readFileSync(resolverEnvPath, "utf8");
  resolverEnv = resolverEnv.replace(
    /ESCROW_FACTORY_ADDRESS=.*/,
    `ESCROW_FACTORY_ADDRESS=${factory.address}`
  );
  fs.writeFileSync(resolverEnvPath, resolverEnv);
  
  console.log("✅ Updated resolver service configuration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
EOF

echo -e "${GREEN}✅ Created deployment scripts${NC}"

# Summary
echo -e "\n${GREEN}======================================"
echo -e "✅ Testnet Configuration Complete!"
echo -e "======================================${NC}"
echo -e "\nNext steps:"
echo -e "1. Deploy contracts: ${YELLOW}npx hardhat run scripts/deploy-sepolia-contracts.js --network sepolia${NC}"
echo -e "2. Start services: ${YELLOW}make start${NC}"
echo -e "3. Run testnet swap: ${YELLOW}make swap-testnet${NC}"
echo -e "\n${YELLOW}Note: Make sure you have the Sepolia network configured in hardhat.config.js${NC}"