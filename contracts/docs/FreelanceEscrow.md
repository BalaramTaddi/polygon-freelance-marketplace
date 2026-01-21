# Solidity API

## FreelanceEscrow

Refactored for Antigravity's EVM.
Implements: 1. Milestone Factory, 2. Decentralized Dispute Resolution, 3. Soulbound Identity (SBT).
This contract handles the locking and release of funds for freelance work on the Polygon network.

### JobStatus

```solidity
enum JobStatus {
  Created,
  Ongoing,
  Disputed,
  Completed,
  Cancelled
}
```

### Milestone

Milestone details

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Milestone {
  uint256 amount;
  string ipfsHash;
}
```

### Job

Job details

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct Job {
  address client;
  address freelancer;
  uint256 amount;
  uint256 totalPaidOut;
  enum FreelanceEscrow.JobStatus status;
  uint16 categoryId;
  uint16 milestoneCount;
  uint8 rating;
  bool paid;
  address token;
  string ipfsHash;
}
```

### jobs

```solidity
mapping(uint256 => struct FreelanceEscrow.Job) jobs
```

### jobMilestones

```solidity
mapping(uint256 => mapping(uint256 => struct FreelanceEscrow.Milestone)) jobMilestones
```

### milestoneBitmask

```solidity
mapping(uint256 => uint256) milestoneBitmask
```

### disputeIdToJobId

```solidity
mapping(uint256 => uint256) disputeIdToJobId
```

### jobCount

```solidity
uint256 jobCount
```

### arbitrator

```solidity
address arbitrator
```

### sbtContract

```solidity
address sbtContract
```

### entryPoint

```solidity
address entryPoint
```

### trustedForwarder

```solidity
address trustedForwarder
```

### MANAGER_ROLE

```solidity
bytes32 MANAGER_ROLE
```

### JobCreated

```solidity
event JobCreated(uint256 jobId, address client, address freelancer, uint256 amount)
```

### FundsReleased

```solidity
event FundsReleased(uint256 jobId, address freelancer, uint256 amount)
```

### MilestoneReleased

```solidity
event MilestoneReleased(uint256 jobId, uint256 milestoneId, uint256 amount)
```

### DisputeRaised

```solidity
event DisputeRaised(uint256 jobId, uint256 disputeId)
```

### NotAuthorized

```solidity
error NotAuthorized()
```

### InvalidStatus

```solidity
error InvalidStatus()
```

### AlreadyPaid

```solidity
error AlreadyPaid()
```

### InvalidMilestone

```solidity
error InvalidMilestone()
```

### InvalidAddress

```solidity
error InvalidAddress()
```

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(address admin, address forwarder, address _sbt, address _entry) public
```

### setSBTContract

```solidity
function setSBTContract(address _sbt) external
```

### setEntryPoint

```solidity
function setEntryPoint(address _entry) external
```

### setArbitrator

```solidity
function setArbitrator(address _arb) external
```

### pause

```solidity
function pause() external
```

Emergency stop for platform interactions.
Only callable by the administrator.

### unpause

```solidity
function unpause() external
```

Resumes the platform after a pause.
Only callable by the administrator.

### CreateParams

```solidity
struct CreateParams {
  uint256 categoryId;
  address freelancer;
  address token;
  uint256 amount;
  string ipfsHash;
  uint256[] mAmounts;
  string[] mHashes;
}
```

### createJob

```solidity
function createJob(struct FreelanceEscrow.CreateParams p) external payable
```

Milestone Factory: Locks funds and defines stages upfront.

### releaseMilestone

```solidity
function releaseMilestone(uint256 jobId, uint256 mId) external
```

Stage-based release of funds.

### completeJob

```solidity
function completeJob(uint256 jobId, uint8 rating) external
```

Completion and SBT Minting.

### raiseDispute

```solidity
function raiseDispute(uint256 jobId) external payable
```

Decentralized Dispute Integration.

### rule

```solidity
function rule(uint256 dId, uint256 ruling) external
```

### _sendFunds

```solidity
function _sendFunds(address to, address token, uint256 amt) internal
```

### tokenURI

```solidity
function tokenURI(uint256 jobId) public view returns (string)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 id) public view returns (bool)
```

### _msgSender

```solidity
function _msgSender() internal view virtual returns (address sender)
```

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal
```

