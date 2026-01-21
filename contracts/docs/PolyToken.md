# Solidity API

## PolyToken

The utility and governance token for the PolyLance ecosystem.

_Features ERC20Votes for governance, ERC20Permit for gasless approvals, 
and role-based minting for platform rewards._

### MINTER_ROLE

```solidity
bytes32 MINTER_ROLE
```

Role authorized to mint new tokens (e.g., Escrow contract)

### constructor

```solidity
constructor(address initialAdmin) public
```

Deploys PolyToken with a fixed initial supply

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialAdmin | address | Address of the super-admin and initial liquidity holder |

### mint

```solidity
function mint(address to, uint256 amount) external
```

Mints new tokens to a specified address

_Restricted to addresses with MINTER_ROLE_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient address |
| amount | uint256 | Amount to mint |

### _update

```solidity
function _update(address from, address to, uint256 value) internal
```

_Internal hook for token movement (required by ERC20Votes)_

### nonces

```solidity
function nonces(address owner) public view returns (uint256)
```

_Returns the current nonce for ERC20Permit_

