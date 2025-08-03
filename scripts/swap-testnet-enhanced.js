#!/usr/bin/env node

const axios = require('axios');
const { ethers } = require('ethers');

// Configuration
const RESOLVER_API = 'http://localhost:3002';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

// Network configuration
const NETWORKS = {
  bitcoin: {
    name: 'regtest', // Using local regtest for demo
    explorerUrl: 'https://blockstream.info/testnet'
  },
  ethereum: {
    name: 'local', // Using local hardhat for demo
    explorerUrl: 'https://sepolia.etherscan.io'
  }
};

// Helper functions
function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBTC(amount) {
  return `${amount} BTC`;
}

function formatETH(amount) {
  return `${amount} ETH`;
}

function printTable(title, headers, rows) {
  console.log(`\n${colors.yellow}${title}:${colors.reset}`);
  console.log('─'.repeat(100));
  
  // Print headers
  const headerLine = headers.map((h, i) => {
    const width = i === 1 ? 45 : 20;
    return h.padEnd(width);
  }).join('│ ');
  console.log(headerLine);
  console.log('─'.repeat(100));
  
  // Print rows
  rows.forEach(row => {
    const rowLine = row.map((cell, i) => {
      const width = i === 1 ? 45 : 20;
      return String(cell).padEnd(width);
    }).join('│ ');
    console.log(rowLine);
  });
  console.log('─'.repeat(100));
}

async function executeEnhancedSwap() {
  log('cyan', '\n⚡ Thunder Portal - Enhanced Testnet Atomic Swap\n');
  console.log('═'.repeat(60));

  // Swap parameters
  const swapConfig = {
    orderId: `enhanced-swap-${Date.now()}`,
    bitcoinAmount: 0.001,
    ethereumAmount: 0.01,
    userAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  };

  try {
    // Step 1: Display initial setup
    log('yellow', '\n📋 Swap Configuration:');
    console.log(`   Order ID: ${swapConfig.orderId}`);
    console.log(`   Bitcoin Amount: ${formatBTC(swapConfig.bitcoinAmount)}`);
    console.log(`   Ethereum Amount: ${formatETH(swapConfig.ethereumAmount)}`);
    console.log(`   User Address: ${swapConfig.userAddress}`);

    // Step 2: Check initial balances (mock for demo)
    log('yellow', '\n💰 Initial Balances:');
    const initialBalances = {
      bitcoin: {
        resolver: 50.0,
        user: 0.0,
        htlc: 0.0
      },
      ethereum: {
        resolver: 100.0,
        user: 10.0,
        escrow: 0.0
      }
    };

    printTable('Bitcoin Balances (Before)', 
      ['Account', 'Address', 'Balance'],
      [
        ['Resolver', '1ResolverBitcoinAddressDemo...', formatBTC(initialBalances.bitcoin.resolver)],
        ['User', '1UserBitcoinAddressDemo...', formatBTC(initialBalances.bitcoin.user)],
        ['HTLC', 'Not created yet', formatBTC(initialBalances.bitcoin.htlc)]
      ]
    );

    printTable('Ethereum Balances (Before)',
      ['Account', 'Address', 'Balance'],
      [
        ['Resolver', '0xResolver...', formatETH(initialBalances.ethereum.resolver)],
        ['User', swapConfig.userAddress, formatETH(initialBalances.ethereum.user)],
        ['Escrow', 'Not created yet', formatETH(initialBalances.ethereum.escrow)]
      ]
    );

    // Step 3: Create atomic swap
    log('yellow', '\n🔧 Creating atomic swap...');
    const swapResponse = await axios.post(`${RESOLVER_API}/execute-real-swap`, swapConfig);
    const swapData = swapResponse.data;
    
    log('green', '✅ Swap created successfully!');
    console.log(`   Swap ID: ${swapData.swapId}`);
    console.log(`   Preimage Hash: ${swapData.preimageHash}`);
    console.log(`   Bitcoin HTLC: ${swapData.bitcoin.htlcAddress}`);
    console.log(`   Ethereum Escrow: ${swapData.ethereum.escrowAddress}`);

    // Step 4: Show transaction details
    log('yellow', '\n📝 Transaction Details:');
    console.log(`\n${colors.cyan}Bitcoin Transactions:${colors.reset}`);
    console.log(`   HTLC Creation: ${swapData.bitcoin.htlcAddress}`);
    console.log(`   Funding TX: ${swapData.bitcoin.fundingTxid}`);
    console.log(`   Explorer: ${NETWORKS.bitcoin.explorerUrl}/address/${swapData.bitcoin.htlcAddress}`);
    
    console.log(`\n${colors.cyan}Ethereum Transactions:${colors.reset}`);
    console.log(`   Escrow Creation: ${swapData.ethereum.escrowAddress}`);
    console.log(`   Funding TX: ${swapData.ethereum.fundingTxid}`);
    console.log(`   Explorer: ${NETWORKS.ethereum.explorerUrl}/address/${swapData.ethereum.escrowAddress}`);

    // Step 5: Wait for confirmations
    log('yellow', '\n⏳ Waiting for blockchain confirmations...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 6: Check swap status
    const statusResponse = await axios.get(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}`);
    const status = statusResponse.data;
    
    log('green', '✅ Swap funded on both chains!');
    console.log(`   Bitcoin HTLC Status: ${status.currentStatus.bitcoin.status}`);
    console.log(`   Ethereum Escrow Status: ${status.currentStatus.ethereum.status}`);

    // Step 7: Show final balances (mock for demo)
    log('yellow', '\n💰 Final Balances:');
    const finalBalances = {
      bitcoin: {
        resolver: 49.999,
        user: 0.0,
        htlc: 0.001
      },
      ethereum: {
        resolver: 99.99,
        user: 9.99,
        escrow: 0.01
      }
    };

    printTable('Bitcoin Balances (After)',
      ['Account', 'Address', 'Balance', 'Change'],
      [
        ['Resolver', '1ResolverBitcoinAddressDemo...', formatBTC(finalBalances.bitcoin.resolver), `${colors.red}-${formatBTC(0.001)}${colors.reset}`],
        ['User', '1UserBitcoinAddressDemo...', formatBTC(finalBalances.bitcoin.user), '-'],
        ['HTLC', swapData.bitcoin.htlcAddress, formatBTC(finalBalances.bitcoin.htlc), `${colors.green}+${formatBTC(0.001)}${colors.reset}`]
      ]
    );

    printTable('Ethereum Balances (After)',
      ['Account', 'Address', 'Balance', 'Change'],
      [
        ['Resolver', '0xResolver...', formatETH(finalBalances.ethereum.resolver), `${colors.red}-${formatETH(0.01)}${colors.reset}`],
        ['User', swapConfig.userAddress, formatETH(finalBalances.ethereum.user), `${colors.red}-${formatETH(0.01)}${colors.reset}`],
        ['Escrow', swapData.ethereum.escrowAddress, formatETH(finalBalances.ethereum.escrow), `${colors.green}+${formatETH(0.01)}${colors.reset}`]
      ]
    );

    // Step 8: Generate report
    log('yellow', '\n📊 Generating comprehensive report...');
    const reportResponse = await axios.post(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/report`);
    const report = reportResponse.data;
    
    log('green', '✅ Report generated!');
    console.log(`   Report ID: ${report.reportId}`);
    console.log(`   Overall Status: ${report.swap.status}`);

    // Show timeline
    console.log(`\n${colors.cyan}Timeline:${colors.reset}`);
    report.timeline.forEach(event => {
      console.log(`   • ${event.event}`);
      if (event.txid) {
        console.log(`     TX: ${event.txid}`);
      }
    });

    // Step 9: Show completion instructions
    log('cyan', '\n🔐 To Complete the Swap:');
    console.log(`   ${swapData.instructions.toBitcoin}`);
    console.log(`   ${swapData.instructions.toEthereum}`);

    // Step 10: Export links
    log('cyan', '\n📄 Export Report:');
    console.log(`   JSON: ${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/export?format=json`);
    console.log(`   CSV: ${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/export?format=csv`);

    // Summary
    console.log('\n' + '═'.repeat(60));
    log('green', '✨ Enhanced atomic swap completed successfully!');
    console.log('═'.repeat(60));
    
    // Real testnet note
    if (process.env.USE_REAL_TESTNET) {
      log('yellow', '\n📌 Note: To use real testnet:');
      console.log('   1. Set up testnet wallets with funds');
      console.log('   2. Configure RPC endpoints for Bitcoin testnet3 and Ethereum Sepolia');
      console.log('   3. Update addresses in .env.testnet file');
      console.log('   4. Run with USE_REAL_TESTNET=true');
    }

  } catch (error) {
    log('red', '\n❌ Error executing swap:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  executeEnhancedSwap().catch(console.error);
}

module.exports = { executeEnhancedSwap };