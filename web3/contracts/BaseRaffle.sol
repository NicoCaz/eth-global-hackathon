// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import {PullPayment} from "@openzeppelin/contracts/security/PullPayment.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IEntropyV2} from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import {
    IEntropyConsumer
} from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/**
 * @title BaseRaffle
 * @notice Abstract base contract for all raffle types
 * @dev Contains shared logic for ticket purchasing, entropy integration, and winner selection
 */
abstract contract BaseRaffle is
    Ownable,
    ReentrancyGuard,
    PullPayment,
    IEntropyConsumer
{
    uint32 public entropyCallbackGasLimit;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public platformFee;
    uint256 public minTicketPrice;

    enum RaffleState {
        Active, // Raffle is active, tickets can be purchased
        Closed, // Raffle is closed, no more tickets can be purchased, but draw has not been executed yet
        AwaitingDraw, // Entropy has been requested and we are waiting for the draw result
        Finalized // The draw has been executed and winners have been selected
    }
    RaffleState public state;

    struct TicketRange {
        address owner;
        uint256 upperBound;
    }
    TicketRange[] public participants;
    uint256 public totalTickets;

    bool public fundsDistributed;

    uint256 public immutable raffleDuration;
    uint256 public immutable raffleStartTime;
    address public projectAddress;
    address public platformAdmin;
    uint256 public projectPercentage;

    IEntropyV2 public entropy;
    address public entropyProvider;
    uint64 public entropySequenceNumber;

    event TicketPurchased(
        address indexed buyer,
        uint256 amount,
        uint256 ticketCount
    );
    event RaffleClosed(uint256 timestamp);
    event EntropyRequested(uint64 sequenceNumber);
    event FundsDistributed(
        address indexed projectAddress,
        address indexed platformAdmin,
        uint256 projectAmount,
        uint256 platformAmount
    );

    /**
     * @notice Initializes the base raffle with common configuration
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
        require(
            _projectPercentage <= BASIS_POINTS,
            "Project percentage cannot exceed 100%"
        );
        require(_entropyAddress != address(0), "Invalid Entropy address");
        require(_projectAddress != address(0), "Invalid project address");
        require(_platformAdmin != address(0), "Invalid admin address");
        require(_raffleDuration > 0, "Duration must be > 0");
        require(_initialOwner != address(0), "Invalid owner address");
        require(_platformFee <= 1000, "Platform fee cannot exceed 10%");
        require(_minTicketPrice > 0, "Min ticket price must be > 0");
        require(_entropyCallbackGasLimit >= 50000, "Gas limit too low");
        entropy = IEntropyV2(_entropyAddress);
        entropyCallbackGasLimit = _entropyCallbackGasLimit;
        entropyProvider = entropy.getDefaultProvider();
        require(entropyProvider != address(0), "No default provider available");

        projectPercentage = _projectPercentage;

        projectAddress = _projectAddress;
        platformAdmin = _platformAdmin;
        raffleDuration = _raffleDuration;
        raffleStartTime = block.timestamp;
        platformFee = _platformFee;
        minTicketPrice = _minTicketPrice;

        state = RaffleState.Active;
        _transferOwnership(_initialOwner);
    }

    /**
     * @notice Allows users to purchase raffle tickets
     * @dev 1 wei = 1 ticket, minimum purchase enforced by minTicketPrice
     * @dev Automatically closes the raffle when the time expires
     */
    function buyTickets() external payable {
        require(state == RaffleState.Active, "Raffle not active");
        require(
            block.timestamp < raffleStartTime + raffleDuration,
            "Raffle ended"
        );
        require(
            msg.value >= minTicketPrice,
            "Amount below minimum ticket price"
        );

        totalTickets += msg.value;

        participants.push(
            TicketRange({owner: msg.sender, upperBound: totalTickets})
        );

        emit TicketPurchased(msg.sender, msg.value, totalTickets);

        // Automatically close if time expired after this purchase
        if (
            block.timestamp >= raffleStartTime + raffleDuration &&
            state == RaffleState.Active
        ) {
            state = RaffleState.Closed;
            emit RaffleClosed(block.timestamp);
        }
    }

    modifier onlyOwnerOrAdmin() {
        require(
            msg.sender == owner() || msg.sender == platformAdmin,
            "Not authorized"
        );
        _;
    }

    /**
     * @notice Requests entropy from Pyth to execute the draw
     * @dev Changes state to AwaitingDraw while waiting for Pyth's response
     * @dev Can only be executed when the raffle is closed (not active)
     */
    function requestEntropy(
        bytes32 userRandomNumber
    ) external payable onlyOwnerOrAdmin {
        // Ensure the raffle is closed (either manually or by time)
        if (state == RaffleState.Active) {
            require(
                block.timestamp >= raffleStartTime + raffleDuration,
                "Raffle still active"
            );
            state = RaffleState.Closed;
            emit RaffleClosed(block.timestamp);
        }
        require(state == RaffleState.Closed, "Raffle must be closed");
        require(totalTickets > 0, "No tickets sold");
        require(participants.length > 0, "No participants");

        state = RaffleState.AwaitingDraw;

        uint128 fee = entropy.getFeeV2(
            entropyProvider,
            entropyCallbackGasLimit
        );
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
     * @dev Executed when Pyth Entropy returns the random number for the draw
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) internal virtual override {
        require(state == RaffleState.AwaitingDraw, "Not awaiting draw");
        require(
            sequenceNumber == entropySequenceNumber,
            "Invalid sequence number"
        );
        require(provider == entropyProvider, "Invalid provider");

        _processDrawResults(randomNumber);
        state = RaffleState.Finalized;
    }

    /**
     * @notice Process draw results - must be implemented by child contracts
     * @param randomNumber Random number from Entropy
     */
    function _processDrawResults(bytes32 randomNumber) internal virtual;

    /**
     * @notice Distributes funds - must be implemented by child contracts
     */
    function distributeFunds() external virtual;

    /**
     * @notice Returns the Entropy contract address (internal implementation)
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /**
     * @notice Returns the Entropy contract address (public view)
     */
    function getEntropyAddress() external view returns (address) {
        return address(entropy);
    }

    /**
     * @notice Selects winner using binary search algorithm - O(log n) complexity
     */
    function _selectWinner(
        bytes32 entropySeed
    ) internal view returns (address) {
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

    // ============= VIEW FUNCTIONS =============

    function getParticipantsCount() external view returns (uint256) {
        return participants.length;
    }

    function getTicketRange(
        uint256 index
    ) external view returns (address owner, uint256 upperBound) {
        TicketRange memory range = participants[index];
        return (range.owner, range.upperBound);
    }

    function getTotalBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function isActive() external view returns (bool) {
        return
            state == RaffleState.Active &&
            block.timestamp < raffleStartTime + raffleDuration;
    }

    /**
     * @notice Checks if the raffle is closed (no longer accepts tickets but draw has not been executed yet)
     */
    function isClosed() external view returns (bool) {
        return state == RaffleState.Closed;
    }

    /**
     * @notice Checks if the raffle is finalized (draw has been executed)
     */
    function isFinalized() external view returns (bool) {
        return state == RaffleState.Finalized;
    }

    function getTimeRemaining() external view returns (uint256) {
        uint256 endTime = raffleStartTime + raffleDuration;
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }

    /**
     * @notice Manually closes the raffle (useful if you want to close it before the time expires)
     */
    function closeRaffle() external onlyOwnerOrAdmin {
        require(state == RaffleState.Active, "Raffle not active");
        state = RaffleState.Closed;
        emit RaffleClosed(block.timestamp);
    }

    /**
     * @notice Emergency function to force winner selection
     * @dev Only works if the raffle is closed or entropy has been requested
     */
    function forceSelectWinner(bytes32 randomNumber) external onlyOwnerOrAdmin {
        // If active, close it first
        if (state == RaffleState.Active) {
            require(
                block.timestamp >= raffleStartTime + raffleDuration,
                "Raffle still active"
            );
            state = RaffleState.Closed;
            emit RaffleClosed(block.timestamp);
        }
        require(
            state == RaffleState.Closed || state == RaffleState.AwaitingDraw,
            "Invalid state"
        );
        require(participants.length > 0, "No participants");
        require(totalTickets > 0, "No tickets sold");

        _processDrawResults(randomNumber);
        state = RaffleState.Finalized;
    }

    /**
     * @notice Returns raffle type identifier - must be implemented by child contracts
     */
    function getRaffleType() external view virtual returns (string memory);
}
