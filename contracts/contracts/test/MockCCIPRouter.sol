// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Client} from "../ccip/Client.sol";
import {IRouterClient} from "../ccip/interfaces/IRouterClient.sol";

contract MockCCIPRouter is IRouterClient {
    function getFee(uint64, Client.EVM2AnyMessage memory) external pure returns (uint256) {
        return 0.1 ether;
    }

    function ccipSend(uint64, Client.EVM2AnyMessage memory) external payable returns (bytes32) {
        return keccak256(abi.encodePacked(block.timestamp, msg.sender));
    }

    function isChainSupported(uint64) external pure returns (bool) {
        return true;
    }
}
