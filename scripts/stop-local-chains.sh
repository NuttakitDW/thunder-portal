#!/bin/bash

echo "🛑 Stopping Thunder Portal Local Chains"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Stop Bitcoin regtest
print_status "Stopping Bitcoin regtest..."
docker stop thunder-bitcoin-regtest 2>/dev/null || print_warning "Bitcoin container not running"
docker rm thunder-bitcoin-regtest 2>/dev/null || true

# Stop Hardhat
if [ -f ".hardhat.pid" ]; then
    print_status "Stopping Hardhat..."
    kill $(cat .hardhat.pid) 2>/dev/null || print_warning "Hardhat process not found"
    rm .hardhat.pid
fi

# Stop Anvil
if [ -f ".anvil.pid" ]; then
    print_status "Stopping Anvil..."
    kill $(cat .anvil.pid) 2>/dev/null || print_warning "Anvil process not found"
    rm .anvil.pid
fi

# Kill any remaining processes
pkill -f "anvil" 2>/dev/null || true
pkill -f "hardhat node" 2>/dev/null || true

# Stop Thunder Portal services if running
if [ -f ".services.pid" ]; then
    print_status "Stopping Thunder Portal services..."
    while read pid; do
        kill $pid 2>/dev/null || true
    done < .services.pid
    rm .services.pid
fi

print_status "All local blockchain services stopped!"

# Clean up log files if requested
if [ "$1" = "--clean" ]; then
    print_status "Cleaning up logs and temporary files..."
    rm -rf logs/*.log
    rm -f thunder_portal_local.db*
    print_status "Cleanup complete!"
fi

echo ""
echo "✅ Local blockchain environment stopped."
echo ""
echo "To restart: ./scripts/setup-local-chains.sh"