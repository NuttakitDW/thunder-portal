# Thunder Portal Demo Makefile
# Simplifies demo setup and execution

.PHONY: setup start demo clean restart help all

# Default target
all: help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Show available commands
help:
	@echo "$(GREEN)⚡ Thunder Portal Commands:$(NC)"
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  make thunder  - One-command setup + start + CLI demo"
	@echo ""
	@echo "$(CYAN)Basic Commands:$(NC)"
	@echo "  make setup    - Install all dependencies"
	@echo "  make start    - Start all services (Bitcoin, Ethereum, Backend)"
	@echo "  make stop     - Stop all services"
	@echo "  make clean    - Clean everything and reset"
	@echo "  make restart  - Stop, clean, and start fresh"
	@echo ""
	@echo "$(CYAN)Thunder CLI:$(NC)"
	@echo "  make cli      - Run Thunder CLI (production mode)"
	@echo "  make cli-demo - Run Thunder CLI in demo mode"
	@echo "  make cli-judge - Special demo for hackathon judges"
	@echo ""
	@echo "$(CYAN)Testing:$(NC)"
	@echo "  make test-contracts - Test smart contracts"
	@echo "  make test-swap - Test complete swap flow"
	@echo ""
	@echo "$(YELLOW)Recommended: make thunder$(NC)"

# Setup dependencies and environment
setup:
	@echo "$(YELLOW)📦 Setting up Thunder Portal environment...$(NC)"
	@echo "1️⃣  Installing Node dependencies..."
	@cd evm-resolver && npm install
	@cd relayer && npm install
	@cd resolver && npm install
	@cd thunder-cli && npm install
	@echo "2️⃣  Building Bitcoin HTLC service..."
	@cd bitcoin-htlc && cargo build --release
	@echo "3️⃣  Building Thunder CLI..."
	@cd thunder-cli && npm run build
	@echo "4️⃣  Creating necessary directories..."
	@mkdir -p logs data/bitcoin/regtest
	@echo "$(GREEN)✅ Setup complete!$(NC)"

# Start all services
start:
	@echo "$(YELLOW)🚀 Starting Thunder Portal services...$(NC)"
	@./demo/start-full-demo.sh
	@sleep 5
	@echo ""
	@echo "$(YELLOW)📜 Deploying smart contracts...$(NC)"
	@echo "1️⃣  Deploying 1inch Limit Order Protocol..."
	@npx hardhat run scripts/deploy-limit-order-protocol.js --network localhost 2>&1 | grep -E "(deployed to:|✅)" || true
	@echo "2️⃣  Deploying SimpleEscrowFactory contract..."
	@npx hardhat run scripts/deploy-simple-escrow-factory.js --network localhost 2>&1 | grep -E "(deployed to:|✅)" || true
	@echo "3️⃣  Deploying Thunder Portal contracts..."
	@cd evm-resolver && ./scripts/deploy-with-forge.sh 2>&1 | grep -E "(deployed to:|✅)" || true
	@echo ""
	@echo "$(YELLOW)🔄 Restarting services with new contract...$(NC)"
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3002 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@cd relayer && node index.js > ../logs/relayer.log 2>&1 &
	@cd resolver && node index.js > ../logs/resolver.log 2>&1 &
	@sleep 3
	@echo ""
	@# Check if all services are actually running
	@# Wait a moment for resolver to restart
	@sleep 2
	@if curl -s http://localhost:3000/v1/health > /dev/null 2>&1 && \
	    curl -s http://localhost:3001/health > /dev/null 2>&1 && \
	    curl -s http://localhost:3002/health > /dev/null 2>&1 && \
	    curl -s http://localhost:8545 > /dev/null 2>&1; then \
		echo "$(GREEN)════════════════════════════════════════════════════════════$(NC)"; \
		echo "$(GREEN)✅ Thunder Portal is ready!$(NC)"; \
		echo "$(GREEN)════════════════════════════════════════════════════════════$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Contracts deployed:$(NC)"; \
		echo "  • Limit Order Protocol: $(GREEN)$$(cat deployments/limit-order-protocol.json 2>/dev/null | jq -r '.limitOrderProtocol' || echo "Check deployment")$(NC)"; \
		echo "  • Simple Escrow Factory: $(GREEN)$$(cat deployments/simple-escrow-factory.json 2>/dev/null | jq -r '.contracts.SimpleEscrowFactory.address' || echo "Check deployment")$(NC)"; \
		echo "  • Cross-Chain Factory:   $(GREEN)$$(cat evm-resolver/deployments/simple-escrow-factory-local.json 2>/dev/null | grep -o '"address": "[^"]*"' | head -1 | cut -d'"' -f4 || echo "Check deployment")$(NC)"; \
		echo ""; \
		echo "$(YELLOW)To run the demo:$(NC)"; \
		echo "  $(GREEN)make demo$(NC) - Simulated demo with partial fulfillment"; \
		echo "  $(GREEN)make demo-real$(NC) - Real blockchain demo with 1inch integration"; \
	else \
		echo "$(RED)════════════════════════════════════════════════════════════$(NC)"; \
		echo "$(RED)❌ Some services failed to start!$(NC)"; \
		echo "$(RED)════════════════════════════════════════════════════════════$(NC)"; \
		echo ""; \
		make status; \
		echo ""; \
		echo "$(YELLOW)Troubleshooting:$(NC)"; \
		echo "  1. Check logs: $(GREEN)make logs$(NC)"; \
		echo "  2. Try restarting: $(GREEN)make restart$(NC)"; \
		echo "  3. Check Bitcoin HTLC build: $(GREEN)cd bitcoin-htlc && cargo build --release$(NC)"; \
		exit 1; \
	fi

# Run the atomic swap demo (simulated with partial fulfillment)
demo:
	@echo "$(YELLOW)⚡ Running Thunder Portal Atomic Swap Demo...$(NC)"
	@./demo/atomic-swap-demo.sh

# Run the real atomic swap demo with actual blockchain transactions and 1inch Limit Order Protocol
demo-real:
	@echo "$(YELLOW)⚡ Running Thunder Portal REAL Atomic Swap Demo with 1inch Integration...$(NC)"
	@./demo/real-atomic-swap-demo.sh

# Stop all services and clean up
clean:
	@echo "$(YELLOW)🧹 Deep cleaning Thunder Portal...$(NC)"
	@echo "1️⃣  Stopping all services..."
	@./demo/stop-all-services.sh 2>/dev/null || true
	@pkill -f "node.*relayer" 2>/dev/null || true
	@pkill -f "node.*resolver" 2>/dev/null || true
	@pkill -f "hardhat node" 2>/dev/null || true
	@pkill -f "thunder-portal" 2>/dev/null || true
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3002 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8545 | xargs kill -9 2>/dev/null || true
	@echo "2️⃣  Stopping Docker containers..."
	@docker-compose down -v 2>/dev/null || true
	@docker rm -f thunder-bitcoin-regtest 2>/dev/null || true
	@echo "3️⃣  Removing old data..."
	@rm -rf data/bitcoin/regtest/* 2>/dev/null || true
	@rm -rf logs/*.log 2>/dev/null || true
	@rm -rf evm-resolver/cache 2>/dev/null || true
	@rm -rf evm-resolver/dist 2>/dev/null || true
	@rm -rf evm-resolver/deployments/*.json 2>/dev/null || true
	@rm -rf deployments/*.json 2>/dev/null || true
	@rm -rf bitcoin-htlc/data/*.db 2>/dev/null || true
	@rm -f relayer/index.js.bak 2>/dev/null || true
	@echo "4️⃣  Cleaning build artifacts..."
	@cd bitcoin-htlc && cargo clean 2>/dev/null || true
	@echo "$(GREEN)✅ Deep clean complete! Fresh start ready.$(NC)"

# Restart everything fresh
restart: clean start
	@echo "$(GREEN)✅ Fresh restart complete!$(NC)"

# Development helpers
logs:
	@tail -f logs/*.log

status:
	@echo "$(YELLOW)📊 Service Status:$(NC)"
	@curl -s http://localhost:3000/v1/health > /dev/null && echo "✅ Bitcoin HTLC API: Running" || echo "❌ Bitcoin HTLC API: Not running"
	@curl -s http://localhost:3001/health > /dev/null && echo "✅ Relayer: Running" || echo "❌ Relayer: Not running"
	@curl -s http://localhost:3002/health > /dev/null && echo "✅ Resolver: Running" || echo "❌ Resolver: Not running"
	@curl -s http://localhost:8545 > /dev/null && echo "✅ Ethereum: Running" || echo "❌ Ethereum: Not running"
	@curl -s --user thunderportal:thunderportal123 http://127.0.0.1:18443/ -X POST -d '{"method":"getblockchaininfo"}' > /dev/null 2>&1 && echo "✅ Bitcoin: Running" || echo "❌ Bitcoin: Not running"

# Test individual components
test-bitcoin:
	@echo "$(YELLOW)Testing Bitcoin HTLC API...$(NC)"
	@curl -s -H "X-API-Key: demo-key-123" http://localhost:3000/v1/health | jq '.'

test-contracts:
	@echo "$(YELLOW)Testing smart contracts...$(NC)"
	@cd evm-resolver && forge test -vv

# Thunder CLI build command
cli-build:
	@echo "$(YELLOW)Building Thunder Portal CLI...$(NC)"
	@cd thunder-cli && npm install && npm run build

cli-install:
	@echo "$(YELLOW)Installing Thunder Portal CLI globally...$(NC)"
	@cd thunder-cli && npm install -g .

test-complete-swap:
	@echo "$(YELLOW)Testing complete atomic swap functionality...$(NC)"
	@node scripts/test-complete-swap.js

# Thunder CLI commands
cli: cli-build
	@echo "$(YELLOW)⚡ Starting Thunder Portal CLI...$(NC)"
	@echo "Make sure services are running with: make start"
	@cd thunder-cli && node dist/cli.js

cli-demo: cli-build
	@echo "$(YELLOW)⚡ Starting Thunder Portal CLI in demo mode...$(NC)"
	@echo "$(GREEN)Demo mode uses test networks but real service connections$(NC)"
	@cd thunder-cli && node dist/cli.js --demo

cli-judge: cli-build
	@echo "$(YELLOW)⚡ Running Thunder Portal CLI Demo for Judges...$(NC)"
	@cd thunder-cli && ./demo-judge.sh

# Quick command to start everything and run CLI
thunder: setup start
	@echo "$(YELLOW)⚡ Thunder Portal is ready!$(NC)"
	@echo "Starting CLI in 5 seconds..."
	@sleep 5
	@make cli-demo

