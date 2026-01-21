# Solidity API

## IFreelanceSBT

Minimal interface for the Soulbound Token used for reputation-based voting.

### balanceOf

```solidity
function balanceOf(address owner) external view returns (uint256)
```

Returns the number of reputation tokens held by an owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Address of the token holder |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Balance of SBTs |

## FreelanceGovernance

Reputation-based governance system for the PolyLance ecosystem.

_Users with a minimum number of Soulbound Tokens (SBTs) can create proposals.
Voting weight is proportional to the number of SBTs (reputation) held._

### sbtContract

```solidity
contract IFreelanceSBT sbtContract
```

The contract address of the reputation SBT

### Proposal

Data structure representing a governance proposal

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Proposal {
  uint256 id;
  address proposer;
  string description;
  uint256 forVotes;
  uint256 againstVotes;
  uint256 startTime;
  uint256 endTime;
  bool executed;
  mapping(address => bool) hasVoted;
}
```

### proposalCount

```solidity
uint256 proposalCount
```

Total number of proposals ever created

### proposals

```solidity
mapping(uint256 => struct FreelanceGovernance.Proposal) proposals
```

Mapping from proposal ID to proposal details

### VOTING_PERIOD

```solidity
uint256 VOTING_PERIOD
```

Duration for which voting is open (3 days)

### MIN_REPUTATION_FOR_PROPOSAL

```solidity
uint256 MIN_REPUTATION_FOR_PROPOSAL
```

Minimum SBT balance required to create a new proposal

### ProposalCreated

```solidity
event ProposalCreated(uint256 proposalId, address proposer, string description)
```

### Voted

```solidity
event Voted(uint256 proposalId, address voter, bool support, uint256 weight)
```

### ProposalExecuted

```solidity
event ProposalExecuted(uint256 proposalId)
```

### constructor

```solidity
constructor(address _sbtContract) public
```

Deploys the governance contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sbtContract | address | Address of the reputation SBT contract |

### createProposal

```solidity
function createProposal(string description) external
```

Creates a new governance proposal

_User must have at least MIN_REPUTATION_FOR_PROPOSAL SBTs_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| description | string | Textual description of the proposal |

### vote

```solidity
function vote(uint256 proposalId, bool support) external
```

Casts a vote on a proposal

_Voting power is equal to the sender's SBT balance_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | ID of the proposal to vote on |
| support | bool | True to vote for, False to vote against |

### executeProposal

```solidity
function executeProposal(uint256 proposalId) external
```

Finalizes a proposal after the voting period has ended

_Proposal must have more 'for' votes than 'against' votes_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposalId | uint256 | ID of the proposal to execute |

