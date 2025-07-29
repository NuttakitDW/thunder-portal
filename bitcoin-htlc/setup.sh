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
touch thunder_portal.db

# Run migrations
echo "🔄 Running database migrations..."
sqlx migrate run

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