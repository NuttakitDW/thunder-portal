// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./SimpleEscrow.sol";

/**
 * @title SimpleEscrowFactory
 * @notice A simplified escrow factory for Thunder Portal MVP
 * @dev Creates escrow contracts for cross-chain atomic swaps
 */
contract SimpleEscrowFactory {
    // Mapping from order hash to escrow address
    mapping(bytes32 => address) public escrows;
    
    // Event emitted when a new escrow is created
    event EscrowCreated(
        bytes32 indexed orderHash,
        address indexed escrow,
        address indexed maker,
        bytes32 htlcHashlock
    );
    
    /**
     * @notice Creates a new escrow for a cross-chain order
     * @param orderHash The hash of the order
     * @param maker The maker of the order
     * @param receiver The receiver of the funds
     * @param htlcHashlock The hashlock for the HTLC
     * @param htlcTimeout The timeout for the HTLC
     * @return escrow The address of the created escrow
     */
    function createEscrow(
        bytes32 orderHash,
        address maker,
        address receiver,
        bytes32 htlcHashlock,
        uint256 htlcTimeout
    ) external returns (address escrow) {
        require(escrows[orderHash] == address(0), "Escrow already exists");
        require(maker != address(0), "Invalid maker address");
        require(receiver != address(0), "Invalid receiver address");
        require(htlcHashlock != bytes32(0), "Invalid hashlock");
        require(htlcTimeout > block.timestamp, "Timeout must be in future");
        
        // Create new escrow contract
        escrow = address(new SimpleEscrow(
            orderHash,
            maker,
            receiver,
            htlcHashlock,
            htlcTimeout
        ));
        
        // Store escrow address
        escrows[orderHash] = escrow;
        
        emit EscrowCreated(orderHash, escrow, maker, htlcHashlock);
    }
    
    /**
     * @notice Gets the escrow address for an order
     * @param orderHash The hash of the order
     * @return The address of the escrow (or zero address if not exists)
     */
    function getEscrow(bytes32 orderHash) external view returns (address) {
        return escrows[orderHash];
    }
    
    /**
     * @notice Checks if an escrow exists for an order
     * @param orderHash The hash of the order
     * @return True if escrow exists, false otherwise
     */
    function escrowExists(bytes32 orderHash) external view returns (bool) {
        return escrows[orderHash] != address(0);
    }
}