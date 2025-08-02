#!/bin/bash

echo "🚀 Starting Thunder Portal Development Environment"
echo "================================================"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use. Please stop the service using it."
        return 1
    fi
    return 0
}

# Check required ports
echo "Checking ports..."
check_port 8545 || exit 1
check_port 18443 || exit 1

# Create necessary directories
mkdir -p logs
mkdir -p data

# Start Bitcoin regtest
echo ""
echo "1️⃣  Starting Bitcoin regtest network..."
docker compose up -d bitcoin-regtest

# Wait for Bitcoin to be ready
echo "   Waiting for Bitcoin to start..."
sleep 5

# Setup Bitcoin wallets and funds
echo "   Setting up Bitcoin test wallets..."
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 createwallet "test_wallet" 2>/dev/null || true

# Generate blocks
echo "   Generating initial blocks..."
ADDR=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getnewaddress)
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 generatetoaddress 101 $ADDR > /dev/null

# Import test private key (skip if wallet doesn't support legacy commands)
echo "   Importing test private key..."
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 importprivkey "cVj5kMEHS9hSCwNvSjAqaf3x4HmgDMYu3yqeRCaWHYuBBFqhJzxs" "test" true 2>/dev/null || echo "   (Using descriptor wallet, import skipped)"

# Generate more blocks to fund test address
TEST_ADDR=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getnewaddress "test")
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 generatetoaddress 10 $TEST_ADDR > /dev/null

BALANCE=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getbalance)
echo "   ✅ Bitcoin ready! Balance: $BALANCE BTC"

# Start Hardhat fork
echo ""
echo "2️⃣  Starting Ethereum fork (Hardhat)..."

# Check if Hardhat is installed
if [ ! -d "node_modules/@nomicfoundation/hardhat-toolbox" ]; then
    echo "   Installing Hardhat dependencies..."
    npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
fi

# Start Hardhat in background
echo "   Starting Hardhat node..."
npx hardhat node > logs/hardhat.log 2>&1 &
HARDHAT_PID=$!
echo $HARDHAT_PID > .hardhat.pid

# Wait for Hardhat to be ready
sleep 5

# Test Ethereum connection
if curl -s -X POST http://localhost:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
    echo "   ✅ Ethereum fork ready!"
else
    echo "   ❌ Ethereum fork failed to start. Check logs/hardhat.log"
    exit 1
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    cp .env.example .env.local 2>/dev/null || cat > .env.local << 'EOF'
# Local Development Environment
ETHEREUM_RPC_URL=http://localhost:8545
BITCOIN_RPC_URL=http://localhost:18443
BITCOIN_RPC_USER=thunderportal
BITCOIN_RPC_PASSWORD=thunderportal123
DATABASE_URL=sqlite://thunder_portal_local.db
EOF
fi

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📊 Services Status:"
echo "   • Ethereum Fork: http://localhost:8545"
echo "   • Bitcoin Regtest: http://localhost:18443"
echo ""
echo "💰 Test Accounts (Ethereum):"
echo "   • Owner:    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10,000 ETH)"
echo "   • User:     0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10,000 ETH)"
echo "   • Resolver: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10,000 ETH)"
echo ""
echo "🔑 Test Account (Bitcoin):"
echo "   • Private Key: cVj5kMEHS9hSCwNvSjAqaf3x4HmgDMYu3yqeRCaWHYuBBFqhJzxs"
echo "   • Balance: ~50 BTC (regtest)"
echo ""
echo "📝 Logs:"
echo "   • Hardhat: logs/hardhat.log"
echo "   • Bitcoin: docker logs thunder-bitcoin-regtest"
echo ""
echo "To stop the environment: ./scripts/stop-dev.sh"