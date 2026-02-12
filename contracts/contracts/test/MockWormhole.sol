// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockWormhole {
    struct VM {
        uint8 version;
        uint32 timestamp;
        uint32 nonce;
        uint16 emitterChainId;
        bytes32 emitterAddress;
        uint64 sequence;
        uint8 consistencyLevel;
        bytes payload;
        uint32 guardianSetIndex;
        Signature[] signatures;
        bytes32 hash;
    }

    struct Signature {
        bytes32 r;
        bytes32 s;
        uint8 v;
        uint8 guardianIndex;
    }

    function publishMessage(
        uint32,
        bytes memory payload,
        uint8
    ) external payable returns (uint64) {
        return 1;
    }

    function parseAndVerifyVM(bytes calldata) external pure returns (VM memory vm, bool valid, string memory reason) {
        return (vm, true, "");
    }
}
