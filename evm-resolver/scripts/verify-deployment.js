const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n🔍 Verifying SimpleEscrowFactory deployment...");
    console.log("=============================================\n");

    const factoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    console.log("Factory address:", factoryAddress);

    // Get signer
    const [deployer] = await ethers.getSigners();
    
    // Load ABI
    const artifactPath = path.join(__dirname, "../dist/contracts/SimpleEscrowFactory.sol/SimpleEscrowFactory.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Connect to factory
    const factory = new ethers.Contract(factoryAddress, artifact.abi, deployer);
    
    // Create a test escrow
    console.log("\n1️⃣  Creating test escrow...");
    const orderHash = ethers.keccak256(ethers.toUtf8Bytes("test-order-002"));
    const hashlock = ethers.keccak256(ethers.toUtf8Bytes("test-secret-002"));
    const timeout = Math.floor(Date.now() / 1000) + 86400;
    
    const tx = await factory.createEscrow(
        orderHash,
        deployer.address,
        deployer.address,
        hashlock,
        timeout
    );
    
    console.log("   📤 Transaction:", tx.hash);
    const receipt = await tx.wait();
    console.log("   ✅ Escrow created! Gas used:", receipt.gasUsed.toString());
    
    // Get escrow address
    const escrowAddress = await factory.getEscrow(orderHash);
    console.log("   📍 Escrow address:", escrowAddress);
    
    // Create HTLC
    console.log("\n2️⃣  Creating HTLC...");
    const escrowArtifact = JSON.parse(fs.readFileSync(
        path.join(__dirname, "../dist/contracts/SimpleEscrow.sol/SimpleEscrow.json"), 
        'utf8'
    ));
    const escrow = new ethers.Contract(escrowAddress, escrowArtifact.abi, deployer);
    
    const htlcTx = await escrow.createHTLC({ value: ethers.parseEther("0.1") });
    console.log("   📤 HTLC Transaction:", htlcTx.hash);
    await htlcTx.wait();
    console.log("   ✅ HTLC created!");
    
    // Check status
    const status = await escrow.getStatus();
    console.log("\n📊 Escrow Status:");
    console.log("   - Active:", status.active);
    console.log("   - Amount:", ethers.formatEther(status.amount), "ETH");
    console.log("   - Timeout:", new Date(Number(status.timeout) * 1000).toISOString());
    console.log("   - Claimed:", status.claimed);
    
    // Save deployment info
    const deploymentInfo = {
        network: "hardhat-local",
        timestamp: new Date().toISOString(),
        contracts: {
            SimpleEscrowFactory: {
                address: factoryAddress,
                deployer: deployer.address
            },
            TestEscrow: {
                orderHash: orderHash,
                address: escrowAddress,
                htlcHashlock: hashlock,
                htlcTimeout: timeout
            }
        }
    };
    
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentPath = path.join(deploymentsDir, "simple-escrow-deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n✅ Deployment verified and ready!");
    console.log("💾 Deployment info saved to:", deploymentPath);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error);
        process.exit(1);
    });