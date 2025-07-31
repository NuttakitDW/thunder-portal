#!/bin/bash

echo "🛑 Stopping Thunder Portal Development Environment"
echo "================================================"

# Stop Hardhat
if [ -f .hardhat.pid ]; then
    PID=$(cat .hardhat.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Stopping Hardhat (PID: $PID)..."
        kill $PID
        sleep 2
    fi
    rm .hardhat.pid
fi

# Stop Docker containers
echo "Stopping Bitcoin regtest..."
docker-compose down

echo ""
echo "✅ Development environment stopped"
echo ""
echo "To restart: ./scripts/start-dev.sh"