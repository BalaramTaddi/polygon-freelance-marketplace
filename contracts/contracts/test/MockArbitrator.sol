// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IArbitrator.sol";

contract MockArbitrator is IArbitrator {
    uint256 public disputeCount;

    function createDispute(uint256 _choices, bytes calldata _extraData) external payable override returns (uint256 disputeID) {
        disputeCount++;
        return disputeCount;
    }

    function arbitrationCost(bytes calldata _extraData) external view override returns (uint256 cost) {
        return 0; // Free for testing
    }

    function executeRuling(address target, uint256 disputeID, uint256 ruling) external {
        IArbitrable(target).rule(disputeID, ruling);
    }
}
