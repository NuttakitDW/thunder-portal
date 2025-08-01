# ⚡ Thunder Portal CLI

Beautiful terminal UI for trustless Bitcoin-Ethereum atomic swaps.

## Features

- 🎨 **Beautiful React-based TUI** - Built with Ink for a modern terminal experience
- 🔄 **Atomic Swaps** - Swap BTC ⟷ ETH with zero trust required
- 📊 **Real-time Status** - Watch your swaps progress in real-time
- 💰 **Balance Checking** - View your Bitcoin and Ethereum balances
- 📜 **Swap History** - Track all your previous swaps
- 🎮 **Demo Mode** - Test without real funds

## Installation

```bash
# Install globally
npm install -g @thunder-portal/cli

# Or run directly with npx
npx @thunder-portal/cli
```

## Usage

### Start the CLI
```bash
thunder
```

### Demo Mode
```bash
thunder --demo
```

## Commands

Once in the CLI, use arrow keys to navigate:

- **💰 Check Balances** - View your BTC and ETH balances
- **🔄 Create Atomic Swap** - Initiate a new cross-chain swap
- **📊 Active Swaps Status** - Monitor ongoing swaps
- **📜 Swap History** - View past transactions

## Demo

![Thunder Portal CLI Demo](demo.gif)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Architecture

- **Frontend**: React + Ink 3 for terminal UI
- **Backend**: Thunder Portal API services
- **Blockchains**: Bitcoin (regtest) + Ethereum (local)
- **Smart Contracts**: 1inch Limit Order Protocol integration

## License

MIT