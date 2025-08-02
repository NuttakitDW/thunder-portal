#!/usr/bin/env node

/**
 * Testnet Services Wrapper
 * Provides a unified interface for interacting with real testnets
 * without relying on local Docker services
 */

const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load configuration
const testnetConfig = require('../config/testnet-services.json');
const walletsFile = path.join(__dirname, '..', 'doc', 'testnet-wallets', 'wallets-public.json');
const wallets = JSON.parse(fs.readFileSync(walletsFile, 'utf8'));

class TestnetServices {
    constructor() {
        // Bitcoin configuration
        this.bitcoinApi = testnetConfig.bitcoin.rpc.public[0];
        this.bitcoinExplorer = testnetConfig.bitcoin.explorer;
        
        // Ethereum configuration
        this.ethereumProvider = new ethers.providers.JsonRpcProvider(
            process.env.SEPOLIA_RPC_URL || testnetConfig.ethereum.rpc.infura
        );
        this.ethereumExplorer = testnetConfig.ethereum.explorer;
        
        // Contract addresses (to be deployed)
        this.contracts = {
            escrowFactory: process.env.SEPOLIA_ESCROW_FACTORY || null
        };
    }

    // Bitcoin Methods
    async getBitcoinBalance(address) {
        try {
            const url = `${this.bitcoinApi}/address/${address}`;
            console.log(`Fetching Bitcoin balance from: ${url}`);
            const response = await axios.get(url);
            const data = response.data;
            const balance = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
            return {
                balance: balance,
                balanceBTC: balance / 100000000,
                txCount: data.chain_stats.tx_count
            };
        } catch (error) {
            console.error('Bitcoin API error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                config: error.config?.url
            });
            throw new Error(`Failed to get Bitcoin balance: ${error.message || 'Unknown error'}`);
        }
    }

    async getBitcoinUTXOs(address) {
        try {
            const response = await axios.get(`${this.bitcoinApi}/address/${address}/utxo`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get Bitcoin UTXOs: ${error.message}`);
        }
    }

    async broadcastBitcoinTx(txHex) {
        try {
            const response = await axios.post(`${this.bitcoinApi}/tx`, txHex, {
                headers: { 'Content-Type': 'text/plain' }
            });
            return response.data; // Returns transaction ID
        } catch (error) {
            throw new Error(`Failed to broadcast Bitcoin transaction: ${error.message}`);
        }
    }

    // Ethereum Methods
    async getEthereumBalance(address) {
        try {
            const balance = await this.ethereumProvider.getBalance(address);
            const txCount = await this.ethereumProvider.getTransactionCount(address);
            return {
                balance: balance.toString(),
                balanceETH: ethers.utils.formatEther(balance),
                txCount
            };
        } catch (error) {
            throw new Error(`Failed to get Ethereum balance: ${error.message}`);
        }
    }

    async deployEscrowContract(params) {
        if (!this.contracts.escrowFactory) {
            throw new Error('Escrow factory contract not deployed on Sepolia');
        }
        
        // This would interact with the deployed factory contract
        // For now, returning mock data
        return {
            escrowAddress: '0x' + '0'.repeat(40),
            transactionHash: '0x' + '0'.repeat(64)
        };
    }

    async getGasPrice() {
        try {
            const gasPrice = await this.ethereumProvider.getGasPrice();
            return {
                gasPrice: gasPrice.toString(),
                gasPriceGwei: ethers.utils.formatUnits(gasPrice, 'gwei')
            };
        } catch (error) {
            throw new Error(`Failed to get gas price: ${error.message}`);
        }
    }

    // Helper Methods
    getBitcoinExplorerUrl(txId) {
        return `${this.bitcoinExplorer}/tx/${txId}`;
    }

    getEthereumExplorerUrl(txHash) {
        return `${this.ethereumExplorer}/tx/${txHash}`;
    }

    async checkRequirements() {
        console.log('Checking testnet requirements...\n');
        
        // Check Bitcoin balances
        const btcMaker = await this.getBitcoinBalance(wallets.bitcoin.maker);
        const btcResolver = await this.getBitcoinBalance(wallets.bitcoin.resolver);
        
        // Check Ethereum balances
        const ethResolver = await this.getEthereumBalance(wallets.ethereum.resolver);
        const ethTaker = await this.getEthereumBalance(wallets.ethereum.taker);
        
        const requirements = {
            bitcoin: {
                maker: btcMaker.balanceBTC >= 0.001,
                resolver: btcResolver.balanceBTC >= 0.001
            },
            ethereum: {
                resolver: parseFloat(ethResolver.balanceETH) >= 0.01,
                taker: parseFloat(ethTaker.balanceETH) >= 0.01
            }
        };
        
        return {
            requirements,
            balances: {
                bitcoin: { maker: btcMaker, resolver: btcResolver },
                ethereum: { resolver: ethResolver, taker: ethTaker }
            }
        };
    }
}

module.exports = TestnetServices;

// If running directly, show configuration
if (require.main === module) {
    const services = new TestnetServices();
    
    console.log('Testnet Services Configuration:');
    console.log('===============================\n');
    
    console.log('Bitcoin:');
    console.log(`  Network: ${testnetConfig.bitcoin.network}`);
    console.log(`  API: ${services.bitcoinApi}`);
    console.log(`  Explorer: ${services.bitcoinExplorer}`);
    
    console.log('\nEthereum:');
    console.log(`  Network: ${testnetConfig.ethereum.network}`);
    console.log(`  Chain ID: ${testnetConfig.ethereum.chainId}`);
    console.log(`  Explorer: ${services.ethereumExplorer}`);
    
    console.log('\nChecking requirements...');
    services.checkRequirements()
        .then(result => {
            console.log('\nBalance Check:');
            console.log(`BTC Maker: ${result.balances.bitcoin.maker.balanceBTC} BTC`);
            console.log(`BTC Resolver: ${result.balances.bitcoin.resolver.balanceBTC} BTC`);
            console.log(`ETH Resolver: ${result.balances.ethereum.resolver.balanceETH} ETH`);
            console.log(`ETH Taker: ${result.balances.ethereum.taker.balanceETH} ETH`);
            
            console.log('\nRequirements Met:');
            console.log(`BTC Maker (0.001+): ${result.requirements.bitcoin.maker ? '✅' : '❌'}`);
            console.log(`BTC Resolver (0.001+): ${result.requirements.bitcoin.resolver ? '✅' : '❌'}`);
            console.log(`ETH Resolver (0.01+): ${result.requirements.ethereum.resolver ? '✅' : '❌'}`);
            console.log(`ETH Taker (0.01+): ${result.requirements.ethereum.taker ? '✅' : '❌'}`);
        })
        .catch(console.error);
}