#!/bin/bash

# Thunder Portal Demo - No Docker Required
# This runs the beautiful CLI demo without needing any services

echo "⚡ Thunder Portal - Demo Mode (No Docker Required)"
echo "=================================================="
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    exit 1
fi

# Go to CLI directory
cd thunder-cli

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build if needed
if [ ! -d "dist" ]; then
    echo "🔨 Building CLI..."
    npm run build
fi

# Run demo
echo ""
echo "🚀 Starting Thunder Portal Demo..."
echo ""
sleep 2

# Run the CLI in demo mode
npm start -- --demo