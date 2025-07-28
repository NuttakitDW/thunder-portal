# Thunder Portal Project Structure

## Directory Layout

```
thunder-portal/
├── README.md                    # Main project documentation
├── openapi-spec.yaml           # API specification (source of truth)
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
├── bitcoin-htlc/               # Rust backend service (to be created)
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs
│   │   ├── api/              # API endpoints
│   │   ├── bitcoin/          # Bitcoin integration
│   │   ├── ethereum/         # Ethereum integration
│   │   ├── models/           # Data models
│   │   └── db/              # Database layer
│   └── tests/
│
└── scripts/                    # Utility scripts (to be created)
    ├── setup.sh               # Development setup
    └── demo.sh                # Demo helper scripts
```

## Key Files

### API Specification
- `openapi-spec.yaml` - Complete API specification with all endpoints

### Documentation
- `docs/api/backend-implementation-checklist.md` - Step-by-step implementation guide
- `docs/architecture/system-architecture.md` - Technical architecture
- `docs/planning/realistic-winning-strategy.md` - 6-day development plan

### Implementation (To Be Created)
- `bitcoin-htlc/` - Rust backend service implementing the API

## Development Workflow

1. **API First** - OpenAPI spec is the source of truth
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