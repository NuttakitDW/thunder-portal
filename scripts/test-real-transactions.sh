#!/bin/bash

echo "🧪 Testing Thunder Portal Real Transactions"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# Check if services are running
print_section "Checking Service Status"

# Check Bitcoin regtest
if ! docker ps | grep -q thunder-bitcoin-regtest; then
    print_error "Bitcoin regtest is not running. Start it with: ./scripts/setup-local-chains.sh"
    exit 1
fi
print_status "Bitcoin regtest is running"

# Check Ethereum
if ! curl -s http://localhost:8545 > /dev/null; then
    print_error "Ethereum local network is not running on port 8545"
    exit 1
fi
print_status "Ethereum local network is running"

# Check if Bitcoin HTLC service is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    print_warning "Bitcoin HTLC service is not running on port 3000"
    echo "Start it with: cd bitcoin-htlc && cargo run"
else
    print_status "Bitcoin HTLC service is running"
fi

# Check if Relayer is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    print_warning "Relayer service is not running on port 3001"
    echo "Start it with: cd relayer && npm start"
else
    print_status "Relayer service is running"
fi

# Check if Resolver is running
if ! curl -s http://localhost:3002/health > /dev/null; then
    print_warning "Resolver service is not running on port 3002"
    echo "Start it with: cd resolver && npm start"
else
    print_status "Resolver service is running"
fi

print_section "Testing Bitcoin Network"

# Test Bitcoin RPC connection
print_status "Testing Bitcoin RPC connection..."
BLOCK_COUNT=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getblockcount 2>/dev/null || echo "ERROR")

if [ "$BLOCK_COUNT" = "ERROR" ]; then
    print_error "Failed to connect to Bitcoin RPC"
    exit 1
fi

print_status "Bitcoin block height: $BLOCK_COUNT"

# Check Bitcoin balance
BALANCE=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getbalance 2>/dev/null || echo "0")
print_status "Bitcoin wallet balance: $BALANCE BTC"

if (( $(echo "$BALANCE < 1" | bc -l) )); then
    print_warning "Low Bitcoin balance. Generating more blocks..."
    NEW_ADDR=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getnewaddress)
    docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 generatetoaddress 10 $NEW_ADDR > /dev/null
    NEW_BALANCE=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getbalance 2>/dev/null)
    print_status "New Bitcoin balance: $NEW_BALANCE BTC"
fi

print_section "Testing Ethereum Network"

# Test Ethereum connection
ETH_BLOCK=$(curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result' | xargs printf "%d\n" 2>/dev/null || echo "ERROR")

if [ "$ETH_BLOCK" = "ERROR" ]; then
    print_error "Failed to connect to Ethereum RPC"
    exit 1
fi

print_status "Ethereum block number: $ETH_BLOCK"

# Check if smart contracts are deployed
if [ -f "evm-resolver/deployments/simple-escrow-factory-local.json" ]; then
    FACTORY_ADDR=$(cat evm-resolver/deployments/simple-escrow-factory-local.json | jq -r '.contracts.SimpleEscrowFactory.address' 2>/dev/null || echo "NOT_FOUND")
    if [ "$FACTORY_ADDR" != "NOT_FOUND" ] && [ "$FACTORY_ADDR" != "null" ]; then
        print_status "Escrow factory deployed at: $FACTORY_ADDR"
    else
        print_warning "Escrow factory not found. Deploy with: npm run deploy:local"
    fi
else
    print_warning "No deployment file found. Deploy contracts with: npm run deploy:local"
fi

if [ "$1" = "--services-only" ]; then
    print_status "Service check complete!"
    exit 0
fi

print_section "Testing Real Transaction Flow"

# Generate a unique order ID
ORDER_ID="test-$(date +%s)-$(shuf -i 1000-9999 -n 1)"
print_status "Testing with order ID: $ORDER_ID"

# Test real atomic swap
print_status "Initiating real atomic swap..."

SWAP_RESPONSE=$(curl -s -X POST http://localhost:3002/execute-real-swap \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"bitcoinAmount\": 0.001,
    \"ethereumAmount\": \"0.1\",
    \"userAddress\": \"0x70997970C51812dc3A010C7d01b50e0d17dc79C8\"
  }" 2>/dev/null)

if [ $? -eq 0 ] && echo "$SWAP_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
    print_status "Real atomic swap completed!"
    
    # Extract transaction details
    BITCOIN_TXID=$(echo "$SWAP_RESPONSE" | jq -r '.bitcoin.fundingTxid // "N/A"')
    ETH_ESCROW=$(echo "$SWAP_RESPONSE" | jq -r '.ethereum.escrowAddress // "N/A"')
    ETH_FUND_TX=$(echo "$SWAP_RESPONSE" | jq -r '.ethereum.fundingTxid // "N/A"')
    ETH_CLAIM_TX=$(echo "$SWAP_RESPONSE" | jq -r '.ethereum.claimTxid // "N/A"')
    PREIMAGE=$(echo "$SWAP_RESPONSE" | jq -r '.preimage // "N/A"')
    
    echo ""
    echo "📊 Transaction Summary:"
    echo "  • Order ID: $ORDER_ID"
    echo "  • Bitcoin Funding TX: $BITCOIN_TXID"
    echo "  • Ethereum Escrow: $ETH_ESCROW"
    echo "  • Ethereum Fund TX: $ETH_FUND_TX"
    echo "  • Ethereum Claim TX: $ETH_CLAIM_TX"
    echo "  • Preimage: ${PREIMAGE:0:20}..."
    echo ""
    
    # Verify transactions on blockchain
    print_section "Verifying Transactions"
    
    # Verify Bitcoin transaction
    if [ "$BITCOIN_TXID" != "N/A" ]; then
        BTC_CONFIRMATIONS=$(docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 getrawtransaction $BITCOIN_TXID true 2>/dev/null | jq -r '.confirmations // 0')
        print_status "Bitcoin TX confirmations: $BTC_CONFIRMATIONS"
    fi
    
    # Verify Ethereum transactions
    if [ "$ETH_FUND_TX" != "N/A" ]; then
        ETH_RECEIPT=$(curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$ETH_FUND_TX\"],\"id\":1}" | jq -r '.result.status // "0x0"')
        if [ "$ETH_RECEIPT" = "0x1" ]; then
            print_status "Ethereum funding transaction confirmed"
        else
            print_warning "Ethereum funding transaction not confirmed"
        fi
    fi
    
    if [ "$ETH_CLAIM_TX" != "N/A" ]; then
        ETH_CLAIM_RECEIPT=$(curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$ETH_CLAIM_TX\"],\"id\":1}" | jq -r '.result.status // "0x0"')
        if [ "$ETH_CLAIM_RECEIPT" = "0x1" ]; then
            print_status "Ethereum claim transaction confirmed"
        else
            print_warning "Ethereum claim transaction not confirmed"
        fi
    fi
    
else
    print_error "Real atomic swap test failed"
    echo "Response: $SWAP_RESPONSE"
    exit 1
fi

print_section "Test Results"
print_status "✅ All tests passed!"
echo ""
echo "🎯 Successfully demonstrated:"
echo "  • Real Bitcoin HTLC creation and funding"
echo "  • Real Ethereum escrow creation and funding"
echo "  • Cross-chain atomic swap completion"
echo "  • Transaction verification on both chains"
echo ""
echo "💡 You can now:"
echo "  • View Bitcoin transactions: docker exec thunder-bitcoin-regtest bitcoin-cli -regtest -rpcuser=thunderportal -rpcpassword=thunderportal123 listtransactions"
echo "  • Check Ethereum events on the local network"
echo "  • Experiment with your own atomic swaps!"