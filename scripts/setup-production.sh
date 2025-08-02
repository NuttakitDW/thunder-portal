#!/bin/bash

# Thunder Portal Production Setup Script
# This script configures the environment for production deployment

set -e

echo "⚡ Thunder Portal Production Setup"
echo "=================================="

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    exit 1
fi

# Copy production env to .env
echo "📋 Setting up production environment..."
cp .env.production .env

# Update service configurations
echo "🔧 Updating service configurations..."

# Update resolver configuration
cat > resolver/config.production.js << EOF
module.exports = {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    chainId: parseInt(process.env.ETHEREUM_CHAIN_ID),
    contracts: {
      limitOrderProtocol: process.env.LIMIT_ORDER_PROTOCOL_ADDRESS,
      escrowFactory: process.env.SIMPLE_ESCROW_FACTORY_ADDRESS
    }
  },
  bitcoin: {
    network: process.env.BITCOIN_NETWORK,
    rpcUrl: process.env.BITCOIN_RPC_URL
  },
  services: {
    htlc: process.env.HTLC_SERVICE_URL,
    relayer: process.env.RELAYER_SERVICE_URL
  }
};
EOF

# Update relayer configuration
cat > relayer/config.production.js << EOF
module.exports = {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    wsUrl: process.env.ETHEREUM_RPC_URL.replace('https', 'wss'),
    contracts: {
      escrowFactory: process.env.SIMPLE_ESCROW_FACTORY_ADDRESS
    }
  },
  monitoring: {
    enabled: process.env.ENABLE_MONITORING === 'true',
    sentryDsn: process.env.SENTRY_DSN
  }
};
EOF

# Create production hardhat config
cat > hardhat.config.production.js << EOF
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.production" });

module.exports = {
  solidity: "0.8.23",
  networks: {
    sepolia: {
      url: process.env.ETHEREUM_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
EOF

echo "✅ Production configuration complete!"
echo ""
echo "🚀 To deploy to production:"
echo "1. Add your private key to .env.production (PRIVATE_KEY=...)"
echo "2. Run: npm run deploy:production"
echo ""
echo "📝 Production contracts:"
echo "- LimitOrderProtocol: 0xEa8CbF5175397686aE471f3f7e523279b927495d"
echo "- SimpleEscrowFactory: 0x182a69979dDAf5aD9406b1A3138bcAE484E41d06"
echo ""
echo "🌐 Network: Sepolia Testnet"
echo "🔗 RPC: https://sepolia.infura.io/v3/7979b6b00e674dfabafcea1aac484f66"