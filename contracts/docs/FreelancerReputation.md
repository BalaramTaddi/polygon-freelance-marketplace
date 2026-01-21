# Solidity API

## FreelancerReputation

Tracks multi-category skill levels using ERC-1155 tokens.

_Each token ID represents a category (e.g., 1 for Dev, 2 for Design).
The balance of the token represents the 'level' or 'experience points'.
This contract is intentionally soulbound by logic if not transferring is enforced, 
but here it follows standard ERC1155 for reputation accumulation._

### MINTER_ROLE

```solidity
bytes32 MINTER_ROLE
```

Role authorized to mint reputation points (usually the Escrow contract)

### UPGRADER_ROLE

```solidity
bytes32 UPGRADER_ROLE
```

Role authorized to authorize UUPS upgrades

### KARMA_ID

```solidity
uint256 KARMA_ID
```

ID for the general Karma category (used for fee discounts)

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(address defaultAdmin, string uri) public
```

Initializes the FreelancerReputation contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| defaultAdmin | address | Address granted the admin, minter, and upgrader roles |
| uri | string | Metadata URI for the reputation categories |

### setURI

```solidity
function setURI(string newuri) public
```

Updates the metadata URI for all token types

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newuri | string | The new metadata URI |

### levelUp

```solidity
function levelUp(address to, uint256 id, uint256 amount) public
```

Increases a freelancer's reputation level in a specific category

_Restricted to addresses with MINTER_ROLE_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The freelancer's address |
| id | uint256 | The category ID (e.g., 1 for Development, 2 for Design) |
| amount | uint256 | The amount of experience/reputation points to add |

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address newImplementation) internal
```

_Compliance hook for UUPS upgrades._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newImplementation | address | Address of the new implementation |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

Standard interface support check

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface identifier |

