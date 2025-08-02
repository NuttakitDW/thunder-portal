const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying contracts to Sepolia testnet...");
  
  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Check balance
    const balance = await deployer.getBalance();
    const balanceInEth = balance.toString() / 1e18;
    console.log("Account balance:", balanceInEth.toFixed(4), "ETH");
    
    if (balanceInEth < 0.01) {
      console.error("❌ Insufficient balance! Need at least 0.01 ETH for deployment");
      process.exit(1);
    }
    
    // Deploy SimpleEscrowFactory
    console.log("\n📦 Deploying SimpleEscrowFactory...");
    const SimpleEscrowFactory = await hre.ethers.getContractFactory("SimpleEscrowFactory");
    const factory = await SimpleEscrowFactory.deploy();
    await factory.deployed();
    console.log("✅ SimpleEscrowFactory deployed to:", factory.address);
    console.log("   View on Etherscan: https://sepolia.etherscan.io/address/" + factory.address);
    
    // Wait for confirmations
    console.log("\n⏳ Waiting for 2 confirmations...");
    await factory.deployTransaction.wait(2);
    console.log("✅ Confirmed!");
    
    // Save deployment info
    const deployments = {
      network: "sepolia",
      contracts: {
        SimpleEscrowFactory: {
          address: factory.address,
          deployedAt: new Date().toISOString(),
          deployer: deployer.address,
          txHash: factory.deployTransaction.hash
        }
      }
    };
    
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    fs.writeFileSync(
      path.join(deploymentsDir, "sepolia-contracts.json"),
      JSON.stringify(deployments, null, 2)
    );
    
    console.log("\n✅ Deployment complete!");
    console.log("📄 Deployment info saved to deployments/sepolia-contracts.json");
    
    // Update service configurations
    console.log("\n🔧 Updating service configurations...");
    
    // Update resolver .env
    const resolverEnvPath = path.join(__dirname, "..", "resolver", ".env");
    if (fs.existsSync(resolverEnvPath)) {
      let resolverEnv = fs.readFileSync(resolverEnvPath, "utf8");
      resolverEnv = resolverEnv.replace(
        /ESCROW_FACTORY_ADDRESS=.*/,
        `ESCROW_FACTORY_ADDRESS=${factory.address}`
      );
      fs.writeFileSync(resolverEnvPath, resolverEnv);
      console.log("✅ Updated resolver service configuration");
    }
    
    console.log("\n🎉 All done! Your contracts are deployed to Sepolia.");
    console.log("\n📋 Next steps:");
    console.log("1. Restart services: make restart");
    console.log("2. Run testnet swap: make swap-testnet");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });