#!/bin/bash

echo "🚀 Deploying SimpleEscrowFactory with Forge..."
echo "============================================"

# Set paths
FORGE="/Users/nuttakit/.foundry/bin/forge"
CAST="/Users/nuttakit/.foundry/bin/cast"

# Set RPC URL
RPC_URL="http://localhost:8545"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# Deploy SimpleEscrowFactory
echo ""
echo "1️⃣  Deploying SimpleEscrowFactory..."
FACTORY_OUTPUT=$($FORGE create \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    contracts/src/SimpleEscrowFactory.sol:SimpleEscrowFactory \
    --broadcast \
    --json)

FACTORY_ADDRESS=$(echo $FACTORY_OUTPUT | jq -r '.deployedTo')
echo "   ✅ SimpleEscrowFactory deployed to: $FACTORY_ADDRESS"

# Create test escrow
echo ""
echo "2️⃣  Creating test escrow..."

# Generate test parameters
ORDER_HASH=$($CAST keccak "test-order-001")
HASHLOCK=$($CAST keccak "test-secret")
MAKER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
RECEIVER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
TIMEOUT=$(($(date +%s) + 86400)) # 24 hours from now

echo "   Order Hash: $ORDER_HASH"
echo "   Hashlock: $HASHLOCK"
echo "   Timeout: $(date -r $TIMEOUT)"

# Call createEscrow
TX_HASH=$($CAST send $FACTORY_ADDRESS \
    "createEscrow(bytes32,address,address,bytes32,uint256)" \
    $ORDER_HASH $MAKER $RECEIVER $HASHLOCK $TIMEOUT \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json | jq -r '.transactionHash')

echo "   📤 Transaction: $TX_HASH"

# Wait for transaction
$CAST receipt $TX_HASH --rpc-url $RPC_URL > /dev/null
echo "   ✅ Escrow created!"

# Get escrow address
ESCROW_ADDRESS=$($CAST call $FACTORY_ADDRESS \
    "getEscrow(bytes32)(address)" \
    $ORDER_HASH \
    --rpc-url $RPC_URL)

echo "   📍 Escrow address: $ESCROW_ADDRESS"

# Create HTLC
echo ""
echo "3️⃣  Creating HTLC in escrow..."

HTLC_TX=$($CAST send $ESCROW_ADDRESS \
    "createHTLC()" \
    --value 0.1ether \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json | jq -r '.transactionHash')

echo "   📤 HTLC Transaction: $HTLC_TX"
$CAST receipt $HTLC_TX --rpc-url $RPC_URL > /dev/null
echo "   ✅ HTLC created with 0.1 ETH!"

# Get status
echo ""
echo "4️⃣  Checking escrow status..."
STATUS=$($CAST call $ESCROW_ADDRESS \
    "getStatus()(bool,uint256,uint256,bool)" \
    --rpc-url $RPC_URL)

echo "   📊 Escrow status: $STATUS"

# Save deployment info
echo ""
echo "💾 Saving deployment info..."
mkdir -p deployments

cat > deployments/simple-escrow-factory-local.json << EOF
{
  "network": "hardhat-local",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "SimpleEscrowFactory": {
      "address": "$FACTORY_ADDRESS"
    },
    "TestEscrow": {
      "orderHash": "$ORDER_HASH",
      "address": "$ESCROW_ADDRESS",
      "htlcHashlock": "$HASHLOCK",
      "htlcTimeout": $TIMEOUT
    }
  }
}
EOF

echo "   ✅ Deployment info saved to deployments/simple-escrow-factory-local.json"
echo ""
echo "✨ Deployment complete!"
echo ""
echo "📄 Contract Details:"
echo "   EscrowFactory: $FACTORY_ADDRESS"
echo "   Test Escrow: $ESCROW_ADDRESS"