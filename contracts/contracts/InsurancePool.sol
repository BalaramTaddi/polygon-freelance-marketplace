// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title InsurancePool
 * @notice Collects fees from jobs and provides a safety net for disputes.
 */
contract InsurancePool is Ownable {
    mapping(address => uint256) public balances;
    uint256 public totalInsurancePool;

    event FundsAdded(address indexed token, uint256 amount);
    event PayoutExecuted(address indexed token, address indexed recipient, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Allows the Escrow contract to deposit a portion of the fee.
     */
    function deposit(address token, uint256 amount) external {
        if (token == address(0)) {
            // This would be called via receive() or a specific payable function if we used native
            revert("Use depositNative");
        }
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        balances[token] += amount;
        emit FundsAdded(token, amount);
    }

    function depositNative() external payable {
        balances[address(0)] += msg.value;
        emit FundsAdded(address(0), msg.value);
    }

    /**
     * @notice Executed by the DAO or Admin to resolve extreme cases.
     */
    function payout(address token, address to, uint256 amount) external onlyOwner {
        require(balances[token] >= amount, "Insufficient pool funds");
        balances[token] -= amount;
        
        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "Native payout failed");
        } else {
            IERC20(token).transfer(to, amount);
        }

        emit PayoutExecuted(token, to, amount);
    }

    receive() external payable {
        balances[address(0)] += msg.value;
    }
}
