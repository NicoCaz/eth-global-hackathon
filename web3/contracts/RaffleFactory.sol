// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BaseRaffle.sol";
import "./SingleWinnerRaffle.sol";

/**
 * @title RaffleFactory
 * @notice Factory contract for creating and managing raffles
 * @dev Centralizes raffle deployment with configurable platform parameters
 * @dev Supports SingleWinner raffle type
 */
contract RaffleFactory is Ownable {
    BaseRaffle[] public raffles;
    mapping(address => bool) public isRaffle;
    
    address public entropyAddress;
    uint256 public platformFee;
    uint256 public minTicketPrice;
    uint32 public entropyCallbackGasLimit;
    
    enum RaffleType { SingleWinner }
    
    event RaffleCreated(
        address indexed raffleAddress,
        RaffleType raffleType,
        uint256 projectPercentage,
        address indexed creator
    );
    event EntropyConfigUpdated(address entropyAddress);
    event PlatformFeeUpdated(uint256 newFee);
    event MinTicketPriceUpdated(uint256 newPrice);
    event EntropyGasLimitUpdated(uint32 newLimit);
    
    /**
     * @notice Initializes the factory with Pyth Entropy configuration
     * @param _entropyAddress Pyth Entropy contract address
     * @param _initialOwner Initial owner address
     */
    constructor(
        address _entropyAddress,
        address _initialOwner
    ) {
        require(_entropyAddress != address(0), "Invalid Entropy address");
        require(_initialOwner != address(0), "Invalid owner address");
        entropyAddress = _entropyAddress;
        _transferOwnership(_initialOwner);
        
        platformFee = 5;
        minTicketPrice = 0.0001 ether;
        entropyCallbackGasLimit = 100000;
    }
    
    /**
     * @notice Creates a single winner raffle
     * @param projectPercentage Project allocation in basis points (5000 = 50%)
     * @param projectAddress Project address that will receive funds
     * @param raffleDuration Raffle duration in seconds
     * @return Address of the created raffle contract
     */
    function createSingleWinnerRaffle(
        uint256 projectPercentage,
        address projectAddress,
        uint256 raffleDuration
    ) external returns (address) {
        require(projectPercentage <= 10000, "Project percentage cannot exceed 100%");
        require(projectPercentage > 0, "Project percentage must be > 0");
        require(projectAddress != address(0), "Invalid project address");
        require(raffleDuration > 0, "Duration must be > 0");
        
        SingleWinnerRaffle raffle = new SingleWinnerRaffle(
            projectPercentage,
            entropyAddress,
            msg.sender,
            owner(),
            projectAddress,
            raffleDuration,
            platformFee,
            minTicketPrice,
            entropyCallbackGasLimit
        );
        
        raffles.push(raffle);
        isRaffle[address(raffle)] = true;
        
        emit RaffleCreated(
            address(raffle),
            RaffleType.SingleWinner,
            projectPercentage,
            msg.sender
        );
        
        return address(raffle);
    }
    
    /**
     * @notice Updates the Entropy contract configuration for new raffles
     * @param _entropyAddress New Entropy contract address
     */
    function updateEntropyConfig(
        address _entropyAddress
    ) external onlyOwner {
        require(_entropyAddress != address(0), "Invalid Entropy address");
        entropyAddress = _entropyAddress;
        
        emit EntropyConfigUpdated(_entropyAddress);
    }
    
    /**
     * @notice Updates the platform fee for new raffles
     * @param _platformFee New fee in basis points (e.g., 5 = 0.05%)
     */
    function updatePlatformFee(uint256 _platformFee) external onlyOwner {
        require(_platformFee <= 1000, "Fee cannot exceed 10%");
        platformFee = _platformFee;
        emit PlatformFeeUpdated(_platformFee);
    }
    
    /**
     * @notice Updates the minimum ticket price for new raffles
     * @param _minTicketPrice New minimum price in wei
     */
    function updateMinTicketPrice(uint256 _minTicketPrice) external onlyOwner {
        require(_minTicketPrice > 0, "Price must be > 0");
        minTicketPrice = _minTicketPrice;
        emit MinTicketPriceUpdated(_minTicketPrice);
    }
    
    /**
     * @notice Updates the Entropy callback gas limit for new raffles
     * @param _gasLimit New gas limit
     */
    function updateEntropyGasLimit(uint32 _gasLimit) external onlyOwner {
        require(_gasLimit >= 50000, "Gas limit too low");
        require(_gasLimit <= 500000, "Gas limit too high");
        entropyCallbackGasLimit = _gasLimit;
        emit EntropyGasLimitUpdated(_gasLimit);
    }
    
    /**
     * @notice Returns the total number of raffles created
     * @return Total raffle count
     */
    function getRaffleCount() external view returns (uint256) {
        return raffles.length;
    }
    
    /**
     * @notice Returns paginated list of raffle addresses
     * @param offset Starting index (0-based)
     * @param limit Maximum number of raffles to return
     * @return Array of raffle addresses
     * @return hasMore Indicates if more raffles exist after this page
     */
    function getAllRaffles(uint256 offset, uint256 limit) external view returns (
        address[] memory,
        bool hasMore
    ) {
        uint256 total = raffles.length;
        require(offset < total, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 resultLength = end - offset;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = address(raffles[offset + i]);
        }
        
        hasMore = end < total;
        return (result, hasMore);
    }
    
    /**
     * @notice Returns the address of a specific raffle by index
     * @param index Raffle index
     * @return raffleAddress Address of the raffle contract
     */
    function getRaffleAddress(uint256 index) external view returns (address raffleAddress) {
        require(index < raffles.length, "Invalid index");
        return address(raffles[index]);
    }
    
    /**
     * @notice Returns complete information for a specific raffle
     * @param index Raffle index
     * @return raffleAddress Address of the raffle contract
     * @return state Current state of the raffle
     * @return totalTickets Total tickets sold
     * @return participantCount Number of participants
     */
    function getRaffleInfo(uint256 index) external view returns (
        address raffleAddress,
        BaseRaffle.RaffleState state,
        uint256 totalTickets,
        uint256 participantCount
    ) {
        require(index < raffles.length, "Invalid index");
        
        BaseRaffle raffle = raffles[index];
        raffleAddress = address(raffle);
        state = raffle.state();
        totalTickets = raffle.totalTickets();
        participantCount = raffle.getParticipantsCount();
    }
    
    /**
     * @notice Returns addresses for multiple raffles by indices (optimized batch query)
     * @param indices Array of raffle indices
     * @return raffleAddresses Array of raffle addresses
     */
    function getRaffleAddresses(uint256[] calldata indices) external view returns (
        address[] memory raffleAddresses
    ) {
        uint256 length = indices.length;
        raffleAddresses = new address[](length);
        uint256 total = raffles.length;
        
        for (uint256 i = 0; i < length; i++) {
            require(indices[i] < total, "Invalid index");
            raffleAddresses[i] = address(raffles[indices[i]]);
        }
    }
    
    /**
     * @notice Returns the most recently created raffles
     * @param count Number of raffles to retrieve
     * @return Array of addresses for the latest raffles
     */
    function getLatestRaffles(uint256 count) external view returns (address[] memory) {
        uint256 total = raffles.length;
        if (total == 0) {
            return new address[](0);
        }
        
        uint256 actualCount = count > total ? total : count;
        address[] memory result = new address[](actualCount);
        
        uint256 startIndex = total - actualCount;
        for (uint256 i = 0; i < actualCount; i++) {
            result[i] = address(raffles[startIndex + i]);
        }
        
        return result;
    }
}

