// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IArbitrator {
    function createDispute(uint256 _choices, bytes calldata _extraData) external payable returns (uint256 disputeID);
    function arbitrationCost(bytes calldata _extraData) external view returns (uint256 cost);
}

interface IArbitrable {
    event Ruling(IArbitrator indexed _arbitrator, uint256 indexed _disputeID, uint256 _ruling);
    function rule(uint256 _disputeID, uint256 _ruling) external;
}
