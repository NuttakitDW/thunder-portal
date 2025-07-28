# Thunder Portal Project Structure

## Directory Layout

```
thunder-portal/
├── README.md                    # Main project documentation
├── api/
│   ├── cross-chain-swap-api.yaml  # Main Cross-Chain Swap API spec
│   └── bitcoin-htlc-api.yaml      # Bitcoin HTLC API spec
├── Makefile                    # Build commands
├── .gitignore                  # Git ignore rules
│
├── docs/                       # All documentation
│   ├── PROJECT-STRUCTURE.md    # This file
│   ├── api/
│   │   ├── api-spec-criteria.md           # API completeness checklist
│   │   └── backend-implementation-checklist.md  # Implementation tasks
│   ├── architecture/
│   │   └── system-architecture.md         # System design and flow
│   ├── implementation/
│   │   └── bitcoin-htlc-implementation.md # Rust implementation guide
│   ├── planning/
│   │   └── realistic-winning-strategy.md  # 6-day hackathon plan
│   └── reference/
│       └── (external references)
│
├── src/                        # TypeScript/Node.js source code
│   ├── bitcoin-api/           # Bitcoin HTLC service
│   ├── resolver/              # 1inch Fusion+ resolver
│   └── shared/                # Shared utilities and types
│
├── tests/                      # Test suites
│   ├── unit/                  # Unit tests
│   └── integration/           # Integration tests
│
├── config/                     # Configuration files
│
├── scripts/                    # Utility scripts
│   ├── setup.sh               # Development setup
│   └── demo.sh                # Demo helper scripts
│
└── bitcoin-htlc/               # Alternative: Rust backend service
    ├── Cargo.toml
    ├── src/
    │   ├── main.rs
    │   ├── api/              # API endpoints
    │   ├── bitcoin/          # Bitcoin integration
    │   ├── ethereum/         # Ethereum integration
    │   ├── models/           # Data models
    │   └── db/              # Database layer
    └── tests/
```

## Key Files

### API Specifications
- `api/cross-chain-swap-api.yaml` - Main Cross-Chain Swap API specification
- `api/bitcoin-htlc-api.yaml` - Bitcoin HTLC service API specification

### Documentation
- `docs/api/backend-implementation-checklist.md` - Step-by-step implementation guide
- `docs/architecture/system-architecture.md` - Technical architecture
- `docs/planning/realistic-winning-strategy.md` - 6-day development plan

### Implementation (To Be Created)
- `bitcoin-htlc/` - Rust backend service implementing the API

## Development Workflow

1. **API First** - OpenAPI specs in api/ directory are the source of truth
2. **Documentation** - All docs in organized folders
3. **Implementation** - Rust service in bitcoin-htlc/
4. **Testing** - Comprehensive test coverage

## What We Removed

- ❌ UI endpoints from API spec (keep backend focused)
- ❌ Stretch goal specs (partial fills, multi-resolver)
- ❌ Outdated planning documents
- ❌ Duplicate files

## Next Steps

1. Start Rust project in `bitcoin-htlc/`
2. Implement endpoints following the checklist
3. Test on Bitcoin/Ethereum testnets
4. Prepare demo following the strategy doc