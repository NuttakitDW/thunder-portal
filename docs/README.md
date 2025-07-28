# Thunder Portal Documentation

## Overview

Thunder Portal enables atomic swaps between 1inch Fusion+ (Ethereum) and Bitcoin networks through a custom resolver and Bitcoin HTLC API service.

## Core Documentation

### 1. Project Concept
- [Thunder Portal Concept](./thunder-portal-concept.md) - Complete project overview and vision

### 2. Technical Architecture
- [Architecture Summary](./architecture-summary.md) - High-level system design
- [Bitcoin HTLC Implementation](./implementation/bitcoin-htlc-implementation.md) - Detailed HTLC implementation guide
- [Bitcoin Resolver API Specification](./bitcoin-resolver-api-specification.md) - API endpoints and integration

### 3. Reference Documents
- [1inch Fusion+ Architecture](./reference/1inch-fusion-plus-architecture-summary.md) - Understanding Fusion+ protocol
- [Bitcoin Prize Requirements](./reference/bitcoin-prize-requirements-detailed.md) - Hackathon requirements

## Quick Links

### For Developers
1. Start with [Architecture Summary](./architecture-summary.md)
2. Implement [Bitcoin API](./bitcoin-resolver-api-specification.md)
3. Follow [HTLC Implementation](./implementation/bitcoin-htlc-implementation.md)

### For Judges/Reviewers
1. Read [Thunder Portal Concept](./thunder-portal-concept.md)
2. Review [Architecture](./architecture-summary.md)
3. Check alignment with [Prize Requirements](./reference/bitcoin-prize-requirements-detailed.md)

## Project Structure

```
thunder-portal/
├── README.md                    # Project overview
├── docs/                        # Documentation
│   ├── thunder-portal-concept.md       # Vision & concept
│   ├── architecture-summary.md         # System design
│   ├── implementation/
│   │   └── bitcoin-htlc-implementation.md    # HTLC guide
│   ├── bitcoin-resolver-api-specification.md  # API spec
│   └── reference/               # Supporting documents
├── src/                         # Source code (to be created)
│   ├── bitcoin-api/            # Bitcoin HTLC service
│   └── resolver/               # Fusion+ resolver
└── tests/                      # Test suites
```

## Development Status

- ✅ Architecture designed
- ✅ API specification complete
- ✅ HTLC implementation planned
- 🔄 Bitcoin API development (in progress)
- 🔄 Resolver implementation (in progress)
- ⏳ Integration testing
- ⏳ Demo preparation