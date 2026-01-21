# Solidity API

## InsurancePool

Collects fees from jobs and provides a safety net for disputes.

_Manages both Native (MATIC) and ERC20 token balances for insurance payouts._

### balances

```solidity
mapping(address => uint256) balances
```

Current balance of each token held in the pool

### totalInsurancePool

```solidity
mapping(address => uint256) totalInsurancePool
```

Total historical deposits for each token

### FundsAdded

```solidity
event FundsAdded(address token, uint256 amount)
```

### PayoutExecuted

```solidity
event PayoutExecuted(address token, address recipient, uint256 amount)
```

### constructor

```solidity
constructor(address initialOwner) public
```

Deploys the insurance pool

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialOwner | address | Address of the pool administrator |

### deposit

```solidity
function deposit(address token, uint256 amount) external
```

Allows the Escrow contract to deposit ERC20 fees

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Address of the payment token |
| amount | uint256 | Amount to deposit |

### depositNative

```solidity
function depositNative() external payable
```

Allows depositing native MATIC fee

### payout

```solidity
function payout(address token, address to, uint256 amount) external
```

Executed by the Admin to resolve extreme cases or fund external arbitration

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | Address of the token to pay out |
| to | address | Recipient address |
| amount | uint256 | Payout amount |

### receive

```solidity
receive() external payable
```

Fallback to accept direct native transfers

