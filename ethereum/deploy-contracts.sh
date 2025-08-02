#!/bin/sh

echo "⚡ Deploying Thunder Portal Smart Contracts..."

# Wait for Hardhat to be ready
echo "Waiting for Hardhat node to be ready..."
while ! curl -s -X POST http://localhost:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; do
    echo "Waiting for Ethereum node..."
    sleep 2
done

echo "✅ Hardhat node is ready!"

# Deploy contracts
echo "1️⃣ Deploying 1inch Limit Order Protocol..."
npx hardhat run scripts/deploy-limit-order-protocol.js --network localhost

echo "2️⃣ Deploying Simple Escrow Factory..."
npx hardhat run scripts/deploy-simple-escrow-factory.js --network localhost

echo "✅ All contracts deployed successfully!"

# Keep container running
tail -f /dev/null