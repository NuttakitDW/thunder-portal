#!/bin/bash

# Thunder Portal CLI Demo Script for Hackathon Judges
# This script demonstrates the full atomic swap flow

echo "⚡ THUNDER PORTAL - Bitcoin ⟷ Ethereum Atomic Swaps Demo ⚡"
echo "============================================================"
echo ""
echo "This demo will showcase:"
echo "1. Beautiful CLI interface with Thunder branding"
echo "2. Real backend connection to Thunder Portal services"
echo "3. Order chunking into 100 pieces for partial fulfillment"
echo "4. Bitcoin claiming interface with wallet integration"
echo "5. Live transaction tracking"
echo ""
echo "Press Enter to start the demo..."
read

# Check if services are running
echo "Checking Thunder Portal services..."
if ! curl -s http://localhost:3002/health > /dev/null; then
    echo "❌ Thunder Portal resolver is not running!"
    echo "Please run: cd ../resolver && npm start"
    exit 1
fi

echo "✅ Services are running!"
echo ""

# Run the CLI in demo mode
echo "Starting Thunder Portal CLI in demo mode..."
echo "This will use test networks but real service connections."
echo ""

# Build if not already built
if [ ! -f "dist/cli.js" ]; then
    echo "Building Thunder CLI..."
    npm run build
fi

# Run the CLI
echo "Launching Thunder Portal..."
node dist/cli.js --demo

echo ""
echo "Demo completed!"
echo ""
echo "Key Features Demonstrated:"
echo "✅ Beautiful yellow thunder-themed UI"
echo "✅ Real backend integration (no fake data)"
echo "✅ Order chunking (100 chunks per order)"
echo "✅ Bitcoin claiming interface"
echo "✅ Live progress tracking"
echo ""
echo "Thunder Portal - Making cross-chain swaps as easy as lightning! ⚡"