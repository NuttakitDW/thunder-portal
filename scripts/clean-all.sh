#!/bin/bash

echo "🧹 Cleaning Thunder Portal Environment"
echo "===================================="

# Stop any running services first
echo "Stopping services..."
./scripts/stop-dev.sh 2>/dev/null || true

# Remove Docker volumes and containers
echo "Removing Docker containers and volumes..."
docker-compose down -v 2>/dev/null || true
docker rm -f thunder-bitcoin-regtest 2>/dev/null || true
docker volume rm thunder-portal_bitcoin-data 2>/dev/null || true

# Kill any hanging Hardhat processes
echo "Killing any Hardhat processes..."
if [ -f .hardhat.pid ]; then
    PID=$(cat .hardhat.pid)
    kill -9 $PID 2>/dev/null || true
    rm .hardhat.pid
fi
# Also kill any node processes on port 8545
lsof -ti:8545 | xargs kill -9 2>/dev/null || true

# Remove all generated files and directories
echo "Removing generated files..."
rm -rf logs/
rm -rf data/
rm -rf cache/
rm -rf artifacts/
rm -rf typechain/
rm -rf typechain-types/
rm -f *.db
rm -f thunder_portal_local.db
rm -f .hardhat.pid

# Clean node modules cache (optional)
echo "Cleaning build artifacts..."
rm -rf .cache
rm -rf build/
rm -rf dist/

echo ""
echo "✅ Environment cleaned!"
echo ""
echo "You can now run 'npm start' for a fresh environment."