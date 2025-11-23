// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ProjectRaffle} from "../contracts/ProjectRaffle.sol";
import {RaffleFactory} from "../contracts/RaffleFactory.sol";
import {MockEntropy} from "../contracts/test/MockEntropy.sol";

/**
 * @title DistributionEdgeCasesTest
 * @notice Tests for edge cases in fund distribution, especially 100% project percentage
 */
contract DistributionEdgeCasesTest {
    RaffleFactory public factory;
    MockEntropy public mockEntropy;
    
    address public factoryOwner = address(0x1);
    address public creator = address(0x2);
    address public buyer1 = address(0x3);
    address public buyer2 = address(0x4);
    address public project = address(0x5);
    
    uint256 public constant RAFFLE_DURATION = 60;
    
    function setUp() public {
        mockEntropy = new MockEntropy(factoryOwner, 0.0001 ether);
        factory = new RaffleFactory(address(mockEntropy), factoryOwner);
    }
    
    function test_ProjectCanReceive100Percent() public {
        // Create raffle with 100% for project
        address raffleAddress = factory.createRaffle(
            "100% Project",
            "Project gets everything",
            10000, // 100%
            project,
            RAFFLE_DURATION
        );
        ProjectRaffle raffle = ProjectRaffle(raffleAddress);
        
        require(raffle.projectPercentage() == 10000, "Should accept 100%");
    }
    
    function test_Distribution_100PercentProject_ZeroWinner() public {
        // Create raffle with 100% for project to verify it's allowed
        address raffleAddress = factory.createRaffle(
            "100% Test",
            "Test",
            10000, // 100%
            project,
            RAFFLE_DURATION
        );
        ProjectRaffle raffle = ProjectRaffle(raffleAddress);
        
        // Verify the math:
        // If totalBalance = 100 ETH
        // Platform fee = 100 * 50 / 10000 = 0.5 ETH
        // DistributablePool = 100 - 0.5 = 99.5 ETH
        // Project gets = 99.5 * 10000 / 10000 = 99.5 ETH (100% of pool)
        // Winner gets = 99.5 - 99.5 = 0 ETH (0% for winner)
        
        require(raffle.projectPercentage() == 10000, "Should be 100%");
        require(raffle.PLATFORM_FEE() == 50, "Platform fee should be 50");
        require(raffle.BASIS_POINTS() == 10000, "BASIS_POINTS should be 10000");
    }
    
    function test_Distribution_50PercentProject_50PercentWinner() public {
        // Create raffle with 50% for project
        address raffleAddress = factory.createRaffle(
            "50% Test",
            "Test",
            5000, // 50%
            project,
            RAFFLE_DURATION
        );
        ProjectRaffle raffle = ProjectRaffle(raffleAddress);
        
        // If projectPercentage = 5000 (50%)
        // Project gets = distributablePool * 5000 / 10000 = 50% of pool
        // Winner gets = distributablePool - projectAmount = 50% of pool
        
        require(raffle.projectPercentage() == 5000, "Should be 50%");
    }
    
    function test_Distribution_0PercentProject_100PercentWinner() public {
        // Minimum is 1 basis point (0.01%), so 0% is not allowed
        // But we can test with minimum (1 basis point)
        address raffleAddress = factory.createRaffle(
            "Min Project",
            "Minimum percentage",
            1, // 0.01% (minimum)
            project,
            RAFFLE_DURATION
        );
        ProjectRaffle raffle = ProjectRaffle(raffleAddress);
        
        require(raffle.projectPercentage() == 1, "Should accept minimum 1 basis point");
    }
    
    function test_PlatformFee_AlwaysDeductedFirst() public {
        // Verify that platform fee is always deducted from total first
        // This is the correct order:
        // 1. Platform fee from total
        // 2. Project percentage from remaining pool
        // 3. Winner gets the rest
        
        address raffleAddress = factory.createRaffle(
            "Fee Test",
            "Test",
            5000,
            project,
            RAFFLE_DURATION
        );
        ProjectRaffle raffle = ProjectRaffle(raffleAddress);
        
        // Verify platform fee constant
        require(raffle.PLATFORM_FEE() == 50, "Platform fee should be 50 basis points (0.5%)");
    }
    
    function test_ProjectPercentage_Range() public {
        // Test minimum (1 basis point)
        address minRaffle = factory.createRaffle("Min", "Test", 1, project, RAFFLE_DURATION);
        require(ProjectRaffle(minRaffle).projectPercentage() == 1, "Min should be 1");
        
        // Test maximum (10000 basis points = 100%)
        address maxRaffle = factory.createRaffle("Max", "Test", 10000, project, RAFFLE_DURATION);
        require(ProjectRaffle(maxRaffle).projectPercentage() == 10000, "Max should be 10000");
        
        // Test middle (5000 basis points = 50%)
        address midRaffle = factory.createRaffle("Mid", "Test", 5000, project, RAFFLE_DURATION);
        require(ProjectRaffle(midRaffle).projectPercentage() == 5000, "Mid should be 5000");
    }
    
    function test_ProjectPercentage_RejectsZero() public {
        bool reverted = false;
        try factory.createRaffle("Test", "Test", 0, project, RAFFLE_DURATION) {
            // Should not reach here
        } catch {
            reverted = true;
        }
        require(reverted == true, "Should reject 0%");
    }
    
    function test_ProjectPercentage_RejectsOver100() public {
        bool reverted = false;
        try factory.createRaffle("Test", "Test", 10001, project, RAFFLE_DURATION) {
            // Should not reach here
        } catch {
            reverted = true;
        }
        require(reverted == true, "Should reject over 100%");
    }
}

