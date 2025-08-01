const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy SimpleEscrowFactory contract using Hardhat
 * This script deploys the SimpleEscrowFactory which is used for creating
 * Ethereum escrows in atomic swaps
 */
async function main() {
    console.log("\n🚀 Deploying SimpleEscrowFactory...");
    console.log("==================================\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");

    // Deploy SimpleEscrowFactory
    console.log("1️⃣  Deploying SimpleEscrowFactory...");
    
    // Get the contract factory
    const SimpleEscrowFactory = await ethers.getContractFactory("SimpleEscrowFactory");
    
    // Deploy with gas limit to avoid issues
    const factory = await SimpleEscrowFactory.deploy({
        gasLimit: 3000000
    });
    
    // Wait for deployment
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    
    console.log("✅ SimpleEscrowFactory deployed to:", factoryAddress);

    // Test the factory by calling a view function
    console.log("\n2️⃣  Testing deployment...");
    try {
        // Create a test order hash
        const testOrderHash = ethers.keccak256(ethers.toUtf8Bytes("test-order"));
        console.log("   Test order hash:", testOrderHash);
        
        // Try to get escrow address (should return zero address for non-existent escrow)
        const testEscrowAddress = await factory.escrows(testOrderHash);
        console.log("   Test escrow address (should be zero):", testEscrowAddress);
        
        if (testEscrowAddress === "0x0000000000000000000000000000000000000000") {
            console.log("✅ Factory is working correctly!");
        }
    } catch (error) {
        console.log("⚠️  Factory test failed:", error.message);
    }

    // Save deployment information
    const deploymentInfo = {
        network: "localhost",
        timestamp: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber(),
        contracts: {
            SimpleEscrowFactory: {
                address: factoryAddress,
                deployer: deployer.address,
                deploymentTx: factory.deploymentTransaction()?.hash
            }
        },
        gasUsed: {
            deployment: "~3,000,000"
        }
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment info
    const deploymentPath = path.join(deploymentsDir, "simple-escrow-factory.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to:", deploymentPath);

    // Also save to evm-resolver deployments for backward compatibility
    const evmDeploymentsDir = path.join(__dirname, "../evm-resolver/deployments");
    if (!fs.existsSync(evmDeploymentsDir)) {
        fs.mkdirSync(evmDeploymentsDir, { recursive: true });
    }
    
    const evmDeploymentPath = path.join(evmDeploymentsDir, "simple-escrow-factory-local.json");
    fs.writeFileSync(evmDeploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Backup deployment info saved to:", evmDeploymentPath);

    console.log("\n✅ SimpleEscrowFactory deployment complete!");
    console.log("📋 Summary:");
    console.log("   • Contract Address:", factoryAddress);
    console.log("   • Network: Localhost (Hardhat)");
    console.log("   • Deployer:", deployer.address);
    console.log("   • Block Number:", await ethers.provider.getBlockNumber());
    
    return {
        factoryAddress,
        deploymentInfo
    };
}

// Execute deployment
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("\n❌ Deployment failed:");
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;