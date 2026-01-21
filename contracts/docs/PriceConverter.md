# Solidity API

## PriceConverter

Library for converting token amounts to USD using Chainlink Price Feeds

_Supports multiple price feeds for different tokens_

### StalePrice

```solidity
error StalePrice()
```

### InvalidPrice

```solidity
error InvalidPrice()
```

### PriceFeedNotSet

```solidity
error PriceFeedNotSet()
```

### getUSDValue

```solidity
function getUSDValue(uint256 tokenAmount, address priceFeed) internal view returns (uint256)
```

Convert token amount to USD value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenAmount | uint256 | Amount of tokens in wei |
| priceFeed | address | Chainlink price feed address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | USD value with 8 decimals (Chainlink standard) |

### getTokenAmount

```solidity
function getTokenAmount(uint256 usdAmount, address priceFeed) internal view returns (uint256)
```

Convert USD value to token amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| usdAmount | uint256 | USD amount with 8 decimals |
| priceFeed | address | Chainlink price feed address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Token amount in wei |

### getPrice

```solidity
function getPrice(address priceFeed) internal view returns (uint256 price, uint8 decimals)
```

Get the current price from a feed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceFeed | address | Chainlink price feed address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| price | uint256 | Current price with feed's decimals |
| decimals | uint8 | Number of decimals in the price |

