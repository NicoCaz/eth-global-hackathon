// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./BaseRaffle.sol";

/**
 * @title SingleWinnerRaffle
 * @notice Raffle with a single winner (standard implementation)
 * @dev Distributes funds between project, platform, and one winner
 */
contract SingleWinnerRaffle is BaseRaffle {
    address public winner;

    event DrawExecuted(address indexed winner, uint256 ticketNumber);
    event WinnerPaid(address indexed winner, uint256 amount);

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
    )
        BaseRaffle(
            _projectPercentage,
            _entropyAddress,
            _initialOwner,
            _platformAdmin,
            _projectAddress,
            _raffleDuration,
            _platformFee,
            _minTicketPrice,
            _entropyCallbackGasLimit
        )
    {}

    /**
     * @notice Process draw results for single winner
     */
    function _processDrawResults(bytes32 randomNumber) internal override {
        winner = _selectWinner(randomNumber);
        emit DrawExecuted(winner, uint256(randomNumber) % totalTickets);
    }

    /**
     * @notice Distributes funds between project, platform admin, and winner
     */
    function distributeFunds() external override onlyOwnerOrAdmin nonReentrant {
        require(state == RaffleState.Finalized, "Draw not executed");
        require(!fundsDistributed, "Funds already distributed");
        require(winner != address(0), "No winner selected");
        require(projectAddress != address(0), "Invalid project address");

        fundsDistributed = true;

        uint256 totalBalance = address(this).balance;

        // Calculate distribution
        uint256 platformAmount = (totalBalance * platformFee) / BASIS_POINTS;
        uint256 distributablePool = totalBalance - platformAmount;
        uint256 projectAmount = (distributablePool * projectPercentage) /
            BASIS_POINTS;
        uint256 winnerAmount = distributablePool - projectAmount;

        // Transfer using PullPayment pattern
        _asyncTransfer(projectAddress, projectAmount);
        _asyncTransfer(platformAdmin, platformAmount);
        _asyncTransfer(winner, winnerAmount);

        emit FundsDistributed(
            projectAddress,
            platformAdmin,
            projectAmount,
            platformAmount
        );
        emit WinnerPaid(winner, winnerAmount);
    }

    /**
     * @notice Preview winner for testing
     */
    function previewWinner(
        bytes32 entropySeed
    ) external view returns (address) {
        require(participants.length > 0, "No participants");
        return _selectWinner(entropySeed);
    }

    /**
     * @notice Returns raffle type identifier
     */
    function getRaffleType() external pure override returns (string memory) {
        return "SINGLE_WINNER";
    }
}
