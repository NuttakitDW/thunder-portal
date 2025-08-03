#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load wallet configuration
const walletsFile = path.join(__dirname, '..', 'doc', 'testnet-wallets', 'wallets-sensitive.json');
const wallets = JSON.parse(fs.readFileSync(walletsFile, 'utf8'));

// Contract ABIs and bytecodes
const SimpleEscrowFactory = require('../artifacts/contracts/SimpleEscrowFactory.sol/SimpleEscrowFactory.json');

async function main() {
    console.log('🚀 Deploying contracts to Sepolia...\n');

    // Connect to Sepolia
    const provider = new ethers.providers.JsonRpcProvider(
        process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/7979b6b00e674dfabafcea1aac484f66'
    );

    // Use resolver wallet (has the most ETH)
    const wallet = new ethers.Wallet(wallets.ethereum.resolver.privateKey, provider);
    console.log('Using deployer address:', wallet.address);

    // Check balance
    const balance = await wallet.getBalance();
    console.log('Balance:', ethers.utils.formatEther(balance), 'ETH');

    if (balance.lt(ethers.utils.parseEther('0.1'))) {
        console.error('❌ Insufficient balance for deployment. Need at least 0.1 ETH');
        process.exit(1);
    }

    // Get gas price
    const gasPrice = await provider.getGasPrice();
    console.log('Gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei\n');

    try {
        // Deploy SimpleEscrowFactory
        console.log('Deploying SimpleEscrowFactory...');
        const factory = new ethers.ContractFactory(
            SimpleEscrowFactory.abi,
            SimpleEscrowFactory.bytecode,
            wallet
        );

        const escrowFactory = await factory.deploy({
            gasPrice: gasPrice.mul(110).div(100) // 10% buffer
        });

        console.log('Transaction hash:', escrowFactory.deployTransaction.hash);
        console.log('Waiting for confirmation...');
        
        await escrowFactory.deployed();
        
        console.log('✅ SimpleEscrowFactory deployed at:', escrowFactory.address);

        // Save deployment info
        const deployment = {
            network: 'sepolia',
            chainId: 11155111,
            contracts: {
                SimpleEscrowFactory: {
                    address: escrowFactory.address,
                    transactionHash: escrowFactory.deployTransaction.hash,
                    deployer: wallet.address,
                    timestamp: new Date().toISOString()
                }
            }
        };

        const deploymentFile = path.join(__dirname, '..', 'deployments', 'sepolia-deployment.json');
        fs.mkdirSync(path.dirname(deploymentFile), { recursive: true });
        fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

        console.log('\n📄 Deployment saved to:', deploymentFile);
        console.log('\n🔍 View on Sepolia Etherscan:');
        console.log(`https://sepolia.etherscan.io/address/${escrowFactory.address}`);

        // Update .env files with the deployed address
        const envFiles = [
            path.join(__dirname, '..', '.env.testnet'),
            path.join(__dirname, '..', 'resolver', '.env'),
            path.join(__dirname, '..', 'relayer', '.env')
        ];

        const envUpdate = `\n# Sepolia Contracts\nSEPOLIA_ESCROW_FACTORY=${escrowFactory.address}\n`;

        for (const envFile of envFiles) {
            if (fs.existsSync(envFile)) {
                const content = fs.readFileSync(envFile, 'utf8');
                if (!content.includes('SEPOLIA_ESCROW_FACTORY')) {
                    fs.appendFileSync(envFile, envUpdate);
                    console.log(`Updated ${envFile}`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });