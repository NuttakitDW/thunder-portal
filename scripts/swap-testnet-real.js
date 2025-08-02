#!/usr/bin/env node

const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// We'll run balance checks inline

// ANSI color codes
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Load wallet addresses
const walletsFile = path.join(__dirname, '..', 'doc', 'testnet-wallets', 'wallets-public.json');
const wallets = JSON.parse(fs.readFileSync(walletsFile, 'utf8'));

// Configuration
const RESOLVER_API = process.env.RESOLVER_API || 'http://localhost:3002';

// Network configuration for real testnet
const NETWORKS = {
    bitcoin: {
        name: 'testnet3',
        explorerUrl: 'https://blockstream.info/testnet'
    },
    ethereum: {
        name: 'sepolia',
        explorerUrl: 'https://sepolia.etherscan.io',
        rpcUrl: 'https://sepolia.infura.io/v3/7979b6b00e674dfabafcea1aac484f66'
    }
};

// Helper functions
function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getBitcoinBalance(address) {
    try {
        const response = await axios.get(`${NETWORKS.bitcoin.explorerUrl}/api/address/${address}`);
        const data = response.data;
        const balance = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        return balance;
    } catch (error) {
        console.error('Error fetching Bitcoin balance:', error.message);
        return 0;
    }
}

async function getEthereumBalance(address) {
    try {
        const provider = new ethers.providers.JsonRpcProvider(NETWORKS.ethereum.rpcUrl);
        const balance = await provider.getBalance(address);
        return balance;
    } catch (error) {
        console.error('Error fetching Ethereum balance:', error.message);
        return ethers.BigNumber.from(0);
    }
}

function formatBTC(satoshis) {
    return (satoshis / 100000000).toFixed(8) + ' BTC';
}

function formatETH(wei) {
    return ethers.utils.formatEther(wei) + ' ETH';
}

async function executeRealTestnetSwap() {
    log('cyan', '\n⚡ Thunder Portal - Real Testnet Atomic Swap\n');
    console.log('═'.repeat(60));

    // Check if we're using real testnet configuration
    const isTestnet = process.env.NETWORK_MODE === 'testnet' || process.env.USE_REAL_TESTNET === 'true';
    
    if (!isTestnet) {
        log('yellow', '⚠️  Running with local Bitcoin regtest and Ethereum hardhat.');
        log('yellow', 'To use real testnets, the .env.testnet file is already configured.\n');
        log('cyan', 'The system will now use real testnet by default.\n');
    } else {
        log('green', '✅ Using real testnet configuration');
        log('cyan', `Bitcoin: ${NETWORKS.bitcoin.name}`);
        log('cyan', `Ethereum: ${NETWORKS.ethereum.name}\n`);
    }

    // Step 1: Get initial balances
    log('yellow', '📊 Fetching initial balances...\n');
    
    const initialBalances = {
        bitcoin: {
            maker: await getBitcoinBalance(wallets.bitcoin.maker),
            resolver: await getBitcoinBalance(wallets.bitcoin.resolver),
            taker: await getBitcoinBalance(wallets.bitcoin.taker)
        },
        ethereum: {
            maker: await getEthereumBalance(wallets.ethereum.maker),
            resolver: await getEthereumBalance(wallets.ethereum.resolver),
            taker: await getEthereumBalance(wallets.ethereum.taker)
        }
    };

    // Display initial balances
    log('cyan', 'Bitcoin Testnet3 Balances (Before):');
    console.log(`Maker (sends BTC):    ${wallets.bitcoin.maker} - ${formatBTC(initialBalances.bitcoin.maker)}`);
    console.log(`Resolver (liquidity): ${wallets.bitcoin.resolver} - ${formatBTC(initialBalances.bitcoin.resolver)}`);
    console.log(`Taker (receives BTC): ${wallets.bitcoin.taker} - ${formatBTC(initialBalances.bitcoin.taker)}`);

    log('cyan', '\nEthereum Sepolia Balances (Before):');
    console.log(`Maker (receives ETH): ${wallets.ethereum.maker} - ${formatETH(initialBalances.ethereum.maker)}`);
    console.log(`Resolver (liquidity): ${wallets.ethereum.resolver} - ${formatETH(initialBalances.ethereum.resolver)}`);
    console.log(`Taker (sends ETH):    ${wallets.ethereum.taker} - ${formatETH(initialBalances.ethereum.taker)}`);

    // Swap configuration
    const swapConfig = {
        orderId: `testnet-swap-${Date.now()}`,
        bitcoinAmount: 0.0001,  // Small amount for testing
        ethereumAmount: 0.001,  // Small amount for testing
        userAddress: wallets.ethereum.taker
    };

    try {
        // Step 2: Create atomic swap
        log('yellow', '\n🔧 Creating atomic swap on testnet...');
        log('cyan', `Order: ${swapConfig.orderId}`);
        log('cyan', `Amount: ${swapConfig.bitcoinAmount} BTC ⟷ ${swapConfig.ethereumAmount} ETH\n`);

        const swapResponse = await axios.post(`${RESOLVER_API}/execute-real-swap`, swapConfig);
        const swapData = swapResponse.data;

        log('green', '✅ Swap created successfully!');
        console.log(`Swap ID: ${swapData.swapId}`);
        console.log(`Preimage: ${swapData.preimage}`);
        console.log(`Preimage Hash: ${swapData.preimageHash}`);

        // Step 3: Display Bitcoin HTLC details
        log('yellow', '\n📙 Bitcoin HTLC:');
        console.log(`Address: ${swapData.bitcoin.htlcAddress}`);
        console.log(`Funding TX: ${swapData.bitcoin.fundingTxid}`);
        console.log(`Explorer: ${NETWORKS.bitcoin.explorerUrl}/address/${swapData.bitcoin.htlcAddress}`);
        console.log(`TX Explorer: ${NETWORKS.bitcoin.explorerUrl}/tx/${swapData.bitcoin.fundingTxid}`);

        // Step 4: Display Ethereum Escrow details
        log('yellow', '\n📘 Ethereum Escrow:');
        console.log(`Address: ${swapData.ethereum.escrowAddress}`);
        console.log(`Funding TX: ${swapData.ethereum.fundingTxid}`);
        console.log(`Explorer: ${NETWORKS.ethereum.explorerUrl}/address/${swapData.ethereum.escrowAddress}`);
        console.log(`TX Explorer: ${NETWORKS.ethereum.explorerUrl}/tx/${swapData.ethereum.fundingTxid}`);

        // Step 5: Wait for confirmations
        log('yellow', '\n⏳ Waiting for blockchain confirmations...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Step 6: Check swap status
        const statusResponse = await axios.get(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}`);
        const status = statusResponse.data;

        log('green', '✅ Swap status:');
        console.log(`Bitcoin HTLC: ${status.currentStatus.bitcoin.status}`);
        console.log(`Ethereum Escrow: ${status.currentStatus.ethereum.status}`);

        // Step 7: Get final balances
        log('yellow', '\n📊 Fetching final balances...\n');

        const finalBalances = {
            bitcoin: {
                maker: await getBitcoinBalance(wallets.bitcoin.maker),
                resolver: await getBitcoinBalance(wallets.bitcoin.resolver),
                taker: await getBitcoinBalance(wallets.bitcoin.taker),
                htlc: await getBitcoinBalance(swapData.bitcoin.htlcAddress)
            },
            ethereum: {
                maker: await getEthereumBalance(wallets.ethereum.maker),
                resolver: await getEthereumBalance(wallets.ethereum.resolver),
                taker: await getEthereumBalance(wallets.ethereum.taker),
                escrow: await getEthereumBalance(swapData.ethereum.escrowAddress)
            }
        };

        // Display balance changes
        log('cyan', 'Bitcoin Testnet3 Balances (After):');
        console.log(`Maker:    ${formatBTC(finalBalances.bitcoin.maker)} (${formatBTC(finalBalances.bitcoin.maker - initialBalances.bitcoin.maker)})`);
        console.log(`Resolver: ${formatBTC(finalBalances.bitcoin.resolver)} (${formatBTC(finalBalances.bitcoin.resolver - initialBalances.bitcoin.resolver)})`);
        console.log(`Taker:    ${formatBTC(finalBalances.bitcoin.taker)} (${formatBTC(finalBalances.bitcoin.taker - initialBalances.bitcoin.taker)})`);
        console.log(`HTLC:     ${formatBTC(finalBalances.bitcoin.htlc)} ${colors.green}(+${formatBTC(finalBalances.bitcoin.htlc)})${colors.reset}`);

        log('cyan', '\nEthereum Sepolia Balances (After):');
        const makerDiff = finalBalances.ethereum.maker.sub(initialBalances.ethereum.maker);
        const resolverDiff = finalBalances.ethereum.resolver.sub(initialBalances.ethereum.resolver);
        const takerDiff = finalBalances.ethereum.taker.sub(initialBalances.ethereum.taker);
        
        console.log(`Maker:    ${formatETH(finalBalances.ethereum.maker)} (${formatETH(makerDiff)})`);
        console.log(`Resolver: ${formatETH(finalBalances.ethereum.resolver)} (${formatETH(resolverDiff)})`);
        console.log(`Taker:    ${formatETH(finalBalances.ethereum.taker)} (${formatETH(takerDiff)})`);
        console.log(`Escrow:   ${formatETH(finalBalances.ethereum.escrow)} ${colors.green}(+${formatETH(finalBalances.ethereum.escrow)})${colors.reset}`);

        // Step 8: Generate report
        log('yellow', '\n📄 Generating swap report...');
        const reportResponse = await axios.post(`${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/report`);
        const report = reportResponse.data;

        console.log(`Report ID: ${report.reportId}`);
        console.log(`Status: ${report.swap.status}`);

        // Display completion instructions
        log('cyan', '\n🔐 To Complete the Swap:');
        console.log(swapData.instructions.toBitcoin);
        console.log(swapData.instructions.toEthereum);

        // Export links
        log('cyan', '\n📥 Export Report:');
        console.log(`JSON: ${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/export?format=json`);
        console.log(`CSV: ${RESOLVER_API}/api/reports/swaps/${swapData.swapId}/export?format=csv`);

        console.log('\n' + '═'.repeat(60));
        log('green', '✨ Real testnet atomic swap completed successfully!');
        console.log('═'.repeat(60));

        // Show full balance report
        log('yellow', '\n📊 Full balance report available with: make balances');

    } catch (error) {
        log('red', '\n❌ Error executing swap:');
        console.error(error.response?.data || error.message);
        
        if (error.response?.data?.details?.includes('insufficient funds')) {
            log('yellow', '\n💡 Tip: Make sure your testnet wallets have sufficient funds.');
            log('yellow', 'Run "make balances" to check current balances.');
            log('yellow', 'Use the faucet links provided to get testnet funds.');
        }
        
        process.exit(1);
    }
}


// Run if called directly
if (require.main === module) {
    executeRealTestnetSwap().catch(console.error);
}

module.exports = { executeRealTestnetSwap };