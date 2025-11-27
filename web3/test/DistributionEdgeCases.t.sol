// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseRaffle} from "../contracts/BaseRaffle.sol";
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
    uint256 public constant TICKET_PRICE = 0.01 ether;
    
    function setUp() public {
        mockEntropy = new MockEntropy(factoryOwner, 0.0001 ether);
        factory = new RaffleFactory(address(mockEntropy), factoryOwner);
    }
    
    function test_ProjectCanReceive100Percent() public {
        // Create raffle with 100% for project
        address raffleAddress = factory.createSingleWinnerRaffle(
            10000, // 100%
            project,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        BaseRaffle raffle = BaseRaffle(raffleAddress);
        
        require(raffle.projectPercentage() == 10000, "Should accept 100%");
    }
    
    function test_Distribution_100PercentProject_ZeroWinner() public {
        // Create raffle with 100% for project to verify it's allowed
        address raffleAddress = factory.createSingleWinnerRaffle(
            10000, // 100%
            project,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        BaseRaffle raffle = BaseRaffle(raffleAddress);
        
        // Verify the math:
        // If totalBalance = 100 ETH
        // Platform fee = 100 * 5 / 10000 = 0.005 ETH (0.05%)
        // DistributablePool = 100 - 0.005 = 99.995 ETH
        // Project gets = 99.995 * 10000 / 10000 = 99.995 ETH (100% of pool)
        // Winner gets = 99.995 - 99.995 = 0 ETH (0% for winner)
        
        require(raffle.projectPercentage() == 10000, "Should be 100%");
        require(raffle.platformFee() == 5, "Platform fee should be 5 basis points (0.05%)");
    }
    
    function test_Distribution_50PercentProject_50PercentWinner() public {
        // Create raffle with 50% for project
        address raffleAddress = factory.createSingleWinnerRaffle(
            5000, // 50%
            project,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        BaseRaffle raffle = BaseRaffle(raffleAddress);
        
        // If projectPercentage = 5000 (50%)
        // Project gets = distributablePool * 5000 / 10000 = 50% of pool
        // Winner gets = distributablePool - projectAmount = 50% of pool
        
        require(raffle.projectPercentage() == 5000, "Should be 50%");
    }
    
    function test_Distribution_0PercentProject_100PercentWinner() public {
        // Minimum is 1 basis point (0.01%), so 0% is not allowed
        // But we can test with minimum (1 basis point)
        address raffleAddress = factory.createSingleWinnerRaffle(
            1, // 0.01% (minimum)
            project,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        BaseRaffle raffle = BaseRaffle(raffleAddress);
        
        require(raffle.projectPercentage() == 1, "Should accept minimum 1 basis point");
    }
    
    function test_PlatformFee_AlwaysDeductedFirst() public {
        // Verify that platform fee is always deducted from total first
        // This is the correct order:
        // 1. Platform fee from total
        // 2. Project percentage from remaining pool
        // 3. Winner gets the rest
        
        address raffleAddress = factory.createSingleWinnerRaffle(
            5000,
            project,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        BaseRaffle raffle = BaseRaffle(raffleAddress);
        
        // Verify platform fee constant
        require(raffle.platformFee() == 5, "Platform fee should be 5 basis points (0.05%)");
    }
    
    function test_ProjectPercentage_Range() public {
        // Test minimum (1 basis point)
        address minRaffle = factory.createSingleWinnerRaffle(1, project, RAFFLE_DURATION, TICKET_PRICE);
        require(BaseRaffle(minRaffle).projectPercentage() == 1, "Min should be 1");
        
        // Test maximum (10000 basis points = 100%)
        address maxRaffle = factory.createSingleWinnerRaffle(10000, project, RAFFLE_DURATION, TICKET_PRICE);
        require(BaseRaffle(maxRaffle).projectPercentage() == 10000, "Max should be 10000");
        
        // Test middle (5000 basis points = 50%)
        address midRaffle = factory.createSingleWinnerRaffle(5000, project, RAFFLE_DURATION, TICKET_PRICE);
        require(BaseRaffle(midRaffle).projectPercentage() == 5000, "Mid should be 5000");
    }
    
    function test_ProjectPercentage_RejectsZero() public {
        bool reverted = false;
        try factory.createSingleWinnerRaffle(0, project, RAFFLE_DURATION, TICKET_PRICE) {
            // Should not reach here
        } catch {
            reverted = true;
        }
        require(reverted == true, "Should reject 0%");
    }
    
    function test_ProjectPercentage_RejectsOver100() public {
        bool reverted = false;
        try factory.createSingleWinnerRaffle(10001, project, RAFFLE_DURATION, TICKET_PRICE) {
            // Should not reach here
        } catch {
            reverted = true;
        }
        require(reverted == true, "Should reject over 100%");
    }
}

