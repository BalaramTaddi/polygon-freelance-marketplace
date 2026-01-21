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

### Dispute

```solidity
event Dispute(contract IArbitrator _arbitrator, uint256 _disputeID, uint256 _metaEvidenceID, uint256 _evidenceID)
```

### Evidence

```solidity
event Evidence(contract IArbitrator _arbitrator, uint256 _evidenceID, address _party, string _evidence)
```

### Ruling

```solidity
event Ruling(contract IArbitrator _arbitrator, uint256 _disputeID, uint256 _ruling)
```

### rule

```solidity
function rule(uint256 _disputeID, uint256 _ruling) external
```

## FreelanceEscrowBase

### JobStatus

```solidity
enum JobStatus {
  Created,
  Accepted,
  Ongoing,
  Disputed,
  Arbitration,
  Completed,
  Cancelled
}
```

### Milestone

```solidity
struct Milestone {
  uint256 amount;
  string ipfsHash;
}
```

### Job

```solidity
struct Job {
  address client;
  uint32 id;
  uint48 deadline;
  enum FreelanceEscrowBase.JobStatus status;
  uint8 rating;
  address freelancer;
  uint16 categoryId;
  uint16 milestoneCount;
  bool paid;
  address token;
  uint256 amount;
  uint256 freelancerStake;
  uint256 totalPaidOut;
  string ipfsHash;
}
```

### Application

```solidity
struct Application {
  address freelancer;
  uint256 stake;
}
```

### jobs

```solidity
mapping(uint256 => struct FreelanceEscrowBase.Job) jobs
```

### jobMilestones

```solidity
mapping(uint256 => mapping(uint256 => struct FreelanceEscrowBase.Milestone)) jobMilestones
```

### jobApplications

```solidity
mapping(uint256 => struct FreelanceEscrowBase.Application[]) jobApplications
```

### hasApplied

```solidity
mapping(uint256 => mapping(address => bool)) hasApplied
```

### pendingRefunds

```solidity
mapping(address => mapping(address => uint256)) pendingRefunds
```

### jobCount

```solidity
uint256 jobCount
```

### APPLICATION_STAKE_PERCENT

```solidity
uint256 APPLICATION_STAKE_PERCENT
```

### ARBITRATOR_ROLE

```solidity
bytes32 ARBITRATOR_ROLE
```

### MANAGER_ROLE

```solidity
bytes32 MANAGER_ROLE
```

### arbitrator

```solidity
address arbitrator
```

### _trustedForwarder

```solidity
address _trustedForwarder
```

### entryPoint

```solidity
address entryPoint
```

### vault

```solidity
address vault
```

### platformFeeBps

```solidity
uint256 platformFeeBps
```

### milestoneBitmask

```solidity
mapping(uint256 => uint256) milestoneBitmask
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

### MilestoneAlreadyReleased

```solidity
error MilestoneAlreadyReleased()
```

### InvalidMilestone

```solidity
error InvalidMilestone()
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

### JobCreated

```solidity
event JobCreated(uint256 jobId, address client, address freelancer, uint256 amount, uint256 deadline)
```

### FundsReleased

```solidity
event FundsReleased(uint256 jobId, address freelancer, uint256 amount, uint256 nftId)
```

### MilestoneReleased

```solidity
event MilestoneReleased(uint256 jobId, uint256 milestoneId, uint256 amount)
```

### DisputeRaised

```solidity
event DisputeRaised(uint256 jobId, uint256 disputeId)
```

