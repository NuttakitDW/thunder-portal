#!/bin/bash

echo "Thunder Portal Bitcoin HTLC Service Setup"
echo "========================================="
echo

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed!"
    echo "Please install Rust from https://rustup.rs/"
    exit 1
fi

echo "✅ Rust is installed"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration!"
else
    echo "✅ .env file exists"
fi

# Install SQLx CLI if not installed
if ! command -v sqlx &> /dev/null; then
    echo "📦 Installing sqlx-cli..."
    cargo install sqlx-cli --no-default-features --features sqlite
fi

# Create database
echo "🗄️  Setting up database..."
# Ensure data directory exists
mkdir -p data

# Clean up any existing database files
rm -f thunder_portal.db thunder_portal.db-shm thunder_portal.db-wal
rm -f data/thunder_portal_testnet.db data/thunder_portal_testnet.db-shm data/thunder_portal_testnet.db-wal

# Use the default development database path
export DATABASE_URL="sqlite:./thunder_portal.db"

# Create the database using SQLx
sqlx database create

# Run migrations
echo "🔄 Running database migrations..."
sqlx migrate run

# Generate SQLx offline data for builds on other machines
echo "📦 Preparing SQLx offline mode..."
cargo sqlx prepare --check || cargo sqlx prepare

# Build the project
echo "🔨 Building project..."
cargo build

# Generate example keys
echo
echo "🔑 Generating example Bitcoin keys for testing..."
cargo run --example generate_keys

echo
echo "✅ Setup complete!"
echo
echo "To start the service, run:"
echo "  cargo run"
echo
echo "Or for development with auto-reload:"
echo "  cargo install cargo-watch"
echo "  cargo watch -x run"
echo
echo "Test the service:"
echo "  curl http://localhost:3000/v1/health"
echo