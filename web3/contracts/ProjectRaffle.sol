// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import { PullPayment } from "@openzeppelin/contracts/security/PullPayment.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
 
/**
 * @title ProjectRaffle
 * @notice Project raffle contract with Pyth Entropy integration for provably fair randomness
 * @dev Funds are distributed between project, platform admin, and winner using PullPayment pattern
 * @dev Uses binary search for O(log n) winner selection efficiency
 */
contract ProjectRaffle is Ownable, ReentrancyGuard, PullPayment, IEntropyConsumer {
    uint32 public entropyCallbackGasLimit;
    uint256 public projectPercentage;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public platformFee;
    uint256 public minTicketPrice;
    
    enum RaffleState { Active, EntropyRequested, DrawExecuted }
    RaffleState public state;
    
    struct TicketRange {
        address owner;
        uint256 upperBound;
    }
    TicketRange[] public participants;
    uint256 public totalTickets;
    
    address public winner;
    bool public fundsDistributed;
    
    uint256 public immutable raffleDuration;
    uint256 public immutable raffleStartTime;
    address public projectAddress;
    address public platformAdmin;
    
    IEntropyV2 public entropy;
    address public entropyProvider;
    uint64 public entropySequenceNumber;
    
    event TicketPurchased(address indexed buyer, uint256 amount, uint256 ticketCount);
    event EntropyRequested(uint64 sequenceNumber);
    event DrawExecuted(address indexed winner, uint256 ticketNumber);
    event FundsDistributed(
        address indexed projectAddress,
        address indexed owner,
        address indexed winner,
        uint256 projectAmount,
        uint256 ownerAmount,
        uint256 winnerAmount
    );
    
    /**
     * @notice Initializes the raffle contract with project and platform configuration
     * @param _projectPercentage Project allocation in basis points (0-10000)
     * @param _entropyAddress Pyth Entropy contract address
     * @param _initialOwner Initial owner address
     * @param _platformAdmin Platform administrator address
     * @param _projectAddress Project address that will receive funds
     * @param _raffleDuration Raffle duration in seconds
     * @param _platformFee Platform fee in basis points
     * @param _minTicketPrice Minimum ticket purchase amount in wei
     * @param _entropyCallbackGasLimit Gas limit for Entropy callback execution
     */
    constructor(
        uint256 _projectPercentage,
        address _entropyAddress,
        address _initialOwner,
        address _platformAdmin,
        address _projectAddress,
        uint256 _raffleDuration,
        uint256 _platformFee,
        uint256 _minTicketPrice,
        uint32 _entropyCallbackGasLimit
    ) {
        require(_projectPercentage > 0, "Project percentage must be > 0");
        require(_projectPercentage <= BASIS_POINTS, "Project percentage cannot exceed 100%");
        require(_entropyAddress != address(0), "Invalid Entropy address");
        require(_projectAddress != address(0), "Invalid project address");
        require(_platformAdmin != address(0), "Invalid admin address");
        require(_raffleDuration > 0, "Duration must be > 0");
        require(_initialOwner != address(0), "Invalid owner address");
        require(_platformFee <= 1000, "Platform fee cannot exceed 10%");
        require(_minTicketPrice > 0, "Min ticket price must be > 0");
        require(_entropyCallbackGasLimit >= 50000, "Gas limit too low");

        projectPercentage = _projectPercentage;
        entropy = IEntropyV2(_entropyAddress);
        projectAddress = _projectAddress;
        platformAdmin = _platformAdmin;
        raffleDuration = _raffleDuration;
        raffleStartTime = block.timestamp;
        platformFee = _platformFee;
        minTicketPrice = _minTicketPrice;
        entropyCallbackGasLimit = _entropyCallbackGasLimit;
        
        entropyProvider = entropy.getDefaultProvider();
        require(entropyProvider != address(0), "No default provider available");
        
        state = RaffleState.Active;
        _transferOwnership(_initialOwner);
    }
    
    /**
     * @notice Allows users to purchase raffle tickets
     * @dev 1 wei = 1 ticket, minimum purchase enforced by minTicketPrice
     */
    function buyTickets() external payable {
        require(state == RaffleState.Active, "Raffle not active");
        require(block.timestamp < raffleStartTime + raffleDuration, "Raffle ended");
        require(msg.value >= minTicketPrice, "Amount below minimum ticket price");
        
        totalTickets += msg.value;
        
        participants.push(TicketRange({
            owner: msg.sender,
            upperBound: totalTickets
        }));
        
        emit TicketPurchased(msg.sender, msg.value, totalTickets);
    }
    
    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner() || msg.sender == platformAdmin, "Not authorized");
        _;
    }
    
    /**
     * @notice Requests entropy from Pyth to execute the raffle draw
     * @dev Only owner or platform admin can execute this function
     * @param userRandomNumber User-generated random number for additional entropy
     */
    function requestEntropy(bytes32 userRandomNumber) external payable onlyOwnerOrAdmin {
        require(state == RaffleState.Active, "Raffle not active");
        require(totalTickets > 0, "No tickets sold");
        require(participants.length > 0, "No participants");
        
        state = RaffleState.EntropyRequested;
        
        uint128 fee = entropy.getFeeV2(entropyProvider, entropyCallbackGasLimit);
        require(msg.value >= fee, "Insufficient fee");
        
        entropySequenceNumber = entropy.requestV2{value: fee}(
            entropyProvider,
            userRandomNumber,
            entropyCallbackGasLimit
        );
        
        emit EntropyRequested(entropySequenceNumber);
        
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    /**
     * @notice Internal callback invoked by Pyth Entropy with generated randomness
     * @dev Called by _entropyCallback from IEntropyConsumer abstract contract
     * @param sequenceNumber Sequence number of the entropy request
     * @param provider Provider address that fulfilled the request
     * @param randomNumber Generated random number
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) internal override {
        require(state == RaffleState.EntropyRequested, "Entropy not requested");
        require(sequenceNumber == entropySequenceNumber, "Invalid sequence number");
        require(provider == entropyProvider, "Invalid provider");
        
        winner = _selectWinner(randomNumber);
        state = RaffleState.DrawExecuted;
        
        emit DrawExecuted(winner, uint256(randomNumber) % totalTickets);
    }
    
    /**
     * @notice Returns the Entropy contract address (internal implementation)
     * @return Address of the Entropy contract
     * @dev Required implementation by IEntropyConsumer abstract contract
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }
    
    /**
     * @notice Returns the Entropy contract address (public view)
     * @return Address of the Entropy contract
     * @dev Public method to query Entropy address from external contracts
     */
    function getEntropyAddress() external view returns (address) {
        return address(entropy);
    }
    
    /**
     * @notice Distributes funds between project, platform admin, and winner using PullPayment pattern
     * @dev Beneficiaries must call withdrawPayments() to withdraw their allocated funds
     */
    function distributeFunds() external onlyOwnerOrAdmin nonReentrant {
        require(state == RaffleState.DrawExecuted, "Draw not executed");
        require(!fundsDistributed, "Funds already distributed");
        require(winner != address(0), "No winner selected");
        require(projectAddress != address(0), "Invalid project address");
        
        fundsDistributed = true;
        
        uint256 totalBalance = address(this).balance;
        
        uint256 platformAmount = (totalBalance * platformFee) / BASIS_POINTS;
        uint256 distributablePool = totalBalance - platformAmount;
        uint256 projectAmount = (distributablePool * projectPercentage) / BASIS_POINTS;
        uint256 winnerAmount = distributablePool - projectAmount;
        
        _asyncTransfer(projectAddress, projectAmount);
        _asyncTransfer(platformAdmin, platformAmount);
        _asyncTransfer(winner, winnerAmount);
        
        emit FundsDistributed(
            projectAddress,
            platformAdmin,
            winner,
            projectAmount,
            platformAmount,
            winnerAmount
        );
    }
    
    /**
     * @notice Selects winner using binary search algorithm - O(log n) complexity
     * @param entropySeed Entropy generated by Pyth
     * @return Address of the winner
     * @dev Each TicketRange covers tickets from (previousUpperBound) to (upperBound - 1)
     * @dev First range covers tickets from 0 to (upperBound - 1)
     */
    function _selectWinner(bytes32 entropySeed) internal view returns (address) {
        require(participants.length > 0, "No participants");
        
        uint256 randomTicket = uint256(entropySeed) % totalTickets;
        
        uint256 left = 0;
        uint256 right = participants.length - 1;
        
        while (left < right) {
            uint256 mid = (left + right) / 2;
            
            if (randomTicket < participants[mid].upperBound) {
                right = mid;
            } else {
                left = mid + 1;
            }
        }
        
        return participants[left].owner;
    }
    
    /**
     * @notice Returns the total number of participant entries
     * @return Number of ticket purchase transactions
     */
    function getParticipantsCount() external view returns (uint256) {
        return participants.length;
    }
    
    /**
     * @notice Returns ticket range information for a specific participant entry
     * @param index Index of the participant entry
     * @return owner Address of the ticket holder
     * @return upperBound Upper bound of the ticket range
     */
    function getTicketRange(uint256 index) external view returns (address owner, uint256 upperBound) {
        TicketRange memory range = participants[index];
        return (range.owner, range.upperBound);
    }
    
    /**
     * @notice Returns the total balance held in the contract
     * @return Balance in wei
     */
    function getTotalBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Checks if the raffle is active and accepting ticket purchases
     * @return True if raffle is active and within time duration
     */
    function isActive() external view returns (bool) {
        return state == RaffleState.Active && 
               block.timestamp < raffleStartTime + raffleDuration;
    }
    
    /**
     * @notice Returns the remaining time until raffle ends
     * @return Remaining seconds, 0 if already ended
     */
    function getTimeRemaining() external view returns (uint256) {
        uint256 endTime = raffleStartTime + raffleDuration;
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }
    
    /**
     * @notice Previews potential winner without executing the draw
     * @param entropySeed Test entropy value
     * @return Address of the potential winner
     */
    function previewWinner(bytes32 entropySeed) external view returns (address) {
        require(participants.length > 0, "No participants");
        return _selectWinner(entropySeed);
    }
    
    /**
     * @notice Emergency function to force winner selection without waiting for Pyth callback
     * @dev Only callable by owner or admin, intended for testing or emergency situations
     * @param randomNumber Random number to use for winner selection
     */
    function forceSelectWinner(bytes32 randomNumber) external onlyOwnerOrAdmin {
        require(state == RaffleState.Active || state == RaffleState.EntropyRequested, "Invalid state");
        require(participants.length > 0, "No participants");
        require(totalTickets > 0, "No tickets sold");
        
        winner = _selectWinner(randomNumber);
        state = RaffleState.DrawExecuted;
        
        emit DrawExecuted(winner, uint256(randomNumber) % totalTickets);
    }
}

