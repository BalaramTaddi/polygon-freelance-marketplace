// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract PolyToken is ERC20Votes, ERC20Permit, Ownable {
    constructor(address initialOwner) 
        ERC20("PolyLance Token", "POLY") 
        ERC20Permit("PolyLance Token")
        Ownable(initialOwner) 
    {
        _mint(initialOwner, 1_000_000_000 * 10 ** decimals()); // 1 Billion Supply
    }

    // The functions below are overrides required by Solidity.

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
