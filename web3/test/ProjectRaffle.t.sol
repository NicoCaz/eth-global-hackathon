// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ProjectRaffle} from "../contracts/ProjectRaffle.sol";
import {RaffleFactory} from "../contracts/RaffleFactory.sol";
import {MockEntropy} from "../contracts/test/MockEntropy.sol";

contract ProjectRaffleTest {
    ProjectRaffle public raffle;
    RaffleFactory public factory;
    MockEntropy public mockEntropy;
    
    address public factoryOwner = address(0x1);
    address public raffleCreator = address(0x2);
    address public buyer1 = address(0x3);
    address public buyer2 = address(0x4);
    address public projectReceiver = address(0x5);
    
    uint256 public constant PROJECT_PERCENTAGE = 5000; // 50%
    uint256 public constant RAFFLE_DURATION = 60; // 60 seconds
    
    function setUp() public {
        // Deploy MockEntropy
        mockEntropy = new MockEntropy(factoryOwner, 0.0001 ether);
        
        // Deploy Factory
        factory = new RaffleFactory(address(mockEntropy), factoryOwner);
        
        // Create a raffle
        address raffleAddress = factory.createRaffle(
            "Test Project",
            "Test Description",
            PROJECT_PERCENTAGE,
            projectReceiver,
            RAFFLE_DURATION
        );
        
        raffle = ProjectRaffle(raffleAddress);
    }
    
    function test_InitialState() public view {
        require(keccak256(bytes(raffle.projectName())) == keccak256(bytes("Test Project")), "Wrong project name");
        require(keccak256(bytes(raffle.projectDescription())) == keccak256(bytes("Test Description")), "Wrong description");
        require(raffle.projectPercentage() == PROJECT_PERCENTAGE, "Wrong percentage");
        require(uint256(raffle.state()) == 0, "Should be Active"); // Active
        require(raffle.totalTickets() == 0, "Should have 0 tickets");
    }
    
    function test_GetParticipantsCount_InitiallyZero() public view {
        require(raffle.getParticipantsCount() == 0, "Should have 0 participants initially");
    }
    
    function test_IsActive_InitiallyTrue() public view {
        require(raffle.isActive() == true, "Should be active initially");
    }
    
    function test_GetTotalBalance_InitiallyZero() public view {
        require(raffle.getTotalBalance() == 0, "Should have 0 balance initially");
    }
    
    function test_ProjectAddress_IsSet() public view {
        require(raffle.projectAddress() == projectReceiver, "Project address should be set");
    }
    
    function test_PlatformAdmin_IsSet() public view {
        require(raffle.platformAdmin() == factoryOwner, "Platform admin should be factory owner");
    }
    
    function test_EntropyContract_IsSet() public view {
        require(raffle.getEntropy() == address(mockEntropy), "Entropy contract should be set");
    }
}
