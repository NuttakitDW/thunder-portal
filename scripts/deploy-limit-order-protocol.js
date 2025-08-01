const hre = require("hardhat");

async function main() {
    console.log("Deploying 1inch Limit Order Protocol...");
    
    // Get the network and accounts
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Get the network name
    const network = await hre.ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId);
    
    // WETH addresses by network
    const wethAddresses = {
        1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // Mainnet
        5: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", // Goerli
        11155111: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", // Sepolia
        31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Hardhat/Localhost (you may need to deploy WETH first)
    };
    
    // Get WETH address for current network
    let wethAddress = wethAddresses[network.chainId];
    
    // If on local network and no WETH, deploy a mock
    if (network.chainId === 31337n || network.chainId === 1337n) {
        console.log("Deploying WETH mock for local network...");
        const WETH = await hre.ethers.getContractFactory("WETH9");
        const weth = await WETH.deploy();
        await weth.waitForDeployment();
        wethAddress = await weth.getAddress();
        console.log("WETH deployed to:", wethAddress);
    }
    
    if (!wethAddress) {
        throw new Error(`No WETH address configured for network ${network.chainId}`);
    }
    
    console.log("Using WETH address:", wethAddress);
    
    // Deploy LimitOrderProtocol
    const LimitOrderProtocol = await hre.ethers.getContractFactory("LimitOrderProtocol");
    const limitOrderProtocol = await LimitOrderProtocol.deploy(wethAddress);
    await limitOrderProtocol.waitForDeployment();
    
    const limitOrderAddress = await limitOrderProtocol.getAddress();
    console.log("✅ Limit Order Protocol deployed to:", limitOrderAddress);
    
    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        network: "localhost",
        chainId: Number(network.chainId),
        limitOrderProtocol: limitOrderAddress,
        weth: wethAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };
    
    const deploymentPath = './deployments/limit-order-protocol.json';
    if (!fs.existsSync('./deployments')) {
        fs.mkdirSync('./deployments');
    }
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment info saved to ${deploymentPath}`);
    
    // Verify on Etherscan if not local
    if (network.chainId !== 31337n && network.chainId !== 1337n) {
        console.log("Waiting for block confirmations...");
        await limitOrderProtocol.deploymentTransaction().wait(5);
        
        console.log("Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: limitOrderAddress,
                constructorArguments: [wethAddress],
            });
        } catch (error) {
            console.log("Verification failed:", error.message);
        }
    }
    
    return limitOrderAddress;
}

// Execute if run directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;