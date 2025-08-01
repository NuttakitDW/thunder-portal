// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title SimpleEscrow
 * @notice A simple escrow contract for cross-chain atomic swaps
 * @dev Holds funds and releases them based on HTLC conditions
 */
contract SimpleEscrow {
    // Order details
    bytes32 public immutable orderHash;
    address public immutable maker;
    address public immutable receiver;
    
    // HTLC parameters
    bytes32 public immutable htlcHashlock;
    uint256 public immutable htlcTimeout;
    
    // State
    uint256 public lockedAmount;
    bool public isActive;
    bool public isClaimed;
    
    // Events
    event HTLCCreated(uint256 amount, bytes32 hashlock, uint256 timeout);
    event HTLCClaimed(bytes32 preimage, uint256 amount);
    event HTLCRefunded(uint256 amount);
    
    constructor(
        bytes32 _orderHash,
        address _maker,
        address _receiver,
        bytes32 _htlcHashlock,
        uint256 _htlcTimeout
    ) {
        orderHash = _orderHash;
        maker = _maker;
        receiver = _receiver;
        htlcHashlock = _htlcHashlock;
        htlcTimeout = _htlcTimeout;
    }
    
    /**
     * @notice Creates an HTLC by locking ETH
     */
    function createHTLC() external payable {
        require(!isActive, "HTLC already active");
        require(msg.value > 0, "Must send ETH");
        require(msg.sender == maker, "Only maker can create HTLC");
        
        lockedAmount = msg.value;
        isActive = true;
        
        emit HTLCCreated(msg.value, htlcHashlock, htlcTimeout);
    }
    
    /**
     * @notice Claims the HTLC with the correct preimage
     * @param preimage The preimage that hashes to the hashlock
     */
    function claimHTLC(bytes32 preimage) external {
        require(isActive, "HTLC not active");
        require(!isClaimed, "Already claimed");
        require(sha256(abi.encodePacked(preimage)) == htlcHashlock, "Invalid preimage");
        require(block.timestamp < htlcTimeout, "HTLC expired");
        
        isClaimed = true;
        isActive = false;
        
        uint256 amount = lockedAmount;
        lockedAmount = 0;
        
        emit HTLCClaimed(preimage, amount);
        
        // Transfer to receiver
        (bool success,) = receiver.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @notice Refunds the HTLC after timeout
     */
    function refundHTLC() external {
        require(isActive, "HTLC not active");
        require(!isClaimed, "Already claimed");
        require(block.timestamp >= htlcTimeout, "HTLC not expired");
        require(msg.sender == maker, "Only maker can refund");
        
        isActive = false;
        
        uint256 amount = lockedAmount;
        lockedAmount = 0;
        
        emit HTLCRefunded(amount);
        
        // Refund to maker
        (bool success,) = maker.call{value: amount}("");
        require(success, "Refund failed");
    }
    
    /**
     * @notice Gets the current status of the escrow
     */
    function getStatus() external view returns (
        bool active,
        uint256 amount,
        uint256 timeout,
        bool claimed
    ) {
        return (isActive, lockedAmount, htlcTimeout, isClaimed);
    }
}