// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IEscrowFactory
 * @notice Interface for the factory that creates escrow contracts for cross-chain swaps
 */
interface IEscrowFactory {
    /**
     * @notice Creates a new escrow contract for a cross-chain order
     * @param orderHash The hash of the order
     * @param maker The maker of the order
     * @param receiver The receiver of the funds
     * @param htlcHashlock The hashlock for the HTLC
     * @param htlcTimeout The timeout for the HTLC
     * @return escrow The address of the created escrow contract
     */
    function createEscrow(
        bytes32 orderHash,
        address maker,
        address receiver,
        bytes32 htlcHashlock,
        uint256 htlcTimeout
    ) external returns (address escrow);
    
    /**
     * @notice Returns the escrow address for a given order
     * @param orderHash The hash of the order
     * @return The address of the escrow contract
     */
    function getEscrow(bytes32 orderHash) external view returns (address);
    
    /**
     * @notice Checks if an escrow exists for a given order
     * @param orderHash The hash of the order
     * @return Whether the escrow exists
     */
    function escrowExists(bytes32 orderHash) external view returns (bool);
}