// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/SimpleEscrowFactory.sol";
import "../src/SimpleEscrow.sol";

contract SimpleEscrowFactoryTest is Test {
    SimpleEscrowFactory public factory;
    address constant MAKER = address(0x1);
    address constant TAKER = address(0x2);
    
    function setUp() public {
        factory = new SimpleEscrowFactory();
    }
    
    function testCreateEscrow() public {
        bytes32 orderHash = keccak256("order-1");
        bytes32 hashlock = keccak256("secret");
        uint256 timeout = block.timestamp + 1 hours;
        
        address escrow = factory.createEscrow(
            orderHash,
            MAKER,
            TAKER,
            hashlock,
            timeout
        );
        
        assertTrue(escrow != address(0), "Escrow should be created");
        assertTrue(factory.escrowExists(orderHash), "Escrow should exist");
        assertEq(factory.getEscrow(orderHash), escrow, "Escrow address should match");
    }
    
    function testCannotCreateDuplicateEscrow() public {
        bytes32 orderHash = keccak256("order-2");
        bytes32 hashlock = keccak256("secret");
        uint256 timeout = block.timestamp + 1 hours;
        
        factory.createEscrow(orderHash, MAKER, TAKER, hashlock, timeout);
        
        vm.expectRevert("Escrow already exists");
        factory.createEscrow(orderHash, MAKER, TAKER, hashlock, timeout);
    }
    
    function testHTLCFlow() public {
        // Create escrow
        bytes32 orderHash = keccak256("order-3");
        // Use a known preimage and compute its hash
        bytes32 preimage = bytes32(uint256(0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef));
        bytes32 hashlock = sha256(abi.encodePacked(preimage));
        uint256 timeout = block.timestamp + 1 hours;
        
        address escrowAddr = factory.createEscrow(
            orderHash,
            MAKER,
            TAKER,
            hashlock,
            timeout
        );
        
        SimpleEscrow escrow = SimpleEscrow(payable(escrowAddr));
        
        // Fund HTLC as maker
        vm.deal(MAKER, 1 ether);
        vm.prank(MAKER);
        escrow.createHTLC{value: 0.1 ether}();
        
        // Check status
        (bool active, uint256 amount,,) = escrow.getStatus();
        assertTrue(active, "HTLC should be active");
        assertEq(amount, 0.1 ether, "Amount should be 0.1 ETH");
        
        // Claim as taker with correct preimage
        vm.prank(TAKER);
        escrow.claimHTLC(preimage);
        
        // Check taker received funds
        assertEq(TAKER.balance, 0.1 ether, "Taker should receive funds");
    }
    
    function testRefundAfterTimeout() public {
        // Create escrow with short timeout
        bytes32 orderHash = keccak256("order-4");
        bytes32 preimage = bytes32(uint256(0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210));
        bytes32 hashlock = sha256(abi.encodePacked(preimage));
        uint256 timeout = block.timestamp + 1;
        
        address escrowAddr = factory.createEscrow(
            orderHash,
            MAKER,
            TAKER,
            hashlock,
            timeout
        );
        
        SimpleEscrow escrow = SimpleEscrow(payable(escrowAddr));
        
        // Fund HTLC
        vm.deal(MAKER, 1 ether);
        vm.prank(MAKER);
        escrow.createHTLC{value: 0.1 ether}();
        
        // Advance time past timeout
        vm.warp(block.timestamp + 2);
        
        // Refund as maker
        uint256 makerBalanceBefore = MAKER.balance;
        vm.prank(MAKER);
        escrow.refundHTLC();
        
        assertEq(MAKER.balance, makerBalanceBefore + 0.1 ether, "Maker should be refunded");
    }
}
