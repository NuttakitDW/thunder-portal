#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.testnet' });

// Load contract ABI
const factoryArtifact = require('../artifacts/contracts/SimpleEscrowFactory.sol/SimpleEscrowFactory.json');
const escrowArtifact = require('../artifacts/contracts/SimpleEscrow.sol/SimpleEscrow.json');

async function createSepoliaEscrow() {
    console.log('🚀 Creating escrow on Sepolia...\n');
    
    // Setup provider and signer
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const signer = new ethers.Wallet(process.env.ETH_RESOLVER_PRIVATE_KEY, provider);
    
    console.log(`Using account: ${signer.address}`);
    
    // Check balance
    const balance = await signer.getBalance();
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH\n`);
    
    if (balance.lt(ethers.utils.parseEther('0.01'))) {
        console.error('❌ Insufficient balance. Need at least 0.01 ETH for gas');
        return;
    }
    
    // Connect to factory contract
    const factoryAddress = process.env.SEPOLIA_ESCROW_FACTORY;
    console.log(`Factory address: ${factoryAddress}`);
    
    const factory = new ethers.Contract(
        factoryAddress,
        factoryArtifact.abi,
        signer
    );
    
    // Create escrow parameters
    const orderHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`order-${Date.now()}`));
    const preimage = 'testpreimage123';
    const htlcHashlock = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(preimage));
    const htlcTimeout = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const ethAmount = ethers.utils.parseEther('0.001'); // 0.001 ETH
    
    // For this contract, maker is the one who creates and funds the escrow
    const maker = signer.address; // Resolver creates the escrow
    const receiver = process.env.ETH_TAKER_ADDRESS; // Taker receives after revealing preimage
    
    console.log('📝 Escrow parameters:');
    console.log(`  Order Hash: ${orderHash}`);
    console.log(`  Maker: ${maker}`);
    console.log(`  Receiver: ${receiver}`);
    console.log(`  HTLC Hashlock: ${htlcHashlock}`);
    console.log(`  HTLC Timeout: ${htlcTimeout}`);
    console.log(`  ETH Amount: ${ethers.utils.formatEther(ethAmount)} ETH`);
    console.log(`  Preimage: ${preimage}\n`);
    
    try {
        // Estimate gas for createEscrow (no value sent in this call)
        const gasEstimate = await factory.estimateGas.createEscrow(
            orderHash,
            maker,
            receiver,
            htlcHashlock,
            htlcTimeout
        );
        
        console.log(`Estimated gas: ${gasEstimate.toString()}`);
        
        // Get gas price
        const gasPrice = await provider.getGasPrice();
        console.log(`Gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
        
        const estimatedCost = gasEstimate.mul(gasPrice);
        console.log(`Estimated cost: ${ethers.utils.formatEther(estimatedCost)} ETH\n`);
        
        // Create escrow
        console.log('🔄 Sending transaction...');
        const tx = await factory.createEscrow(
            orderHash,
            maker,
            receiver,
            htlcHashlock,
            htlcTimeout,
            {
                gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
                gasPrice: gasPrice
            }
        );
        
        console.log(`Transaction hash: ${tx.hash}`);
        console.log(`View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Wait for confirmation
        console.log('\n⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Parse events to get escrow address
        const event = receipt.events.find(e => e.event === 'EscrowCreated');
        if (event) {
            const escrowAddress = event.args.escrow;
            console.log(`\n🎉 Escrow created at: ${escrowAddress}`);
            console.log(`View on Etherscan: https://sepolia.etherscan.io/address/${escrowAddress}`);
            
            // Save escrow details
            const escrowDetails = {
                orderHash,
                escrowAddress,
                htlcHashlock,
                htlcTimeout,
                ethAmount: ethAmount.toString(),
                preimage,
                maker,
                receiver,
                creator: signer.address,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                timestamp: new Date().toISOString(),
                network: 'sepolia',
                factoryAddress
            };
            
            const outputPath = path.join(__dirname, '..', 'deployments', 'sepolia-escrow.json');
            fs.writeFileSync(outputPath, JSON.stringify(escrowDetails, null, 2));
            console.log(`\n💾 Escrow details saved to: ${outputPath}`);
            
            return escrowDetails;
        }
        
    } catch (error) {
        console.error('\n❌ Error creating escrow:', error.message);
        if (error.error) {
            console.error('Contract error:', error.error);
        }
    }
}

// Run if called directly
if (require.main === module) {
    createSepoliaEscrow()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = createSepoliaEscrow;