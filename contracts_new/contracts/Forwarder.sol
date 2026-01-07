// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title Forwarder
 * @dev EIP-2771 Forwarder for PolyLance gasless transactions (OZ v5).
 */
contract PolyLanceForwarder is ERC2771Forwarder {
    constructor(string memory name) ERC2771Forwarder(name) {}
}
