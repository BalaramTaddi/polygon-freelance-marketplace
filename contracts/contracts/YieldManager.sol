// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface ICompoundComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function baseToken() external view returns (address);
}

interface IMorpho {
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }
    function supply(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalfOf, bytes calldata data) external returns (uint256, uint256);
    function withdraw(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalfOf, address receiver) external returns (uint256, uint256);
}

/**
 * @title YieldManager
 * @notice Manages yield-bearing strategies for escrowed funds
 */
contract YieldManager is Ownable {
    using SafeERC20 for IERC20;

    /**
     * @notice Enum representing supported yield strategies.
     */
    enum Strategy { NONE, AAVE, COMPOUND, MORPHO }

    /**
     * @notice Configuration for a specific yield strategy.
     */
    struct StrategyConfig {
        address pool; // Aave Pool, Compound Comet, or Morpho address
        bool active;
    }

    /**
     * @notice Maps a Strategy enum to its configuration.
     */
    mapping(Strategy => StrategyConfig) public strategies;
    
    // Mapping for Morpho MarketParams (simplified for this module)
    mapping(address => IMorpho.MarketParams) public morphoMarkets;

    event YieldDeposited(Strategy strategy, address token, uint256 amount);
    event YieldWithdrawn(Strategy strategy, address token, uint256 amount);
    event StrategyUpdated(Strategy strategy, address pool, bool active);

    constructor(address _owner) Ownable(_owner) {}

    function setStrategy(Strategy strategy, address pool, bool active) external onlyOwner {
        strategies[strategy] = StrategyConfig(pool, active);
        emit StrategyUpdated(strategy, pool, active);
    }

    function setMorphoMarket(address token, IMorpho.MarketParams calldata params) external onlyOwner {
        morphoMarkets[token] = params;
    }

    /**
     * @notice Deposit tokens into a yield strategy
     */
    function deposit(Strategy strategy, address token, uint256 amount) external {
        if (strategy == Strategy.NONE) return;
        
        StrategyConfig memory config = strategies[strategy];
        require(config.active, "Strategy not active");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(token).forceApprove(config.pool, amount);

        if (strategy == Strategy.AAVE) {
            IAavePool(config.pool).supply(token, amount, address(this), 0);
        } else if (strategy == Strategy.COMPOUND) {
            ICompoundComet(config.pool).supply(token, amount);
        } else if (strategy == Strategy.MORPHO) {
            IMorpho.MarketParams memory params = morphoMarkets[token];
            IMorpho(config.pool).supply(params, amount, 0, address(this), "");
        }
        
        emit YieldDeposited(strategy, token, amount);
    }

    /**
     * @notice Withdraw tokens from a yield strategy
     */
    function withdraw(Strategy strategy, address token, uint256 amount, address receiver) external {
        if (strategy == Strategy.NONE) {
             IERC20(token).safeTransferFrom(msg.sender, receiver, amount);
             return;
        }

        StrategyConfig memory config = strategies[strategy];
        
        if (strategy == Strategy.AAVE) {
            IAavePool(config.pool).withdraw(token, amount, receiver);
        } else if (strategy == Strategy.COMPOUND) {
            ICompoundComet(config.pool).withdraw(token, amount);
            IERC20(token).safeTransfer(receiver, amount);
        } else if (strategy == Strategy.MORPHO) {
            IMorpho.MarketParams memory params = morphoMarkets[token];
            IMorpho(config.pool).withdraw(params, amount, 0, address(this), receiver);
        }

        emit YieldWithdrawn(strategy, token, amount);
    }
}
