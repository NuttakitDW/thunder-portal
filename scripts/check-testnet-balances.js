#!/usr/bin/env node

const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

// Ethereum Sepolia RPC endpoints (public)
const SEPOLIA_RPC_ENDPOINTS = [
    'https://sepolia.infura.io/v3/7979b6b00e674dfabafcea1aac484f66', // Your Infura endpoint
    'https://rpc.ankr.com/eth_sepolia',
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://rpc.sepolia.org'
];

// Bitcoin testnet3 API endpoints
const BITCOIN_API_ENDPOINTS = [
    'https://blockstream.info/testnet/api',
    'https://api.blockcypher.com/v1/btc/test3'
];

// Format balance with proper units
function formatBTC(satoshis) {
    const btc = satoshis / 100000000;
    return btc.toFixed(8) + ' BTC';
}

function formatETH(wei) {
    const eth = ethers.utils.formatEther(wei);
    return parseFloat(eth).toFixed(6) + ' ETH';
}

// Check Bitcoin balance
async function checkBitcoinBalance(address, role) {
    try {
        // Try Blockstream API first
        const response = await axios.get(`${BITCOIN_API_ENDPOINTS[0]}/address/${address}`);
        const data = response.data;
        
        const balance = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        const txCount = data.chain_stats.tx_count;
        
        return {
            address,
            role,
            balance: formatBTC(balance),
            rawBalance: balance,
            txCount,
            status: balance > 0 ? 'FUNDED' : 'EMPTY'
        };
    } catch (error) {
        // Fallback to BlockCypher
        try {
            const response = await axios.get(`${BITCOIN_API_ENDPOINTS[1]}/addrs/${address}/balance`);
            const balance = response.data.balance;
            const txCount = response.data.n_tx;
            
            return {
                address,
                role,
                balance: formatBTC(balance),
                rawBalance: balance,
                txCount,
                status: balance > 0 ? 'FUNDED' : 'EMPTY'
            };
        } catch (fallbackError) {
            return {
                address,
                role,
                balance: 'Error',
                rawBalance: 0,
                txCount: 0,
                status: 'ERROR'
            };
        }
    }
}

// Check Ethereum balance with fallback RPC endpoints
async function checkEthereumBalance(address, role) {
    for (const rpcUrl of SEPOLIA_RPC_ENDPOINTS) {
        try {
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            provider.timeout = 5000; // 5 second timeout per endpoint
            
            const balancePromise = provider.getBalance(address);
            const txCountPromise = provider.getTransactionCount(address);
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );
            
            const [balance, txCount] = await Promise.race([
                Promise.all([balancePromise, txCountPromise]),
                timeoutPromise
            ]);
            
            return {
                address,
                role,
                balance: formatETH(balance),
                rawBalance: balance.toString(),
                txCount,
                status: balance.gt(0) ? 'FUNDED' : 'EMPTY'
            };
        } catch (error) {
            // Try next endpoint
            continue;
        }
    }
    
    // All endpoints failed
    return {
        address,
        role,
        balance: 'Error (RPC unavailable)',
        rawBalance: '0',
        txCount: 0,
        status: 'ERROR'
    };
}

// Main function
async function checkAllBalances() {
    console.log(`${colors.bold}${colors.green}⚡ Thunder Portal Testnet Balance Check${colors.reset}`);
    console.log(`${colors.cyan}Generated: ${new Date().toISOString()}${colors.reset}\n`);
    
    // Check Bitcoin balances
    console.log(`${colors.yellow}📙 Bitcoin Testnet3 Wallets:${colors.reset}`);
    console.log('='.repeat(80));
    
    const btcPromises = [
        checkBitcoinBalance(wallets.bitcoin.maker, 'Maker (Sends BTC)'),
        checkBitcoinBalance(wallets.bitcoin.resolver, 'Resolver (Liquidity)'),
        checkBitcoinBalance(wallets.bitcoin.taker, 'Taker (Receives BTC)')
    ];
    
    const btcResults = await Promise.all(btcPromises);
    let totalBTC = 0;
    
    for (const result of btcResults) {
        const statusColor = result.status === 'FUNDED' ? colors.green : 
                           result.status === 'EMPTY' ? colors.red : colors.yellow;
        
        console.log(`\n${colors.bold}${result.role}${colors.reset}`);
        console.log(`Address: ${result.address}`);
        console.log(`Balance: ${statusColor}${result.balance}${colors.reset}`);
        console.log(`Status:  ${statusColor}${result.status}${colors.reset}`);
        console.log(`Tx Count: ${result.txCount}`);
        
        totalBTC += result.rawBalance;
    }
    
    console.log(`\n${colors.cyan}Total BTC: ${formatBTC(totalBTC)}${colors.reset}`);
    
    // Check Ethereum balances
    console.log(`\n\n${colors.yellow}📘 Ethereum Sepolia Wallets:${colors.reset}`);
    console.log('='.repeat(80));
    
    const ethPromises = [
        checkEthereumBalance(wallets.ethereum.maker, 'Maker (Receives ETH)'),
        checkEthereumBalance(wallets.ethereum.resolver, 'Resolver (Liquidity)'),
        checkEthereumBalance(wallets.ethereum.taker, 'Taker (Sends ETH)')
    ];
    
    const ethResults = await Promise.all(ethPromises);
    let totalETH = ethers.BigNumber.from(0);
    
    for (const result of ethResults) {
        const statusColor = result.status === 'FUNDED' ? colors.green : 
                           result.status === 'EMPTY' ? colors.red : colors.yellow;
        
        console.log(`\n${colors.bold}${result.role}${colors.reset}`);
        console.log(`Address: ${result.address}`);
        console.log(`Balance: ${statusColor}${result.balance}${colors.reset}`);
        console.log(`Status:  ${statusColor}${result.status}${colors.reset}`);
        console.log(`Tx Count: ${result.txCount}`);
        
        if (result.status !== 'ERROR') {
            totalETH = totalETH.add(result.rawBalance);
        }
    }
    
    console.log(`\n${colors.cyan}Total ETH: ${formatETH(totalETH)}${colors.reset}`);
    
    // Summary
    console.log(`\n\n${colors.yellow}📊 Funding Summary:${colors.reset}`);
    console.log('='.repeat(80));
    
    const btcFunded = btcResults.filter(r => r.status === 'FUNDED').length;
    const ethFunded = ethResults.filter(r => r.status === 'FUNDED').length;
    
    console.log(`Bitcoin wallets funded: ${btcFunded}/3`);
    console.log(`Ethereum wallets funded: ${ethFunded}/3`);
    
    // Required funding
    console.log(`\n${colors.yellow}💰 Required Funding (Minimal Demo):${colors.reset}`);
    console.log('Bitcoin Maker: 0.001 BTC (currently: ' + 
        (btcResults.find(r => r.role.includes('Maker'))?.balance || 'Unknown') + ')');
    console.log('Bitcoin Resolver: 0.01 BTC (currently: ' + 
        (btcResults.find(r => r.role.includes('Resolver'))?.balance || 'Unknown') + ')');
    console.log('Ethereum Resolver: 0.5-1 ETH (currently: ' + 
        (ethResults.find(r => r.role.includes('Resolver'))?.balance || 'Unknown') + ')');
    console.log('Ethereum Taker: 0.1-0.5 ETH (currently: ' + 
        (ethResults.find(r => r.role.includes('Taker'))?.balance || 'Unknown') + ')');
    
    // Faucet links if any wallet is empty
    if (btcFunded < 3 || ethFunded < 3) {
        console.log(`\n${colors.yellow}🚰 Testnet Faucets:${colors.reset}`);
        if (btcFunded < 3) {
            console.log('\nBitcoin Testnet3:');
            console.log('  - https://coinfaucet.eu/en/btc-testnet/');
            console.log('  - https://bitcoinfaucet.uo1.net/');
            console.log('  - https://testnet-faucet.com/btc-testnet/');
        }
        if (ethFunded < 3) {
            console.log('\nEthereum Sepolia:');
            console.log('  - https://sepoliafaucet.com/');
            console.log('  - https://faucet.sepolia.dev/');
            console.log('  - https://sepolia-faucet.pk910.de/');
        }
    } else {
        console.log(`\n${colors.green}✅ All wallets funded and ready for testing!${colors.reset}`);
    }
    
    // Blockchain explorers
    console.log(`\n${colors.cyan}🔍 Blockchain Explorers:${colors.reset}`);
    console.log('Bitcoin: https://blockstream.info/testnet/');
    console.log('Ethereum: https://sepolia.etherscan.io/');
}

// Run the check
checkAllBalances()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });