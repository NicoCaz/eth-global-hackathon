// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IEntropyV2.sol";
import "../interfaces/IEntropyConsumer.sol";

contract MockEntropy is IEntropyV2 {
    address public defaultProvider;
    uint256 public fee;
    uint64 public counter;

    struct Request {
        address consumer;
        address provider;
    }

    mapping(uint64 => Request) public requests;

    constructor(address _defaultProvider, uint256 _fee) {
        defaultProvider = _defaultProvider;
        fee = _fee;
    }

    function setDefaultProvider(address provider) external {
        defaultProvider = provider;
    }

    function setFee(uint256 newFee) external {
        fee = newFee;
    }

    function getDefaultProvider() external view override returns (address) {
        return defaultProvider;
    }

    function getFee(address) external view override returns (uint256) {
        return fee;
    }

    function request(
        address provider,
        bytes32,
        bool
    ) external payable override returns (uint64 sequenceNumber) {
        require(msg.value >= fee, "MockEntropy: insufficient fee");
        counter++;
        requests[counter] = Request({consumer: msg.sender, provider: provider});
        return counter;
    }

    function respond(uint64 sequenceNumber, bytes32 randomNumber) external {
        Request memory req = requests[sequenceNumber];
        require(req.consumer != address(0), "MockEntropy: unknown request");
        IEntropyConsumer(req.consumer).entropyCallback(
            sequenceNumber,
            req.provider,
            randomNumber
        );
    }
}

