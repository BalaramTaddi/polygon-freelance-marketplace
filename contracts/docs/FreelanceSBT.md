# Solidity API

## FreelanceSBT

Soulbound Token (non-transferable) for freelancer reputation and ratings.

_Implements ERC-721 with non-transferability (Soulbound) and ERC-5192 locking events.
Tokens represent completed jobs and their associated persistent ratings._

### MINTER_ROLE

```solidity
bytes32 MINTER_ROLE
```

Role authorized to mint reputation tokens (usually the Escrow contract)

### SoulboundTokenNonTransferable

```solidity
error SoulboundTokenNonTransferable()
```

Error thrown when a transfer of a Soulbound token is attempted

### constructor

```solidity
constructor(address defaultAdmin, address minter) public
```

Initializes the FreelanceSBT contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| defaultAdmin | address | Address for the primary administrator |
| minter | address | Initial address granted the MINTER_ROLE |

### safeMint

```solidity
function safeMint(address to, string uri) public
```

Mints a reputation token (Soulbound) to a freelancer

_Only callable by addresses with MINTER_ROLE_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The freelancer's wallet address |
| uri | string | IPFS CID containing job completion and rating metadata |

### _update

```solidity
function _update(address to, uint256 tokenId, address auth) internal returns (address)
```

_Internal hook to prevent transfers (Soulbound logic)
Reverts if 'from' and 'to' are both non-zero (indicating a transfer rather than mint/burn)_

### locked

```solidity
function locked(uint256 tokenId) external view returns (bool)
```

Checks if a token is locked as per ERC-5192

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of the token to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Always returns true for minted tokens in this SBT implementation |

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

Returns the URI for a given token ID

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of the token |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

Standard interface support check

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface identifier |

