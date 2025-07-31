// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IEscrow
 * @notice Interface for escrow contracts that handle cross-chain HTLCs
 */
interface IEscrow {
    /**
     * @notice Verifies that the HTLC parameters match the expected values
     * @param htlcHashlock The hashlock to verify
     */
    function verifyHTLCParameters(bytes32 htlcHashlock) external view;
    
    /**
     * @notice Creates an HTLC for the Ethereum side of the swap
     * @param recipient The recipient of the funds
     * @param amount The amount to lock
     * @param htlcHashlock The hashlock for the HTLC
     * @param timeout The timeout for the HTLC
     */
    function createHTLC(
        address recipient,
        uint256 amount,
        bytes32 htlcHashlock,
        uint256 timeout
    ) external payable;
    
    /**
     * @notice Claims the HTLC with the preimage
     * @param preimage The preimage that hashes to the hashlock
     */
    function claimHTLC(bytes32 preimage) external;
    
    /**
     * @notice Refunds the HTLC after timeout
     */
    function refundHTLC() external;
    
    /**
     * @notice Returns the status of the escrow
     * @return isActive Whether the escrow has an active HTLC
     * @return amount The amount locked in the HTLC
     * @return timeout The timeout of the HTLC
     */
    function getStatus() external view returns (
        bool isActive,
        uint256 amount,
        uint256 timeout
    );
}