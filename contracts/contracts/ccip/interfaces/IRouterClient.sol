// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Client} from "../Client.sol";

interface IRouterClient {
    error UnsupportedDestinationChain(uint64 destinationChainSelector);
    error InsufficientFeeTokenAmount();
    error InvalidMsgValue();

    function getFee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external view returns (uint256 fee);

    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external payable returns (bytes32 messageId);

    function isChainSupported(uint64 chainSelector) external view returns (bool);
}
