.PHONY: help build run test clean setup docker-build docker-run docker-stop

# Default target
help:
	@echo "Thunder Portal Bitcoin HTLC Service"
	@echo "=================================="
	@echo ""
	@echo "Available commands:"
	@echo "  make setup        - Initial setup (install deps, create DB, run migrations)"
	@echo "  make build        - Build the Rust project"
	@echo "  make run          - Run the service locally"
	@echo "  make test         - Run all tests"
	@echo "  make logs         - Run tests with log capture and analysis"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run with Docker Compose"
	@echo "  make docker-stop  - Stop Docker containers"
	@echo "  make keys         - Generate Bitcoin keypair"

# Setup development environment
setup:
	@echo "Setting up Thunder Portal..."
	@./setup.sh

# Build the project
build:
	@if [ -d ".sqlx" ] && [ "$$(ls -A .sqlx)" ]; then \
		echo "Building with SQLx offline mode..."; \
		export DATABASE_URL="sqlite:./thunder_portal.db"; \
		cargo build --release; \
	else \
		echo "No SQLx cache found. Running setup first..."; \
		./setup.sh && cargo build --release; \
	fi

# Run the service
run:
	cargo run

# Run in development mode with auto-reload
dev:
	cargo install cargo-watch
	cargo watch -x run

# Run all tests
test:
	cargo test -- --nocapture

# Run specific test
test-one:
	cargo test $(TEST) -- --nocapture

# Run tests and capture logs for verification
logs:
	@echo "Running tests and capturing logs..."
	@mkdir -p logs
	@cargo test -- --nocapture 2>&1 | tee logs/test_output.log
	@echo ""
	@echo "Extracting relevant logs..."
	@grep -E "(HTLC|htlc|atomic|swap|lock|hash|timelock|claim|refund|ERROR|WARN|FAIL)" logs/test_output.log > logs/htlc_specific.log || true
	@grep -E "test result:|passed|failed|error" logs/test_output.log > logs/test_results.log || true
	@echo ""
	@echo "Logs saved to:"
	@echo "  - logs/test_output.log    (full output)"
	@echo "  - logs/htlc_specific.log  (HTLC-related logs)"
	@echo "  - logs/test_results.log   (test results summary)"
	@echo ""
	@echo "Test Summary:"
	@tail -n 5 logs/test_results.log || echo "No test results found"

# Clean build artifacts
clean:
	cargo clean
	rm -f thunder_portal.db
	rm -rf logs/

# Generate Bitcoin keys
keys:
	cargo run --example generate_keys

# Docker commands
docker-build:
	docker-compose build

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Database commands
db-reset:
	rm -f thunder_portal.db
	sqlx database create
	sqlx migrate run

# Quick API tests
test-api:
	@echo "Testing health endpoint..."
	@curl -s http://localhost:3000/v1/health | jq .
	@echo ""
	@echo "Creating test order..."
	@curl -s -X POST http://localhost:3000/v1/orders \
		-H "Content-Type: application/json" \
		-d '{"direction":"ETH_TO_BTC","bitcoin_amount":100000,"bitcoin_address":"tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx","bitcoin_public_key":"03789ed0bb717d88f7d321a368d905e7430207ebbd82bd342cf11ae157a7ace5fd","preimage_hash":"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"}' \
		| jq .