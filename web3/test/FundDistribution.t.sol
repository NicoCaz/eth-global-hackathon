// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseRaffle} from "../contracts/BaseRaffle.sol";
import {SingleWinnerRaffle} from "../contracts/SingleWinnerRaffle.sol";
import {RaffleFactory} from "../contracts/RaffleFactory.sol";
import {MockEntropy} from "../contracts/test/MockEntropy.sol";

/**
 * @title FundDistributionTest
 * @notice Tests for fund distribution calculations and validations
 * @dev These tests verify the mathematical correctness of fund distribution logic
 *      For full end-to-end tests with actual transactions, see integration.test.ts
 */
contract FundDistributionTest {
    RaffleFactory public factory;
    MockEntropy public mockEntropy;
    
    address public factoryOwner = address(0x1);
    address public project = address(0x6);
    
    uint256 public constant PROJECT_PERCENTAGE = 5000; // 50%
    uint256 public constant RAFFLE_DURATION = 60;
    
    BaseRaffle public raffle;
    
    function setUp() public {
        mockEntropy = new MockEntropy(factoryOwner, 0.0001 ether);
        factory = new RaffleFactory(address(mockEntropy), factoryOwner);
        
        address raffleAddress = factory.createSingleWinnerRaffle(
            PROJECT_PERCENTAGE,
            project,
            RAFFLE_DURATION
        );
        
        raffle = BaseRaffle(raffleAddress);
    }
    
    // Helper function to calculate expected distribution amounts
    function _calculateDistribution(
        uint256 totalBalance,
        uint256 projectPercentage,
        uint256 platformFee,
        uint256 basisPoints
    ) internal pure returns (
        uint256 platformAmount,
        uint256 projectAmount,
        uint256 winnerAmount
    ) {
        platformAmount = (totalBalance * platformFee) / basisPoints;
        uint256 distributablePool = totalBalance - platformAmount;
        projectAmount = (distributablePool * projectPercentage) / basisPoints;
        winnerAmount = distributablePool - projectAmount;
    }
    
    // ========== TEST 1: Distribution Math - 50% Project, 50% Winner ==========
    
    function test_DistributionMath_50PercentProject_50PercentWinner() public view {
        // Test with 1 ETH total
        uint256 totalContributed = 1 ether;
        
        // Calculate expected distribution
        (uint256 expectedPlatform, uint256 expectedProject, uint256 expectedWinner) = 
            _calculateDistribution(
                totalContributed,
                raffle.projectPercentage(),
                raffle.platformFee(),
                10000
            );
        
        // Verify calculations
        // Platform fee: 1 ETH * 5 / 10000 = 0.0005 ETH (0.05%)
        uint256 expectedPlatformCalc = (totalContributed * 5) / 10000;
        require(expectedPlatform == expectedPlatformCalc, "Platform fee should be 0.05%");
        
        // Distributable pool: 1 ETH - platform fee
        uint256 distributablePool = totalContributed - expectedPlatform;
        uint256 expectedDistributablePool = totalContributed - expectedPlatformCalc;
        require(distributablePool == expectedDistributablePool, "Distributable pool calculation should be correct");
        
        // Project: distributablePool * 5000 / 10000 (50% of pool)
        uint256 expectedProjectCalc = (distributablePool * 5000) / 10000;
        require(expectedProject == expectedProjectCalc, "Project should get 50% of pool");
        
        // Winner: distributablePool - projectAmount (remaining 50% of pool)
        uint256 expectedWinnerCalc = distributablePool - expectedProject;
        require(expectedWinner == expectedWinnerCalc, "Winner should get remaining 50%");
        
        // Verify total equals original
        require(
            expectedPlatform + expectedProject + expectedWinner == totalContributed,
            "Total distribution should equal total contributed"
        );
    }
    
    // ========== TEST 2: Distribution Math - 100% Project, 0% Winner ==========
    
    function test_DistributionMath_100PercentProject_ZeroWinner() public {
        // Create raffle with 100% for project
        address raffle100Address = factory.createSingleWinnerRaffle(
            10000, // 100%
            project,
            RAFFLE_DURATION
        );
        BaseRaffle raffle100 = BaseRaffle(raffle100Address);
        
        uint256 contribution = 1 ether;
        
        // Calculate expected amounts
        (uint256 expectedPlatform, uint256 expectedProject, uint256 expectedWinner) = 
            _calculateDistribution(
                contribution,
                raffle100.projectPercentage(),
                raffle100.platformFee(),
                10000
            );
        
        // Platform: 1 ETH * 5 / 10000 = 0.0005 ETH (0.05%)
        require(expectedPlatform == (contribution * 5) / 10000, "Platform should get 0.05%");
        
        // Distributable pool: 1 ETH - 0.0005 ETH = 0.9995 ETH
        uint256 distributablePool = contribution - expectedPlatform;
        
        // Project: 0.9995 ETH * 10000 / 10000 = 0.9995 ETH (100% of pool)
        require(expectedProject == distributablePool, "Project should get 100% of distributable pool");
        
        // Winner: 0.9995 ETH - 0.9995 ETH = 0 ETH (0% for winner)
        require(expectedWinner == 0, "Winner should receive 0");
        
        // Verify total
        require(
            expectedPlatform + expectedProject + expectedWinner == contribution,
            "Total should equal contribution"
        );
    }
    
    // ========== TEST 3: Distribution Math - Minimum Project Percentage (1 basis point) ==========
    
    function test_DistributionMath_MinimumProjectPercentage() public {
        // Create raffle with minimum percentage
        address raffleMinAddress = factory.createSingleWinnerRaffle(
            1, // 0.01%
            project,
            RAFFLE_DURATION
        );
        BaseRaffle raffleMin = BaseRaffle(raffleMinAddress);
        
        uint256 contribution = 1 ether;
        
        // Calculate expected amounts
        (uint256 expectedPlatform, uint256 expectedProject, uint256 expectedWinner) = 
            _calculateDistribution(
                contribution,
                raffleMin.projectPercentage(),
                raffleMin.platformFee(),
                10000
            );
        
        // Platform: 0.05%
        require(expectedPlatform == (contribution * 5) / 10000, "Platform should get 0.05%");
        
        // Distributable pool
        uint256 distributablePool = contribution - expectedPlatform;
        
        // Project: 0.01% of pool (minimum)
        require(expectedProject == (distributablePool * 1) / 10000, "Project should get 0.01% of pool");
        
        // Winner: Rest of pool (99.99%)
        require(expectedWinner == distributablePool - expectedProject, "Winner should get remaining 99.99%");
        
        // Verify project gets minimum, winner gets most
        require(expectedProject < expectedWinner, "Project should get less than winner");
        require(expectedWinner > distributablePool / 2, "Winner should get more than half of pool");
    }
    
    // ========== TEST 4: Distribution Math - 30% vs 70% Project ==========
    
    function test_DistributionMath_DifferentPercentages() public {
        // Test 30% project
        address raffle30Address = factory.createSingleWinnerRaffle(
            3000, // 30%
            project,
            RAFFLE_DURATION
        );
        BaseRaffle raffle30 = BaseRaffle(raffle30Address);
        
        // Test 70% project
        address raffle70Address = factory.createSingleWinnerRaffle(
            7000, // 70%
            project,
            RAFFLE_DURATION
        );
        BaseRaffle raffle70 = BaseRaffle(raffle70Address);
        
        uint256 contribution = 1 ether;
        
        // Calculate for 30% raffle
        (uint256 platform30, uint256 project30, uint256 winner30) = 
            _calculateDistribution(
                contribution,
                raffle30.projectPercentage(),
                raffle30.platformFee(),
                10000
            );
        
        // Calculate for 70% raffle
        (uint256 platform70, uint256 project70, uint256 winner70) = 
            _calculateDistribution(
                contribution,
                raffle70.projectPercentage(),
                raffle70.platformFee(),
                10000
            );
        
        // Platform fee should be same for both
        require(platform30 == platform70, "Platform fee should be same");
        
        // Project should get more in 70% raffle
        require(project70 > project30, "70% raffle should give more to project");
        
        // Winner should get more in 30% raffle
        require(winner30 > winner70, "30% raffle should give more to winner");
        
        // Verify totals
        require(platform30 + project30 + winner30 == contribution, "30% raffle total should match");
        require(platform70 + project70 + winner70 == contribution, "70% raffle total should match");
    }
    
    // ========== TEST 5: Distribution Math - Large Amounts ==========
    
    function test_DistributionMath_LargeAmounts() public view {
        // Test with 1000 ETH
        uint256 largeAmount = 1000 ether;
        
        (uint256 expectedPlatform, uint256 expectedProject, uint256 expectedWinner) = 
            _calculateDistribution(
                largeAmount,
                raffle.projectPercentage(),
                raffle.platformFee(),
                10000
            );
        
        // Platform: 1000 ETH * 5 / 10000 = 0.5 ETH
        uint256 expectedPlatformCalc = (largeAmount * 5) / 10000;
        require(expectedPlatform == expectedPlatformCalc, "Platform should get 0.5 ETH");
        
        // Distributable pool: 1000 ETH - 0.5 ETH = 999.5 ETH
        uint256 distributablePool = largeAmount - expectedPlatform;
        uint256 expectedDistributablePool = largeAmount - expectedPlatformCalc;
        require(distributablePool == expectedDistributablePool, "Distributable pool should be 999.5 ETH");
        
        // Project: 999.5 ETH * 5000 / 10000 = 499.75 ETH
        uint256 expectedProjectCalc = (distributablePool * 5000) / 10000;
        require(expectedProject == expectedProjectCalc, "Project should get 499.75 ETH");
        
        // Winner: 999.5 ETH - 499.75 ETH = 499.75 ETH
        uint256 expectedWinnerCalc = distributablePool - expectedProject;
        require(expectedWinner == expectedWinnerCalc, "Winner should get 499.75 ETH");
        
        // Verify total
        require(
            expectedPlatform + expectedProject + expectedWinner == largeAmount,
            "Total should equal large amount"
        );
    }
    
    // ========== TEST 6: Distribution Math - Small Amounts ==========
    
    function test_DistributionMath_SmallAmounts() public view {
        // Test with minimum ticket price (0.0001 ETH)
        uint256 smallAmount = 0.0001 ether;
        
        (uint256 expectedPlatform, uint256 expectedProject, uint256 expectedWinner) = 
            _calculateDistribution(
                smallAmount,
                raffle.projectPercentage(),
                raffle.platformFee(),
                10000
            );
        
        // Verify calculations match the helper function logic
        uint256 platformFee = raffle.platformFee();
        uint256 basisPoints = 10000; // BASIS_POINTS constant
        uint256 projectPct = raffle.projectPercentage();
        
        // Calculate manually
        uint256 manualPlatform = (smallAmount * platformFee) / basisPoints;
        uint256 manualDistributablePool = smallAmount - manualPlatform;
        uint256 manualProject = (manualDistributablePool * projectPct) / basisPoints;
        uint256 manualWinner = manualDistributablePool - manualProject;
        
        // Verify helper function matches manual calculation
        require(expectedPlatform == manualPlatform, "Platform fee should match");
        require(expectedProject == manualProject, "Project amount should match");
        require(expectedWinner == manualWinner, "Winner amount should match");
        
        // Verify total (allow for rounding)
        uint256 total = expectedPlatform + expectedProject + expectedWinner;
        require(total <= smallAmount, "Total should not exceed small amount");
        require(smallAmount - total <= 1, "Rounding should be minimal (max 1 wei)");
    }
    
    // ========== TEST 7: Distribution Constants ==========
    
    function test_DistributionConstants() public view {
        // Verify constants
        require(raffle.platformFee() == 5, "platformFee should be 5 basis points (0.05%)");
        // BASIS_POINTS is 10000 constant
        require(raffle.projectPercentage() == PROJECT_PERCENTAGE, "Project percentage should match");
    }
    
    // ========== TEST 8: Distribution Math - Edge Case Rounding ==========
    
    function test_DistributionMath_Rounding() public view {
        // Test with amount that might cause rounding issues
        uint256 amount = 1 ether + 1 wei; // 1 ETH + 1 wei
        
        (uint256 expectedPlatform, uint256 expectedProject, uint256 expectedWinner) = 
            _calculateDistribution(
                amount,
                raffle.projectPercentage(),
                raffle.platformFee(),
                10000
            );
        
        // Verify that total distribution doesn't exceed original amount
        require(
            expectedPlatform + expectedProject + expectedWinner <= amount,
            "Total distribution should not exceed original amount"
        );
        
        // Verify that we're not losing more than 1 wei due to rounding
        uint256 totalDistributed = expectedPlatform + expectedProject + expectedWinner;
        uint256 difference = amount - totalDistributed;
        require(difference <= 1, "Rounding difference should be at most 1 wei");
    }
    
    // ========== TEST 9: Distribution Math - All Percentages Sum Correctly ==========
    
    function test_DistributionMath_AllPercentagesSum() public pure {
        uint256 amount = 1 ether;
        
        // Test with different percentages
        for (uint256 percentage = 1000; percentage <= 9000; percentage += 1000) { // 10%, 20%, ..., 90%
            uint256 platform = (amount * 5) / 10000;
            uint256 distributablePool = amount - platform;
            uint256 project = (distributablePool * percentage) / 10000;
            uint256 winner = distributablePool - project;
            
            uint256 total = platform + project + winner;
            require(total <= amount, "Total should not exceed amount");
            require(amount - total <= 1, "Rounding should be minimal");
        }
    }
}
