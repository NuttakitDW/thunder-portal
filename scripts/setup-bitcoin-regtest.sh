#!/bin/bash

echo "🔧 Setting up Bitcoin regtest..."

# Wait for Bitcoin node to be ready
sleep 5

# Create test wallets
echo "Creating test wallets..."
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest createwallet "test_wallet"

# Generate some blocks to get coinbase maturity
echo "Generating initial blocks..."
ADDR=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest getnewaddress)
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest generatetoaddress 101 $ADDR

# Import test private key
echo "Importing test private key..."
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest importprivkey "cVj5kMEHS9hSCwNvSjAqaf3x4HmgDMYu3yqeRCaWHYuBBFqhJzxs"

# Generate more blocks to fund the test address
TEST_ADDR=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest getnewaddress)
docker exec thunder-bitcoin-regtest bitcoin-cli -regtest generatetoaddress 10 $TEST_ADDR

# Check balance
BALANCE=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest getbalance)
echo "✅ Bitcoin regtest ready! Balance: $BALANCE BTC"
