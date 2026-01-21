# Solidity API

## IArbitrator

### createDispute

```solidity
function createDispute(uint256 _choices, bytes _extraData) external payable returns (uint256 disputeID)
```

### arbitrationCost

```solidity
function arbitrationCost(bytes _extraData) external view returns (uint256 cost)
```

## IArbitrable

### Ruling

```solidity
event Ruling(contract IArbitrator _arbitrator, uint256 _disputeID, uint256 _ruling)
```

### rule

```solidity
function rule(uint256 _disputeID, uint256 _ruling) external
```

