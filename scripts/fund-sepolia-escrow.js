#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.testnet' });

// Load contract ABI
const escrowArtifact = require('../artifacts/contracts/SimpleEscrow.sol/SimpleEscrow.json');

async function fundSepoliaEscrow() {
    console.log('💰 Funding escrow on Sepolia...\n');
    
    // Load escrow details
    const escrowDetailsPath = path.join(__dirname, '..', 'deployments', 'sepolia-escrow.json');
    if (!fs.existsSync(escrowDetailsPath)) {
        console.error('❌ No escrow details found. Run create-sepolia-escrow.js first');
        return;
    }
    
    const escrowDetails = JSON.parse(fs.readFileSync(escrowDetailsPath, 'utf8'));
    console.log(`Escrow address: ${escrowDetails.escrowAddress}`);
    console.log(`Amount to fund: ${ethers.utils.formatEther(escrowDetails.ethAmount)} ETH\n`);
    
    // Setup provider and signer (using maker's private key)
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const signer = new ethers.Wallet(process.env.ETH_RESOLVER_PRIVATE_KEY, provider);
    
    console.log(`Funding from: ${signer.address}`);
    
    // Check balance
    const balance = await signer.getBalance();
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH\n`);
    
    if (balance.lt(ethers.BigNumber.from(escrowDetails.ethAmount))) {
        console.error('❌ Insufficient balance to fund escrow');
        return;
    }
    
    // Connect to escrow contract
    const escrow = new ethers.Contract(
        escrowDetails.escrowAddress,
        escrowArtifact.abi,
        signer
    );
    
    // Check if already funded
    const currentAmount = await escrow.lockedAmount();
    if (currentAmount.gt(0)) {
        console.log(`✅ Escrow already funded with ${ethers.utils.formatEther(currentAmount)} ETH`);
        return;
    }
    
    try {
        // Estimate gas
        const gasEstimate = await escrow.estimateGas.createHTLC({
            value: escrowDetails.ethAmount
        });
        
        console.log(`Estimated gas: ${gasEstimate.toString()}`);
        
        // Get gas price
        const gasPrice = await provider.getGasPrice();
        console.log(`Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
        
        const estimatedCost = gasEstimate.mul(gasPrice);
        const totalCost = ethers.BigNumber.from(escrowDetails.ethAmount).add(estimatedCost);
        console.log(`Estimated gas cost: ${ethers.utils.formatEther(estimatedCost)} ETH`);
        console.log(`Total cost (including ETH to lock): ${ethers.utils.formatEther(totalCost)} ETH\n`);
        
        // Fund the escrow
        console.log('🔄 Sending transaction...');
        const tx = await escrow.createHTLC({
            value: escrowDetails.ethAmount,
            gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
            gasPrice: gasPrice
        });
        
        console.log(`Transaction hash: ${tx.hash}`);
        console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Wait for confirmation
        console.log('\n⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log('\n🎉 Escrow funded successfully!');
        
        // Update escrow details
        escrowDetails.fundingTxHash = tx.hash;
        escrowDetails.fundingBlockNumber = receipt.blockNumber;
        escrowDetails.fundedAt = new Date().toISOString();
        escrowDetails.status = 'funded';
        
        fs.writeFileSync(escrowDetailsPath, JSON.stringify(escrowDetails, null, 2));
        console.log(`\n💾 Updated escrow details saved`);
        
        // Verify the state
        const isActive = await escrow.isActive();
        const lockedAmount = await escrow.lockedAmount();
        console.log(`\n📊 Escrow state:`);
        console.log(`  Active: ${isActive}`);
        console.log(`  Locked amount: ${ethers.utils.formatEther(lockedAmount)} ETH`);
        
    } catch (error) {
        console.error('\n❌ Error funding escrow:', error.message);
        if (error.error) {
            console.error('Contract error:', error.error);
        }
    }
}

// Run if called directly
if (require.main === module) {
    fundSepoliaEscrow()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = fundSepoliaEscrow;