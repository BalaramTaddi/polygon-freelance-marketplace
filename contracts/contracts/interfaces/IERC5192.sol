// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC5192
 * @dev Minimal interface for Soulbound tokens as per ERC-5192.
 */
interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}
