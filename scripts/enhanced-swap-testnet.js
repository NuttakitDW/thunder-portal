#!/usr/bin/env node

const axios = require('axios');
const { ethers } = require('ethers');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');

// Configuration
const RESOLVER_API = 'http://localhost:3002';
const BITCOIN_API = 'http://localhost:3000/v1';

// Network configuration for testnet
const NETWORKS = {
  bitcoin: {
    name: 'testnet3',
    explorerUrl: 'https://blockstream.info/testnet',
    rpcUrl: process.env.BITCOIN_TESTNET_RPC || 'https://testnet.blockstream.info/testnet/api'
  },
  ethereum: {
    name: 'sepolia',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    chainId: 11155111
  }
};

// Helper functions
function formatBTC(satoshis) {
  return (satoshis / 100000000).toFixed(8) + ' BTC';
}

function formatETH(wei) {
  return ethers.formatEther(wei) + ' ETH';
}

async function getBitcoinBalance(address) {
  try {
    const response = await axios.get(`${NETWORKS.bitcoin.explorerUrl}/api/address/${address}`);
    return response.data.chain_stats.funded_txo_sum - response.data.chain_stats.spent_txo_sum;
  } catch (error) {
    console.error(chalk.red('Error fetching Bitcoin balance:'), error.message);
    return 0;
  }
}

async function getEthereumBalance(address, provider) {
  try {
    const balance = await provider.getBalance(address);
    return balance;
  } catch (error) {
    console.error(chalk.red('Error fetching Ethereum balance:'), error.message);
    return 0n;
  }
}

function createBalanceTable(title, data) {
  const table = new Table({
    head: [chalk.cyan('Account'), chalk.cyan('Address'), chalk.cyan('Before'), chalk.cyan('After'), chalk.cyan('Change')],
    colWidths: [15, 45, 20, 20, 20]
  });

  data.forEach(row => {
    table.push(row);
  });

  console.log(chalk.yellow(`\n${title}:`));
  console.log(table.toString());
}

function displayExplorerLinks(bitcoin, ethereum) {
  console.log(chalk.cyan('\n📊 Blockchain Explorers:'));
  
  if (bitcoin.htlc) {
    console.log(chalk.white(`   Bitcoin HTLC: ${NETWORKS.bitcoin.explorerUrl}/address/${bitcoin.htlc}`));
  }
  if (bitcoin.fundingTx) {
    console.log(chalk.white(`   Bitcoin Funding TX: ${NETWORKS.bitcoin.explorerUrl}/tx/${bitcoin.fundingTx}`));
  }
  if (bitcoin.claimTx) {
    console.log(chalk.white(`   Bitcoin Claim TX: ${NETWORKS.bitcoin.explorerUrl}/tx/${bitcoin.claimTx}`));
  }
  
  if (ethereum.escrow) {
    console.log(chalk.white(`   Ethereum Escrow: ${NETWORKS.ethereum.explorerUrl}/address/${ethereum.escrow}`));
  }
  if (ethereum.fundingTx) {
    console.log(chalk.white(`   Ethereum Funding TX: ${NETWORKS.ethereum.explorerUrl}/tx/${ethereum.fundingTx}`));
  }
  if (ethereum.claimTx) {
    console.log(chalk.white(`   Ethereum Claim TX: ${NETWORKS.ethereum.explorerUrl}/tx/${ethereum.claimTx}`));
  }
}

async function executeEnhancedSwap() {
  console.log(chalk.cyan.bold('\n⚡ Thunder Portal - Enhanced Testnet Atomic Swap\n'));
  console.log(chalk.gray('═'.repeat(60)));

  // Initialize Ethereum provider
  const provider = new ethers.JsonRpcProvider(NETWORKS.ethereum.rpcUrl);
  
  // For demo, we'll use the local setup. In production, this would use real testnet wallets
  const isLocalDemo = !process.env.USE_REAL_TESTNET;
  
  if (isLocalDemo) {
    console.log(chalk.yellow('🔧 Running in local demo mode. Set USE_REAL_TESTNET=true for real testnet.\n'));
  }

  // Swap parameters
  const swapConfig = {
    orderId: `testnet-swap-${Date.now()}`,
    bitcoinAmount: 0.001,  // 0.001 BTC
    ethereumAmount: 0.01,  // 0.01 ETH
    userAddress: isLocalDemo ? '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' : process.env.ETH_USER_ADDRESS
  };

  // Track balances
  const balances = {
    bitcoin: {
      maker: { before: 0, after: 0 },
      taker: { before: 0, after: 0 },
      htlc: { before: 0, after: 0 }
    },
    ethereum: {
      maker: { before: 0n, after: 0n },
      taker: { before: 0n, after: 0n },
      escrow: { before: 0n, after: 0n }
    }
  };

  try {
    // Step 1: Get initial balances
    const spinner1 = ora('Fetching initial balances...').start();
    
    if (!isLocalDemo) {
      // Fetch real testnet balances
      balances.bitcoin.maker.before = await getBitcoinBalance(process.env.BTC_MAKER_ADDRESS);
      balances.bitcoin.taker.before = await getBitcoinBalance(process.env.BTC_TAKER_ADDRESS);
      balances.ethereum.maker.before = await getEthereumBalance(process.env.ETH_MAKER_ADDRESS, provider);
      balances.ethereum.taker.before = await getEthereumBalance(process.env.ETH_TAKER_ADDRESS, provider);
    }
    
    spinner1.succeed('Initial balances fetched');

    // Step 2: Create atomic swap
    const spinner2 = ora('Creating atomic swap...').start();
    
    const swapResponse = await axios.post(`${RESOLVER_API}/execute-real-swap`, swapConfig);
    const swapData = swapResponse.data;
    
    spinner2.succeed(`Swap created: ${swapData.swapId}`);
    
    console.log(chalk.green('\n✅ Swap Details:'));
    console.log(chalk.white(`   Order ID: ${swapData.orderId}`));
    console.log(chalk.white(`   Preimage Hash: ${swapData.preimageHash}`));
    console.log(chalk.white(`   Bitcoin HTLC: ${swapData.bitcoin.htlcAddress}`));
    console.log(chalk.white(`   Ethereum Escrow: ${swapData.ethereum.escrowAddress}`));

    // Step 3: Monitor swap status
    const spinner3 = ora('Monitoring swap status...').start();
    
    // Wait for transactions to be mined
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get swap status with report
    const statusResponse = await axios.get(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}`);
    const status = statusResponse.data;
    
    spinner3.succeed(`Swap status: ${status.currentStatus.bitcoin.status} / ${status.currentStatus.ethereum.status}`);

    // Step 4: Generate comprehensive report
    const spinner4 = ora('Generating swap report...').start();
    
    const reportResponse = await axios.post(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/report`);
    const report = reportResponse.data;
    
    spinner4.succeed('Report generated');

    // Step 5: Get final balances
    const spinner5 = ora('Fetching final balances...').start();
    
    if (!isLocalDemo) {
      // Fetch real testnet balances
      balances.bitcoin.maker.after = await getBitcoinBalance(process.env.BTC_MAKER_ADDRESS);
      balances.bitcoin.taker.after = await getBitcoinBalance(process.env.BTC_TAKER_ADDRESS);
      balances.bitcoin.htlc.after = await getBitcoinBalance(swapData.bitcoin.htlcAddress);
      balances.ethereum.maker.after = await getEthereumBalance(process.env.ETH_MAKER_ADDRESS, provider);
      balances.ethereum.taker.after = await getEthereumBalance(process.env.ETH_TAKER_ADDRESS, provider);
      balances.ethereum.escrow.after = await getEthereumBalance(swapData.ethereum.escrowAddress, provider);
    } else {
      // Demo values
      balances.bitcoin.htlc.after = swapConfig.bitcoinAmount * 100000000;
      balances.ethereum.escrow.after = ethers.parseEther(swapConfig.ethereumAmount.toString());
    }
    
    spinner5.succeed('Final balances fetched');

    // Display balance changes
    const bitcoinData = [
      ['Maker', process.env.BTC_MAKER_ADDRESS || 'demo-address', 
       formatBTC(balances.bitcoin.maker.before), 
       formatBTC(balances.bitcoin.maker.after),
       chalk.red(formatBTC(balances.bitcoin.maker.before - balances.bitcoin.maker.after))],
      ['HTLC', swapData.bitcoin.htlcAddress,
       formatBTC(balances.bitcoin.htlc.before),
       formatBTC(balances.bitcoin.htlc.after),
       chalk.green('+' + formatBTC(balances.bitcoin.htlc.after - balances.bitcoin.htlc.before))],
      ['Taker', process.env.BTC_TAKER_ADDRESS || 'pending-claim',
       formatBTC(balances.bitcoin.taker.before),
       formatBTC(balances.bitcoin.taker.after),
       '-']
    ];

    const ethereumData = [
      ['Taker', swapConfig.userAddress,
       formatETH(balances.ethereum.taker.before),
       formatETH(balances.ethereum.taker.after),
       chalk.red('-' + formatETH(balances.ethereum.taker.after - balances.ethereum.taker.before))],
      ['Escrow', swapData.ethereum.escrowAddress,
       formatETH(balances.ethereum.escrow.before),
       formatETH(balances.ethereum.escrow.after),
       chalk.green('+' + formatETH(balances.ethereum.escrow.after))],
      ['Maker', process.env.ETH_MAKER_ADDRESS || 'pending-claim',
       formatETH(balances.ethereum.maker.before),
       formatETH(balances.ethereum.maker.after),
       '-']
    ];

    createBalanceTable('Bitcoin Balances', bitcoinData);
    createBalanceTable('Ethereum Balances', ethereumData);

    // Display timeline
    console.log(chalk.yellow('\n📅 Swap Timeline:'));
    report.timeline.forEach(event => {
      const icon = event.event.includes('FUNDED') ? '✅' : '📝';
      console.log(chalk.white(`   ${icon} ${event.event}`));
      if (event.txid) {
        console.log(chalk.gray(`      TX: ${event.txid}`));
      }
    });

    // Display explorer links
    displayExplorerLinks(
      {
        htlc: swapData.bitcoin.htlcAddress,
        fundingTx: swapData.bitcoin.fundingTxid,
        claimTx: status.currentStatus.bitcoin.claimTx
      },
      {
        escrow: swapData.ethereum.escrowAddress,
        fundingTx: swapData.ethereum.fundingTxid,
        claimTx: status.currentStatus.ethereum.claimTx
      }
    );

    // Display instructions
    console.log(chalk.cyan('\n🔐 To Complete the Swap:'));
    console.log(chalk.white(`   ${swapData.instructions.toBitcoin}`));
    console.log(chalk.white(`   ${swapData.instructions.toEthereum}`));

    // Export report
    console.log(chalk.cyan('\n📄 Report Export:'));
    console.log(chalk.white(`   JSON: ${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/export?format=json`));
    console.log(chalk.white(`   CSV: ${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/export?format=csv`));

    console.log(chalk.green.bold('\n✨ Enhanced atomic swap completed successfully!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.response?.data || error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  executeEnhancedSwap().catch(console.error);
}

module.exports = { executeEnhancedSwap };