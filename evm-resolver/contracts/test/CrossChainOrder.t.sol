// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/CrossChainOrder.sol";
import "../lib/cross-chain-swap/lib/limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import "../lib/cross-chain-swap/lib/limit-order-protocol/contracts/libraries/MakerTraitsLib.sol";

contract CrossChainOrderTest is Test {
    using AddressLib for address;
    using MakerTraitsLib for uint256;
    using CrossChainOrder for CrossChainOrder.CrossChainOrderData;
    
    // Special Bitcoin marker address (BTC in hex = 0x42544300)
    address constant BTC_ADDRESS = address(0x0000000000000000000000000000000042544300);
    address constant USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    
    address owner = address(0x1);
    address user = address(0x2);
    address resolver = address(0x3);
    
    function setUp() public {
        vm.label(owner, "Owner");
        vm.label(user, "User");
        vm.label(resolver, "Resolver");
        vm.label(BTC_ADDRESS, "BTC");
        vm.label(USDC_ADDRESS, "USDC");
    }
    
    function testValidateLegacyBitcoinAddress() public {
        // Satoshi's address
        string memory btcAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
        
        CrossChainOrder.CrossChainOrderData memory order = _createValidOrder();
        order.btcAddress = btcAddress;
        
        assertTrue(order.validate());
    }
    
    function testValidateP2SHBitcoinAddress() public {
        string memory btcAddress = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";
        
        CrossChainOrder.CrossChainOrderData memory order = _createValidOrder();
        order.btcAddress = btcAddress;
        
        assertTrue(order.validate());
    }
    
    function testValidateSegwitBitcoinAddress() public {
        string memory btcAddress = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
        
        CrossChainOrder.CrossChainOrderData memory order = _createValidOrder();
        order.btcAddress = btcAddress;
        
        assertTrue(order.validate());
    }
    
    function testRejectInvalidBitcoinAddresses() public {
        string[4] memory invalidAddresses = [
            "",                                    // Empty
            "invalid",                              // Too short
            "2A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",  // Invalid prefix
            "0x742d35Cc6634C0532925a3b844Bc9e7595f6fed" // Ethereum address
        ];
        
        for (uint i = 0; i < invalidAddresses.length; i++) {
            CrossChainOrder.CrossChainOrderData memory order = _createValidOrder();
            order.btcAddress = invalidAddresses[i];
            assertFalse(order.validate(), string.concat("Should reject: ", invalidAddresses[i]));
        }
    }
    
    function testValidateCrossChainOrder() public {
        CrossChainOrder.CrossChainOrderData memory order = _createValidOrder();
        assertTrue(order.validate());
    }
    
    function testRejectOrderWithMissingBitcoinAddress() public {
        CrossChainOrder.CrossChainOrderData memory order = _createValidOrder();
        order.btcAddress = ""; // Missing Bitcoin address
        
        assertFalse(order.validate());
    }
    
    function testRejectOrderWithZeroHashlock() public {
        CrossChainOrder.CrossChainOrderData memory order = _createValidOrder();
        order.htlcHashlock = bytes32(0);
        
        assertFalse(order.validate());
    }
    
    function testRejectOrderWithInvalidTimeoutHierarchy() public {
        CrossChainOrder.CrossChainOrderData memory order = _createValidOrder();
        // Set Bitcoin timeout less than Ethereum timeout
        // Expiration is stored in bits 80-119 (offset 80, 40 bits)
        uint256 ethExpiration = block.timestamp + 86400; // 24 hours
        order.baseOrder.makerTraits = MakerTraits.wrap(ethExpiration << 80);
        order.htlcTimeout = block.timestamp + 43200; // 12 hours (invalid - should be > 24h)
        
        assertFalse(order.validate());
    }
    
    function testExtensionEncodingDecoding() public {
        string memory btcAddress = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
        bytes32 htlcHashlock = keccak256("test-secret");
        uint256 htlcTimeout = block.timestamp + 7200;
        uint256 minConfirmations = 6;
        
        // Encode the extension
        bytes memory encoded = CrossChainOrder.encodeCrossChainExtension(
            btcAddress,
            htlcHashlock,
            htlcTimeout,
            minConfirmations
        );
        
        // Decode the extension
        (
            string memory decodedBtcAddress,
            bytes32 decodedHashlock,
            uint256 decodedTimeout,
            uint256 decodedConfirmations
        ) = CrossChainOrder.decodeCrossChainExtension(encoded);
        
        assertEq(decodedBtcAddress, btcAddress);
        assertEq(decodedHashlock, htlcHashlock);
        assertEq(decodedTimeout, htlcTimeout);
        assertEq(decodedConfirmations, minConfirmations);
    }
    
    function testIsBitcoinAsset() public {
        assertTrue(CrossChainOrder.isBitcoinAsset(Address.wrap(uint256(uint160(BTC_ADDRESS)))));
        assertFalse(CrossChainOrder.isBitcoinAsset(Address.wrap(uint256(uint160(USDC_ADDRESS)))));
        assertFalse(CrossChainOrder.isBitcoinAsset(Address.wrap(uint256(uint160(address(0))))));
    }
    
    // Helper function to create a valid order
    function _createValidOrder() internal view returns (CrossChainOrder.CrossChainOrderData memory) {
        IOrderMixin.Order memory baseOrder = IOrderMixin.Order({
            salt: 12345,
            maker: Address.wrap(uint256(uint160(owner))),
            receiver: Address.wrap(uint256(uint160(owner))),
            makerAsset: Address.wrap(uint256(uint160(BTC_ADDRESS))),
            takerAsset: Address.wrap(uint256(uint160(USDC_ADDRESS))),
            makingAmount: 1e8, // 1 BTC
            takingAmount: 50000e6, // 50,000 USDC
            makerTraits: MakerTraits.wrap(0)
        });
        
        return CrossChainOrder.CrossChainOrderData({
            baseOrder: baseOrder,
            btcAddress: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
            htlcHashlock: keccak256("secret"),
            htlcTimeout: block.timestamp + 172800, // 48 hours
            minConfirmations: 3
        });
    }
}