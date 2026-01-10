// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title PolyToken
 * @author PolyLance Team
 * @notice The utility and governance token for the PolyLance ecosystem.
 * @dev Features ERC20Votes for governance, ERC20Permit for gasless approvals, 
 * and role-based minting for platform rewards.
 */
contract PolyToken is ERC20Votes, ERC20Permit, AccessControl, Ownable {
    /// @notice Role authorized to mint new tokens (e.g., Escrow contract)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @notice Deploys PolyToken with a fixed initial supply
     * @param initialAdmin Address of the super-admin and initial liquidity holder
     */
    constructor(address initialAdmin) 
        ERC20("PolyLance Token", "POLY") 
        ERC20Permit("PolyLance Token")
        Ownable(initialAdmin)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialAdmin);
        _mint(initialAdmin, 1_000_000_000 * 10 ** decimals()); // 1 Billion Supply
    }

    /**
     * @notice Mints new tokens to a specified address
     * @dev Restricted to addresses with MINTER_ROLE
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    // The functions below are overrides required by Solidity.

    /**
     * @dev Internal hook for token movement (required by ERC20Votes)
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    /**
     * @dev Returns the current nonce for ERC20Permit
     */
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
