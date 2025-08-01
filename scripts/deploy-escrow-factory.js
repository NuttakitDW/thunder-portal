const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying SimpleEscrowFactory...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Deploy SimpleEscrowFactory
  const SimpleEscrowFactory = await ethers.getContractFactory("SimpleEscrowFactory");
  const factory = await SimpleEscrowFactory.deploy();
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("SimpleEscrowFactory deployed to:", factoryAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "hardhat-local",
    timestamp: new Date().toISOString(),
    contracts: {
      SimpleEscrowFactory: {
        address: factoryAddress
      }
    }
  };
  
  const deploymentsDir = path.join(__dirname, "../evm-resolver/deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, "simple-escrow-factory-local.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentPath);
  
  // Create a test escrow
  console.log("\nCreating test escrow...");
  const orderHash = ethers.keccak256(ethers.toUtf8Bytes("test-order-001"));
  const hashlock = ethers.keccak256(ethers.toUtf8Bytes("test-secret"));
  const maker = deployer.address;
  const receiver = deployer.address;
  const timeout = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  
  const tx = await factory.createEscrow(orderHash, maker, receiver, hashlock, timeout);
  await tx.wait();
  
  const escrowAddress = await factory.getEscrow(orderHash);
  console.log("Test escrow created at:", escrowAddress);
  
  // Update deployment info with test escrow
  deploymentInfo.contracts.TestEscrow = {
    orderHash: orderHash,
    address: escrowAddress,
    htlcHashlock: hashlock,
    htlcTimeout: timeout
  };
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });