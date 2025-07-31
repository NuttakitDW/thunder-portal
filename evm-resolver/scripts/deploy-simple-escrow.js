const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🚀 Deploying Simple EscrowFactory for Thunder Portal MVP...");
    console.log("================================================\n");

    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");

    // Deploy SimpleEscrowFactory
    console.log("1️⃣  Deploying SimpleEscrowFactory...");
    
    const SimpleEscrowFactory = await ethers.getContractFactory("SimpleEscrowFactory");
    const escrowFactory = await SimpleEscrowFactory.deploy();
    await escrowFactory.deployed();
    
    console.log("   ✅ SimpleEscrowFactory deployed to:", escrowFactory.address);

    // Test escrow creation
    console.log("\n2️⃣  Testing escrow creation...");
    const testOrderHash = ethers.keccak256(ethers.toUtf8Bytes("test-order-001"));
    const testHashlock = ethers.keccak256(ethers.toUtf8Bytes("test-secret"));
    const testTimeout = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    
    console.log("   Creating escrow with:");
    console.log("   - Order Hash:", testOrderHash);
    console.log("   - Maker:", deployer.address);
    console.log("   - Receiver:", deployer.address);
    console.log("   - HTLC Hashlock:", testHashlock);
    console.log("   - HTLC Timeout:", new Date(testTimeout * 1000).toISOString());

    const tx = await escrowFactory.createEscrow(
        testOrderHash,
        deployer.address,
        deployer.address,
        testHashlock,
        testTimeout
    );
    
    const receipt = await tx.wait();
    console.log("   ✅ Escrow created! Gas used:", receipt.gasUsed.toString());

    // Get escrow address
    const escrowAddress = await escrowFactory.getEscrow(testOrderHash);
    console.log("   📍 Escrow address:", escrowAddress);

    // Verify escrow exists
    const exists = await escrowFactory.escrowExists(testOrderHash);
    console.log("   ✔️  Escrow exists:", exists);

    // Test HTLC creation in the escrow
    console.log("\n3️⃣  Testing HTLC creation in escrow...");
    const SimpleEscrow = await ethers.getContractFactory("SimpleEscrow");
    const escrow = SimpleEscrow.attach(escrowAddress);
    
    // Send ETH to create HTLC
    const htlcAmount = ethers.parseEther("0.1");
    const htlcTx = await escrow.createHTLC({ value: htlcAmount });
    await htlcTx.wait();
    console.log("   ✅ HTLC created with", ethers.formatEther(htlcAmount), "ETH");

    // Check escrow status
    const status = await escrow.getStatus();
    console.log("   📊 Escrow status:");
    console.log("      - Active:", status.active);
    console.log("      - Amount:", ethers.formatEther(status.amount), "ETH");
    console.log("      - Timeout:", new Date(status.timeout.toNumber() * 1000).toISOString());
    console.log("      - Claimed:", status.claimed);

    // Save deployment info
    const deploymentInfo = {
        network: "hardhat-local",
        timestamp: new Date().toISOString(),
        contracts: {
            SimpleEscrowFactory: {
                address: escrowFactory.address,
                deployer: deployer.address
            },
            TestEscrow: {
                orderHash: testOrderHash,
                address: escrowAddress,
                htlcHashlock: testHashlock,
                htlcTimeout: testTimeout,
                htlcAmount: htlcAmount.toString()
            }
        }
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment info
    const deploymentPath = path.join(deploymentsDir, "simple-escrow-factory-local.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to:", deploymentPath);

    console.log("\n✅ Deployment complete!\n");
    console.log("📄 Contract Details:");
    console.log("   EscrowFactory:", escrowFactory.address);
    console.log("   Test Escrow:", escrowAddress);
    console.log("\nYou can now use this factory to create escrows for cross-chain swaps!");
    
    return deploymentInfo;
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });