const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossChainOrder", function () {
    let crossChainOrderLib;
    let owner, user, resolver;
    
    // Special Bitcoin marker address
    const BTC_ADDRESS = "0x0000000000000000000000000000000000000BTC";
    
    beforeEach(async function () {
        [owner, user, resolver] = await ethers.getSigners();
        
        // Deploy a test contract that uses the CrossChainOrder library
        const CrossChainOrderTest = await ethers.getContractFactory("CrossChainOrderTest");
        crossChainOrderLib = await CrossChainOrderTest.deploy();
        await crossChainOrderLib.deployed();
    });
    
    describe("Bitcoin address validation", function () {
        it("should validate legacy Bitcoin addresses (starting with 1)", async function () {
            const btcAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"; // Satoshi's address
            const result = await crossChainOrderLib.validateBitcoinAddress(btcAddress);
            expect(result).to.be.true;
        });
        
        it("should validate P2SH Bitcoin addresses (starting with 3)", async function () {
            const btcAddress = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";
            const result = await crossChainOrderLib.validateBitcoinAddress(btcAddress);
            expect(result).to.be.true;
        });
        
        it("should validate Segwit Bitcoin addresses (starting with bc1)", async function () {
            const btcAddress = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
            const result = await crossChainOrderLib.validateBitcoinAddress(btcAddress);
            expect(result).to.be.true;
        });
        
        it("should reject invalid Bitcoin addresses", async function () {
            const invalidAddresses = [
                "",                              // Empty
                "invalid",                       // Too short
                "2A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", // Invalid prefix
                "0x742d35Cc6634C0532925a3b844Bc9e7595f6fed" // Ethereum address
            ];
            
            for (const addr of invalidAddresses) {
                const result = await crossChainOrderLib.validateBitcoinAddress(addr);
                expect(result).to.be.false;
            }
        });
    });
    
    describe("Cross-chain order validation", function () {
        it("should validate a complete cross-chain order", async function () {
            const baseOrder = {
                salt: ethers.BigNumber.from("12345"),
                maker: owner.address,
                receiver: owner.address,
                makerAsset: BTC_ADDRESS,  // BTC as maker asset
                takerAsset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
                makingAmount: ethers.utils.parseUnits("1", 8), // 1 BTC
                takingAmount: ethers.utils.parseUnits("50000", 6), // 50,000 USDC
                makerTraits: ethers.BigNumber.from("0")
            };
            
            const crossChainData = {
                baseOrder: baseOrder,
                btcAddress: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
                htlcHashlock: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret")),
                htlcTimeout: Math.floor(Date.now() / 1000) + 86400, // 24 hours
                minConfirmations: 3
            };
            
            const result = await crossChainOrderLib.validateCrossChainOrder(crossChainData);
            expect(result).to.be.true;
        });
        
        it("should reject order with missing Bitcoin address when BTC is involved", async function () {
            const baseOrder = {
                salt: ethers.BigNumber.from("12345"),
                maker: owner.address,
                receiver: owner.address,
                makerAsset: BTC_ADDRESS,
                takerAsset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                makingAmount: ethers.utils.parseUnits("1", 8),
                takingAmount: ethers.utils.parseUnits("50000", 6),
                makerTraits: ethers.BigNumber.from("0")
            };
            
            const crossChainData = {
                baseOrder: baseOrder,
                btcAddress: "", // Missing Bitcoin address
                htlcHashlock: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret")),
                htlcTimeout: Math.floor(Date.now() / 1000) + 86400,
                minConfirmations: 3
            };
            
            const result = await crossChainOrderLib.validateCrossChainOrder(crossChainData);
            expect(result).to.be.false;
        });
    });
    
    describe("Extension encoding/decoding", function () {
        it("should encode and decode cross-chain extension data", async function () {
            const btcAddress = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
            const htlcHashlock = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-secret"));
            const htlcTimeout = Math.floor(Date.now() / 1000) + 7200; // 2 hours
            const minConfirmations = 6;
            
            // Encode the extension
            const encoded = await crossChainOrderLib.encodeCrossChainExtension(
                btcAddress,
                htlcHashlock,
                htlcTimeout,
                minConfirmations
            );
            
            // Decode the extension
            const decoded = await crossChainOrderLib.decodeCrossChainExtension(encoded);
            
            expect(decoded.btcAddress).to.equal(btcAddress);
            expect(decoded.htlcHashlock).to.equal(htlcHashlock);
            expect(decoded.htlcTimeout).to.equal(htlcTimeout);
            expect(decoded.minConfirmations).to.equal(minConfirmations);
        });
    });
});