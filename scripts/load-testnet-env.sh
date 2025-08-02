#!/bin/bash

# Load testnet environment by default
# This script sets up environment variables for real testnet usage

set -a # Export all variables
source .env.testnet
set +a

echo "✅ Testnet environment loaded"
echo "   Bitcoin: testnet3"
echo "   Ethereum: Sepolia"
echo "   Mode: Real testnet transactions"