#!/bin/bash

# Load testnet environment and run swap
source .env.testnet
export NETWORK_MODE=testnet
export USE_REAL_TESTNET=true

echo "🔧 Testnet environment loaded"
echo "   NETWORK_MODE=$NETWORK_MODE"
echo "   BITCOIN_NETWORK=$BITCOIN_NETWORK"
echo "   ETHEREUM_NETWORK=$ETHEREUM_NETWORK"
echo ""

# Run the swap with testnet configuration
node scripts/swap-testnet-real.js