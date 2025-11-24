// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import "@pythnetwork/entropy-sdk-solidity/EntropyStructsV2.sol";

contract MockEntropy is IEntropyV2 {
    address public defaultProvider;
    uint128 public baseFee;
    uint64 public counter;

    struct Request {
        address consumer;
        address provider;
    }

    mapping(uint64 => Request) public requests;

    constructor(address _defaultProvider, uint128 _baseFee) {
        defaultProvider = _defaultProvider;
        baseFee = _baseFee;
    }

    function setDefaultProvider(address provider) external {
        defaultProvider = provider;
    }

    function setFee(uint128 newFee) external {
        baseFee = newFee;
    }

    function getDefaultProvider() external view override returns (address) {
        return defaultProvider;
    }

    // V2 API - métodos principales
    function getFeeV2() external view override returns (uint128) {
        return baseFee;
    }

    function getFeeV2(uint32) external view override returns (uint128) {
        return baseFee;
    }

    function getFeeV2(address, uint32) external view override returns (uint128) {
        return baseFee;
    }

    function requestV2() external payable override returns (uint64) {
        require(msg.value >= baseFee, "MockEntropy: insufficient fee");
        counter++;
        requests[counter] = Request({consumer: msg.sender, provider: defaultProvider});
        return counter;
    }

    function requestV2(uint32) external payable override returns (uint64) {
        require(msg.value >= baseFee, "MockEntropy: insufficient fee");
        counter++;
        requests[counter] = Request({consumer: msg.sender, provider: defaultProvider});
        return counter;
    }

    function requestV2(address provider, uint32) external payable override returns (uint64) {
        require(msg.value >= baseFee, "MockEntropy: insufficient fee");
        counter++;
        requests[counter] = Request({consumer: msg.sender, provider: provider});
        return counter;
    }

    function requestV2(
        address provider,
        bytes32,
        uint32
    ) external payable override returns (uint64) {
        require(msg.value >= baseFee, "MockEntropy: insufficient fee");
        counter++;
        requests[counter] = Request({consumer: msg.sender, provider: provider});
        return counter;
    }

    function getProviderInfoV2(address) external pure override returns (EntropyStructsV2.ProviderInfo memory) {
        revert("MockEntropy: not implemented");
    }

    function getRequestV2(address, uint64) external pure override returns (EntropyStructsV2.Request memory) {
        revert("MockEntropy: not implemented");
    }

    // Helper para tests - responder con número aleatorio
    function respond(uint64 sequenceNumber, bytes32 randomNumber) external {
        Request memory req = requests[sequenceNumber];
        require(req.consumer != address(0), "MockEntropy: unknown request");
        IEntropyConsumer(req.consumer)._entropyCallback(
            sequenceNumber,
            req.provider,
            randomNumber
        );
    }
}

