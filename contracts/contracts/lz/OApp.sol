// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// Minimal OApp standard for LayerZero V2 integration without a full npm dependency
abstract contract OApp is Ownable {
    address public lzEndpoint;
    mapping(uint32 => bytes32) public peers;

    /**
     * @dev Constructor for OApp, initializing it with an owner.
     */
    constructor(address _owner) Ownable(_owner) {}

    function __OApp_init(address _endpoint) internal {
        lzEndpoint = _endpoint;
    }

    function setPeer(uint32 _eid, bytes32 _peer) external virtual onlyOwner {
        peers[_eid] = _peer;
    }

    // placeholder for _lzSend and _lzReceive
}
