#!/bin/bash

echo "⚡ Setting up Anvil (Foundry) for Thunder Portal"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if foundry is installed
if ! command -v anvil &> /dev/null; then
    print_error "Anvil (Foundry) is not installed."
    echo "Install it with: curl -L https://foundry.paradigm.xyz | bash && source ~/.bashrc && foundryup"
    exit 1
fi

# Check if port 8545 is in use
if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null ; then
    print_warning "Port 8545 is already in use. Attempting to stop existing service..."
    # Try to kill existing hardhat/anvil processes
    pkill -f "anvil" || true
    pkill -f "hardhat node" || true
    sleep 2
fi

# Create logs directory
mkdir -p logs

# Start Anvil with predefined accounts for consistency
print_status "Starting Anvil local Ethereum network..."

# Using the same accounts as Hardhat for consistency
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --chain-id 31337 \
  --accounts 10 \
  --balance 10000 \
  --gas-limit 30000000 \
  --gas-price 1000000000 \
  --mnemonic "test test test test test test test test test test test junk" \
  --block-time 1 \
  --fork-block-number 19000000 > logs/anvil.log 2>&1 &

ANVIL_PID=$!
echo $ANVIL_PID > .anvil.pid

print_status "Waiting for Anvil to start..."
sleep 5

# Test Ethereum connection
if curl -s -X POST http://localhost:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
    print_status "Anvil is running!"
else
    print_error "Anvil failed to start. Check logs/anvil.log"
    exit 1
fi

# Get the current block number
BLOCK_NUMBER=$(curl -s -X POST http://localhost:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | \
    jq -r '.result' | xargs printf "%d\n")

print_status "Anvil setup complete!"
echo ""
echo "📊 Network Status:"
echo "  • RPC URL: http://localhost:8545" 
echo "  • Chain ID: 31337"
echo "  • Block Number: $BLOCK_NUMBER"
echo "  • Gas Limit: 30,000,000"
echo ""
echo "💰 Pre-funded Test Accounts:"
echo "  • Account 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10,000 ETH)"
echo "  • Account 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10,000 ETH)"
echo "  • Account 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10,000 ETH)"
echo ""
echo "🔑 Private Keys:"
echo "  • Account 0: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "  • Account 1: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
echo "  • Account 2: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
echo ""
echo "📝 Logs: logs/anvil.log"
echo "🛑 To stop: kill \$(cat .anvil.pid) && rm .anvil.pid"