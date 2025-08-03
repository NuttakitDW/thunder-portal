#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.testnet' });

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const SEPOLIA_ESCROW_FACTORY = process.env.SEPOLIA_ESCROW_FACTORY;

if (!ETHERSCAN_API_KEY) {
    console.error('❌ ETHERSCAN_API_KEY not found in .env.testnet');
    process.exit(1);
}

if (!SEPOLIA_ESCROW_FACTORY) {
    console.error('❌ SEPOLIA_ESCROW_FACTORY address not found in .env.testnet');
    process.exit(1);
}

console.log('🔍 Verifying contracts on Etherscan...');
console.log(`Contract address: ${SEPOLIA_ESCROW_FACTORY}`);

// First, let's check if we have the contract source and deployment info
const contractPath = path.join(__dirname, '../contracts');
const deploymentPath = path.join(__dirname, '../deployments');

console.log('\n📂 Checking contract files...');

// Check if we have hardhat config
const hardhatConfigPath = path.join(__dirname, '../hardhat.config.js');
if (!fs.existsSync(hardhatConfigPath)) {
    console.error('❌ hardhat.config.js not found. Creating one...');
    
    const hardhatConfig = `require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config({ path: ".env.testnet" });

module.exports = {
  solidity: "0.8.17",
  networks: {
    sepolia: {
      url: process.env.ETHEREUM_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.ETH_RESOLVER_PRIVATE_KEY ? [process.env.ETH_RESOLVER_PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};`;
    
    fs.writeFileSync(hardhatConfigPath, hardhatConfig);
    console.log('✅ Created hardhat.config.js');
}

// Try to verify using hardhat
try {
    console.log('\n🚀 Running contract verification...');
    
    // Change to project root directory
    process.chdir(path.join(__dirname, '..'));
    
    // Check if we need to install hardhat verify plugin
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!packageJson.devDependencies || !packageJson.devDependencies['@nomicfoundation/hardhat-verify']) {
        console.log('📦 Installing hardhat-verify plugin...');
        execSync('npm install --save-dev @nomicfoundation/hardhat-verify', { stdio: 'inherit' });
    }
    
    // Run verification
    const verifyCommand = `npx hardhat verify --network sepolia ${SEPOLIA_ESCROW_FACTORY}`;
    console.log(`Running: ${verifyCommand}`);
    
    execSync(verifyCommand, { stdio: 'inherit' });
    
    console.log('\n✅ Contract verification completed!');
    console.log(`View on Etherscan: https://sepolia.etherscan.io/address/${SEPOLIA_ESCROW_FACTORY}#code`);
    
} catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.log('\n💡 Manual verification steps:');
    console.log('1. Go to https://sepolia.etherscan.io/verifyContract');
    console.log(`2. Enter contract address: ${SEPOLIA_ESCROW_FACTORY}`);
    console.log('3. Select compiler version and optimization settings used during deployment');
    console.log('4. Upload contract source code');
    console.log(`5. Enter API Key: ${ETHERSCAN_API_KEY}`);
}