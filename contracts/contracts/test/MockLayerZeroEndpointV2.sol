// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lz/interfaces/ILayerZeroEndpointV2.sol";

contract MockLayerZeroEndpointV2 is ILayerZeroEndpointV2 {
    uint32 public eid;

    constructor(uint32 _eid) {
        eid = _eid;
    }

    function quote(MessagingParams calldata, address) external pure returns (MessagingFee memory) {
        return MessagingFee(0.05 ether, 0);
    }

    function send(MessagingParams calldata, address) external payable returns (MessagingReceipt memory) {
        return MessagingReceipt(bytes32(uint256(1)), 1, MessagingFee(msg.value, 0));
    }

    function setDelegate(address) external {}
}
