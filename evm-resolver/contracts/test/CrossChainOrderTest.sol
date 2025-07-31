// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../src/CrossChainOrder.sol";
import "../lib/cross-chain-swap/lib/limit-order-protocol/contracts/interfaces/IOrderMixin.sol";

/**
 * @title CrossChainOrderTest
 * @notice Test contract to expose CrossChainOrder library functions for testing
 */
contract CrossChainOrderTest {
    using CrossChainOrder for CrossChainOrder.CrossChainOrderData;
    
    /**
     * @notice Tests Bitcoin address validation
     */
    function validateBitcoinAddress(string calldata btcAddress) external pure returns (bool) {
        bytes memory btcAddrBytes = bytes(btcAddress);
        
        if (btcAddrBytes.length < 26) {
            return false;
        }
        
        // Check for valid Bitcoin address prefixes
        if (btcAddrBytes[0] != 0x31 && // '1' - Legacy
            btcAddrBytes[0] != 0x33 && // '3' - P2SH
            !(btcAddrBytes[0] == 0x62 && btcAddrBytes[1] == 0x63 && btcAddrBytes[2] == 0x31)) { // 'bc1' - Segwit
            return false;
        }
        
        return true;
    }
    
    /**
     * @notice Tests cross-chain order validation
     */
    function validateCrossChainOrder(
        CrossChainOrder.CrossChainOrderData calldata order
    ) external pure returns (bool) {
        return order.validate();
    }
    
    /**
     * @notice Tests extension encoding
     */
    function encodeCrossChainExtension(
        string calldata btcAddress,
        bytes32 htlcHashlock,
        uint256 htlcTimeout,
        uint256 minConfirmations
    ) external pure returns (bytes memory) {
        return CrossChainOrder.encodeCrossChainExtension(
            btcAddress,
            htlcHashlock,
            htlcTimeout,
            minConfirmations
        );
    }
    
    /**
     * @notice Tests extension decoding
     */
    function decodeCrossChainExtension(bytes calldata extension) external pure returns (
        string memory btcAddress,
        bytes32 htlcHashlock,
        uint256 htlcTimeout,
        uint256 minConfirmations
    ) {
        return CrossChainOrder.decodeCrossChainExtension(extension);
    }
}