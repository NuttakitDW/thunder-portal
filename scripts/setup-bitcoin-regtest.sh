#!/bin/bash

echo "⚡ Setting up Bitcoin Regtest for Thunder Portal"
echo "=============================================="

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Create data directory
mkdir -p data/bitcoin/regtest

# Stop existing container if running
print_status "Stopping existing Bitcoin regtest container..."
docker stop thunder-bitcoin-regtest 2>/dev/null || true
docker rm thunder-bitcoin-regtest 2>/dev/null || true

# Start Bitcoin regtest container
print_status "Starting Bitcoin regtest container..."
docker run -d \
  --name thunder-bitcoin-regtest \
  -p 18443:18443 \
  -p 18444:18444 \
  -v "$(pwd)/data/bitcoin:/home/bitcoin/.bitcoin" \
  ruimarinho/bitcoin-core:latest \
  -regtest \
  -server \
  -rpcuser=thunderportal \
  -rpcpassword=thunderportal123 \
  -rpcallowip=0.0.0.0/0 \
  -rpcbind=0.0.0.0 \
  -rpcport=18443 \
  -fallbackfee=0.00001 \
  -txindex \
  -deprecatedrpc=create_bdb

# Wait for Bitcoin to start
print_status "Waiting for Bitcoin Core to start..."
sleep 10

# Check if Bitcoin is running
if ! docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getblockcount > /dev/null 2>&1; then
    print_error "Bitcoin Core failed to start properly"
    docker logs thunder-bitcoin-regtest
    exit 1
fi

print_status "Bitcoin Core is running!"

# Create wallet
print_status "Creating test wallet..."
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 createwallet "test_wallet" false false "" false false 2>/dev/null || print_warning "Wallet already exists or using descriptor wallet"

# Generate initial blocks to fund the wallet
print_status "Generating initial blocks (this may take a moment)..."
ADDR=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getnewaddress)
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 generatetoaddress 101 $ADDR > /dev/null

# Import test private key for easy testing
TEST_PRIVKEY="cVj5kMEHS9hSCwNvSjAqaf3x4HmgDMYu3yqeRCaWHYuBBFqhJzxs"
TEST_ADDRESS="mkpZhYtJu2r87Js3pDiWJDmPte2NRZ8bJV"

print_status "Importing test private key..."
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 importprivkey $TEST_PRIVKEY "test" true 2>/dev/null || print_warning "Import skipped (descriptor wallet or already imported)"

# Generate blocks to test address
print_status "Funding test address..."
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 generatetoaddress 10 $TEST_ADDRESS > /dev/null

# Get balance
BALANCE=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getbalance)
BLOCK_COUNT=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getblockcount)

print_status "Bitcoin regtest setup complete!"
echo ""
echo "📊 Network Status:"
echo "  • RPC URL: http://localhost:18443"
echo "  • RPC User: thunderportal"
echo "  • RPC Password: thunderportal123"
echo "  • Block Height: $BLOCK_COUNT"
echo "  • Wallet Balance: $BALANCE BTC"
echo ""
echo "🔑 Test Credentials:"
echo "  • Private Key: $TEST_PRIVKEY"
echo "  • Address: $TEST_ADDRESS"
echo ""
echo "🔧 Useful Commands:"
echo "  • Check status: docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getblockchaininfo"
echo "  • Generate blocks: docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 generatetoaddress 1 $TEST_ADDRESS"
echo "  • Check balance: docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getbalance"
echo "  • View logs: docker logs thunder-bitcoin-regtest"
echo ""
echo "To stop: docker stop thunder-bitcoin-regtest"
