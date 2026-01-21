# Solidity API

## PolyCompletionSBT

Soulbound Token (ERC-5192) for Job Completion Certificates on PolyLance.

_These tokens are non-transferable (Soulbound) and serve as on-chain proof of successful delivery.
Metadata is generated on-chain as a Base64-encoded JSON object._

### marketplace

```solidity
address marketplace
```

Authorized marketplace address allowed to mint certificates

### CertificateData

Structure to store certificate-specific data

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct CertificateData {
  uint16 categoryId;
  uint8 rating;
  uint48 completionTimestamp;
  uint256 jobId;
  address client;
}
```

### certificateDetails

```solidity
mapping(uint256 => struct PolyCompletionSBT.CertificateData) certificateDetails
```

Maps token ID to its certificate metadata

### NotMarketplace

```solidity
error NotMarketplace()
```

Error thrown when an unauthorized address attempts to mint

### Soulbound

```solidity
error Soulbound()
```

Error thrown when a transfer of a Soulbound token is attempted

### NonExistentToken

```solidity
error NonExistentToken()
```

Error thrown when querying a non-existent token

### constructor

```solidity
constructor(address initialOwner, address _marketplace) public
```

Initializes the PolyCompletionSBT contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | Address of the contract administrator |
| _marketplace | address | Address of the PolyLance Escrow/Marketplace contract |

### setMarketplace

```solidity
function setMarketplace(address _marketplace) external
```

Updates the authorized marketplace address

_Only callable by the contract owner_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _marketplace | address | New marketplace address |

### mintContribution

```solidity
function mintContribution(address to, uint16 categoryId, uint8 rating, uint256 jobId, address client) external returns (uint256)
```

Mints a soulbound contribution certificate

_Restricted to the authorized Marketplace contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient address (freelancer) |
| categoryId | uint16 | Job category ID |
| rating | uint8 | Rating awarded for the job |
| jobId | uint256 | The ID of the job being completed |
| client | address | The address of the client |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 The ID of the newly minted certificate |

### locked

```solidity
function locked(uint256 tokenId) external view returns (bool)
```

ERC-5192: Returns the locking status of a token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of the token to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool Always returns true as certificates are Soulbound by design |

### _update

```solidity
function _update(address to, uint256 tokenId, address auth) internal returns (address)
```

_Internal hook to prevent all transfers except minting and burning_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | Recipient address |
| tokenId | uint256 | Token ID being updated |
| auth | address | Address authorized for the operation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | address The address of the previous owner |

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

Generates on-chain metadata for a given certificate

_Returns a Base64-encoded JSON metadata object_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of the token |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | string Data URI containing the JSON metadata |

### _getCategoryName

```solidity
function _getCategoryName(uint16 id) internal pure returns (string)
```

_Helper to resolve category ID to a human-readable name_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint16 | Category identifier |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | string Human-readable category name |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

Standard interface support check (includes ERC-5192 support)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface identifier |

