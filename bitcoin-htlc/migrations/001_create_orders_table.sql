-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY NOT NULL,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    preimage_hash TEXT NOT NULL,
    
    -- Bitcoin fields
    bitcoin_amount INTEGER,
    bitcoin_address TEXT,
    bitcoin_public_key TEXT,
    
    -- Ethereum fields
    ethereum_address TEXT,
    
    -- Resolver configuration
    resolver_public_key TEXT NOT NULL,
    
    -- Timeouts and confirmations
    bitcoin_timeout_blocks INTEGER NOT NULL,
    ethereum_timeout_blocks INTEGER NOT NULL,
    bitcoin_confirmations_required INTEGER NOT NULL,
    ethereum_confirmations_required INTEGER NOT NULL,
    
    -- Fusion+ order details
    fusion_order_id TEXT,
    fusion_order_hash TEXT,
    
    -- HTLC details
    htlc_id TEXT,
    htlc_address TEXT,
    htlc_redeem_script TEXT,
    htlc_funding_tx TEXT,
    
    -- Timestamps
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

-- Create indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_expires_at ON orders(expires_at);
CREATE INDEX idx_orders_htlc_id ON orders(htlc_id);