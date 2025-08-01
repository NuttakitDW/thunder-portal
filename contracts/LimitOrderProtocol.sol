// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title LimitOrderProtocol
 * @notice Simplified interface to 1inch Limit Order Protocol for Thunder Portal integration
 * @dev This contract integrates with Thunder Portal to enable Bitcoin-Ethereum atomic swaps
 *      using 1inch's limit order infrastructure
 */
contract LimitOrderProtocol {
    address public immutable WETH;
    
    // Order status tracking
    mapping(bytes32 => bool) public filledOrders;
    mapping(bytes32 => uint256) public remainingAmount;
    
    // Events
    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed taker,
        uint256 makingAmount,
        uint256 takingAmount
    );
    
    event OrderCanceled(
        bytes32 indexed orderHash,
        address indexed maker
    );
    
    constructor(address _weth) {
        WETH = _weth;
    }
    
    /**
     * @notice Fills a limit order
     * @dev In Thunder Portal, this is called when Bitcoin HTLC is confirmed
     * @param orderHash Hash of the order being filled
     * @param maker Address of the order maker
     * @param taker Address filling the order
     * @param makingAmount Amount of maker asset
     * @param takingAmount Amount of taker asset
     */
    function fillOrder(
        bytes32 orderHash,
        address maker,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount
    ) external {
        require(!filledOrders[orderHash], "Order already filled");
        
        filledOrders[orderHash] = true;
        
        emit OrderFilled(orderHash, maker, taker, makingAmount, takingAmount);
    }
    
    /**
     * @notice Cancels a limit order
     * @param orderHash Hash of the order to cancel
     */
    function cancelOrder(bytes32 orderHash) external {
        require(!filledOrders[orderHash], "Order already filled");
        
        filledOrders[orderHash] = true;
        
        emit OrderCanceled(orderHash, msg.sender);
    }
    
    /**
     * @notice Checks if an order has been filled
     * @param orderHash Hash of the order to check
     * @return bool True if order has been filled
     */
    function isOrderFilled(bytes32 orderHash) external view returns (bool) {
        return filledOrders[orderHash];
    }
    
    /**
     * @notice Integration point for Thunder Portal
     * @dev Called by Thunder Portal when initiating cross-chain swap
     * @param orderHash Unique identifier for the swap order
     * @param bitcoinAmount Amount of Bitcoin being swapped
     * @param ethereumAmount Amount of Ethereum being swapped
     */
    function initiateCrossChainSwap(
        bytes32 orderHash,
        uint256 bitcoinAmount,
        uint256 ethereumAmount
    ) external {
        // Integration logic with Thunder Portal's escrow system
        remainingAmount[orderHash] = ethereumAmount;
    }
}