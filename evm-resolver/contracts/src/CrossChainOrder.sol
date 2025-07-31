// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/cross-chain-swap/lib/limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import "../lib/cross-chain-swap/lib/limit-order-protocol/contracts/libraries/MakerTraitsLib.sol";

/**
 * @title CrossChainOrder
 * @notice Extended order structure for cross-chain swaps that includes Bitcoin support
 * @dev This library extends the standard 1inch order to support Bitcoin addresses and HTLC requirements
 */
library CrossChainOrder {
    using AddressLib for Address;
    using MakerTraitsLib for MakerTraits;

    /**
     * @notice Extended order structure for cross-chain swaps
     * @dev Extends the standard Order with cross-chain specific fields
     */
    struct CrossChainOrderData {
        // Standard Order fields
        IOrderMixin.Order baseOrder;
        
        // Cross-chain extensions
        string btcAddress;           // Bitcoin address for BTC transfers (segwit/legacy)
        bytes32 htlcHashlock;       // The hash that will be used in both HTLCs
        uint256 htlcTimeout;        // Timeout for the HTLC (must be > Ethereum timeout)
        uint256 minConfirmations;   // Minimum Bitcoin confirmations required
    }

    /**
     * @notice Validates a cross-chain order
     * @param order The cross-chain order to validate
     * @return isValid Whether the order is valid
     */
    function validate(CrossChainOrderData memory order) internal pure returns (bool) {
        // Validate Bitcoin address is not empty when needed
        if (isBitcoinAsset(order.baseOrder.takerAsset) || isBitcoinAsset(order.baseOrder.makerAsset)) {
            if (bytes(order.btcAddress).length == 0) {
                return false;
            }
            
            // Basic Bitcoin address validation (starts with 1, 3, or bc1)
            bytes memory btcAddrBytes = bytes(order.btcAddress);
            if (btcAddrBytes.length < 26) { // Minimum Bitcoin address length
                return false;
            }
            
            // Check for valid Bitcoin address prefixes
            if (btcAddrBytes[0] != 0x31 && // '1' - Legacy
                btcAddrBytes[0] != 0x33 && // '3' - P2SH
                !(btcAddrBytes[0] == 0x62 && btcAddrBytes[1] == 0x63 && btcAddrBytes[2] == 0x31)) { // 'bc1' - Segwit
                return false;
            }
        }
        
        // Validate HTLC parameters
        if (order.htlcHashlock == bytes32(0)) {
            return false;
        }
        
        // Validate timeout hierarchy (Bitcoin timeout > Ethereum timeout)
        // Extract expiration from makerTraits (bits 80-119)
        uint256 ethTimeout = (MakerTraits.unwrap(order.baseOrder.makerTraits) >> 80) & type(uint40).max;
        if (ethTimeout != 0 && order.htlcTimeout <= ethTimeout) {
            return false;
        }
        
        return true;
    }

    /**
     * @notice Checks if an asset address represents Bitcoin
     * @param asset The asset address to check
     * @return isBtc Whether the asset represents Bitcoin
     */
    function isBitcoinAsset(Address asset) internal pure returns (bool) {
        // We use a special marker address to represent BTC in orders
        // 0x0000000000000000000000000000000000000BTC
        // Special marker address ending with BTC in hex (0x42544300...)
        return asset.get() == address(0x0000000000000000000000000000000042544300);
    }

    /**
     * @notice Encodes cross-chain order data for inclusion in order extension
     * @param btcAddress The Bitcoin address
     * @param htlcHashlock The HTLC hashlock
     * @param htlcTimeout The HTLC timeout
     * @param minConfirmations Minimum confirmations required
     * @return Encoded extension data
     */
    function encodeCrossChainExtension(
        string memory btcAddress,
        bytes32 htlcHashlock,
        uint256 htlcTimeout,
        uint256 minConfirmations
    ) internal pure returns (bytes memory) {
        return abi.encode(btcAddress, htlcHashlock, htlcTimeout, minConfirmations);
    }

    /**
     * @notice Decodes cross-chain extension data
     * @param extension The extension data to decode
     * @return btcAddress The Bitcoin address
     * @return htlcHashlock The HTLC hashlock
     * @return htlcTimeout The HTLC timeout
     * @return minConfirmations Minimum confirmations required
     */
    function decodeCrossChainExtension(bytes memory extension) internal pure returns (
        string memory btcAddress,
        bytes32 htlcHashlock,
        uint256 htlcTimeout,
        uint256 minConfirmations
    ) {
        (btcAddress, htlcHashlock, htlcTimeout, minConfirmations) = 
            abi.decode(extension, (string, bytes32, uint256, uint256));
    }
}