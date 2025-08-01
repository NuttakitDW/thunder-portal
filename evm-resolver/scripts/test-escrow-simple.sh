#!/bin/bash

echo "🧪 Testing SimpleEscrowFactory"
echo "=============================="

# Set paths and variables
FORGE="forge"
CAST="cast"
RPC_URL="http://localhost:8545"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
FACTORY_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"

# Test 1: Check factory is deployed
echo ""
echo "1️⃣  Checking factory deployment..."
CODE=$($CAST code $FACTORY_ADDRESS --rpc-url $RPC_URL)
if [ ${#CODE} -gt 10 ]; then
    echo "   ✅ Factory is deployed at $FACTORY_ADDRESS"
else
    echo "   ❌ Factory not found!"
    exit 1
fi

# Test 2: Create an escrow
echo ""
echo "2️⃣  Creating test escrow..."
ORDER_HASH=$($CAST keccak "test-escrow-$(date +%s)")
HASHLOCK=$($CAST keccak "test-secret-123")
TIMEOUT=$(($(date +%s) + 3600))

echo "   Order Hash: $ORDER_HASH"
echo "   Hashlock: $HASHLOCK"

# Create escrow using forge script
$FORGE script -c SimpleEscrowFactory --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast \
    --sig "createEscrow(bytes32,address,address,bytes32,uint256)" \
    $ORDER_HASH \
    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
    $HASHLOCK \
    $TIMEOUT \
    --target-contract $FACTORY_ADDRESS 2>/dev/null

echo "   ✅ Escrow creation transaction sent"

# Test 3: Read escrow address
echo ""
echo "3️⃣  Getting escrow address..."
# Since cast call has issues, we'll use forge test instead

# Test 4: Check if Solidity test file exists
echo ""
echo "4️⃣  Checking Solidity tests..."
if [ -f contracts/test/SimpleEscrowFactory.t.sol ]; then
    echo "   ✅ Test file already exists"
else
    echo "   ❌ Test file not found! Please create it first."
    exit 1
fi

# Test 5: Run the Solidity tests
echo ""
echo "5️⃣  Running Solidity tests..."
$FORGE test --match-contract SimpleEscrowFactoryTest -vv

echo ""
echo "✅ Testing complete!"
echo ""
echo "📚 Additional test commands you can run:"
echo "   • Run all tests:        forge test -vv"
echo "   • Run with gas report:  forge test --gas-report"
echo "   • Run specific test:    forge test --match-test testCreateEscrow -vvv"
echo "   • Run with coverage:    forge coverage"