// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RaffleFactory} from "../contracts/RaffleFactory.sol";
import {BaseRaffle} from "../contracts/BaseRaffle.sol";
import {SingleWinnerRaffle} from "../contracts/SingleWinnerRaffle.sol";
import {MockEntropy} from "../contracts/test/MockEntropy.sol";

contract RaffleFactoryTest {
    RaffleFactory public factory;
    MockEntropy public mockEntropy;
    
    address public factoryOwner = address(0x1);
    address public raffleCreator = address(0x2);
    address public projectReceiver = address(0x3);
    
    uint256 public constant PROJECT_PERCENTAGE = 5000; // 50%
    uint256 public constant RAFFLE_DURATION = 60;
    uint256 public constant TICKET_PRICE = 0.01 ether; // 0.01 ETH per ticket
    
    function setUp() public {
        mockEntropy = new MockEntropy(factoryOwner, 0.0001 ether);
        factory = new RaffleFactory(address(mockEntropy), factoryOwner);
    }
    
    function test_DeployFactory() public view {
        require(factory.owner() == factoryOwner, "Owner should be set");
        require(factory.entropyAddress() == address(mockEntropy), "Entropy address should be set");
        require(factory.getRaffleCount() == 0, "Should have 0 raffles initially");
    }
    
    function test_CreateRaffle() public {
        address raffleAddress = factory.createSingleWinnerRaffle(
            PROJECT_PERCENTAGE,
            projectReceiver,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        
        require(raffleAddress != address(0), "Raffle address should not be zero");
        require(factory.getRaffleCount() == 1, "Should have 1 raffle");
        require(factory.isRaffle(raffleAddress) == true, "Should recognize raffle");
        
        BaseRaffle raffle = BaseRaffle(raffleAddress);
        require(raffle.projectPercentage() == PROJECT_PERCENTAGE, "Wrong percentage");
        require(raffle.ticketPrice() == TICKET_PRICE, "Wrong ticket price");
    }
    
    function test_CreateMultipleRaffles() public {
        address raffle1 = factory.createSingleWinnerRaffle(
            PROJECT_PERCENTAGE,
            projectReceiver,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        
        address raffle2 = factory.createSingleWinnerRaffle(
            PROJECT_PERCENTAGE,
            projectReceiver,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        
        require(factory.getRaffleCount() == 2, "Should have 2 raffles");
        require(factory.isRaffle(raffle1) == true, "Should recognize raffle 1");
        require(factory.isRaffle(raffle2) == true, "Should recognize raffle 2");
        require(raffle1 != raffle2, "Raffles should be different");
    }
    
    function test_GetRaffleInfo() public {
        address raffleAddress = factory.createSingleWinnerRaffle(
            PROJECT_PERCENTAGE,
            projectReceiver,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        
        (
            address infoAddress,
            BaseRaffle.RaffleState state,
            uint256 totalTickets,
            uint256 participantCount
        ) = factory.getRaffleInfo(0);
        
        require(infoAddress == raffleAddress, "Address should match");
        require(uint256(state) == 0, "Should be Active");
        require(totalTickets == 0, "Should have 0 tickets");
        require(participantCount == 0, "Should have 0 participants");
    }
    
    function test_GetAllRaffles() public {
        address raffle1 = factory.createSingleWinnerRaffle(
            PROJECT_PERCENTAGE,
            projectReceiver,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        
        address raffle2 = factory.createSingleWinnerRaffle(
            PROJECT_PERCENTAGE,
            projectReceiver,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        
        (address[] memory allRaffles, bool hasMore) = factory.getAllRaffles(0, 10);
        require(allRaffles.length == 2, "Should have 2 raffles");
        require(allRaffles[0] == raffle1, "First raffle should match");
        require(allRaffles[1] == raffle2, "Second raffle should match");
        require(hasMore == false, "Should not have more");
    }
    
    function test_GetLatestRaffles() public {
        address raffle1 = factory.createSingleWinnerRaffle(
            PROJECT_PERCENTAGE,
            projectReceiver,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        
        address raffle2 = factory.createSingleWinnerRaffle(
            PROJECT_PERCENTAGE,
            projectReceiver,
            RAFFLE_DURATION,
            TICKET_PRICE
        );
        
        address[] memory latest = factory.getLatestRaffles(1);
        require(latest.length == 1, "Should return 1 raffle");
        require(latest[0] == raffle2, "Should return latest raffle");
        
        address[] memory latest2 = factory.getLatestRaffles(2);
        require(latest2.length == 2, "Should return 2 raffles");
        require(latest2[0] == raffle2, "First should be latest");
        require(latest2[1] == raffle1, "Second should be previous");
    }
    
    function test_TicketPriceValidation() public view {
        // Verify that factory has minimum ticket price
        uint256 minPrice = factory.minTicketPrice();
        require(minPrice == 0.0001 ether, "Min ticket price should be 0.0001 ether");
    }
}
