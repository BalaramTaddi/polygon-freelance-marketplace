// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFreelanceSBT {
    function mintContribution(address to, uint16 categoryId, uint8 rating, uint256 jobId, address client) external returns (uint256);
}
