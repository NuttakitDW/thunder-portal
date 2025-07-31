#!/bin/bash

echo "🧪 Running CrossChainOrder Tests"
echo "================================"

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Forge not found. Please install Foundry:"
    echo "   curl -L https://foundry.paradigm.xyz | bash"
    echo "   foundryup"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "contracts/lib/forge-std" ]; then
    echo "📦 Installing Foundry dependencies..."
    forge install foundry-rs/forge-std --no-commit
fi

# Build contracts
echo ""
echo "🔨 Building contracts..."
forge build

# Run tests
echo ""
echo "🧪 Running tests..."
forge test -vvv --match-contract CrossChainOrderTest

echo ""
echo "✅ Tests complete!"