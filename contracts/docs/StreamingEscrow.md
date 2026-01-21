# Solidity API

## StreamingEscrow

Continuous Settlement Escrow for real-time payments on high-performance chains.
Funds flow from employer to freelancer based on elapsed time.

### ARBITRATOR_ROLE

```solidity
bytes32 ARBITRATOR_ROLE
```

### Stream

```solidity
struct Stream {
  address sender;
  address recipient;
  uint256 deposit;
  address tokenAddress;
  uint256 startTime;
  uint256 stopTime;
  uint256 ratePerSecond;
  uint256 remainingBalance;
  uint256 lastUpdateTimestamp;
  uint256 totalPausedDuration;
  bool isPaused;
  bool isDisputed;
}
```

### nextStreamId

```solidity
uint256 nextStreamId
```

### streams

```solidity
mapping(uint256 => struct StreamingEscrow.Stream) streams
```

### reputationContract

```solidity
contract FreelancerReputation reputationContract
```

### feeCollector

```solidity
address feeCollector
```

### BASE_FEE_BPS

```solidity
uint256 BASE_FEE_BPS
```

### MIN_FEE_BPS

```solidity
uint256 MIN_FEE_BPS
```

### KARMA_THRESHOLD

```solidity
uint256 KARMA_THRESHOLD
```

### StreamCreated

```solidity
event StreamCreated(uint256 streamId, address sender, address recipient, uint256 deposit, address token, uint256 startTime, uint256 stopTime)
```

### Withdrawal

```solidity
event Withdrawal(uint256 streamId, uint256 amount)
```

### StreamPaused

```solidity
event StreamPaused(uint256 streamId, address by)
```

### StreamResumed

```solidity
event StreamResumed(uint256 streamId, address by)
```

### StreamDisputed

```solidity
event StreamDisputed(uint256 streamId, address by)
```

### StreamResolved

```solidity
event StreamResolved(uint256 streamId, uint256 senderAmount, uint256 recipientAmount)
```

### FeeCollectorUpdated

```solidity
event FeeCollectorUpdated(address newCollector)
```

### StreamDoesNotExist

```solidity
error StreamDoesNotExist()
```

### Unauthorized

```solidity
error Unauthorized()
```

### StreamPausedOrDisputed

```solidity
error StreamPausedOrDisputed()
```

### InvalidDeposit

```solidity
error InvalidDeposit()
```

### InvalidTimeRange

```solidity
error InvalidTimeRange()
```

### InsufficientBalance

```solidity
error InsufficientBalance()
```

### constructor

```solidity
constructor(address _reputationContract, address admin, address _feeCollector) public
```

### setFeeCollector

```solidity
function setFeeCollector(address _feeCollector) external
```

Updates the address that receives platform fees.

### createStream

```solidity
function createStream(address recipient, uint256 deposit, address tokenAddress, uint256 startTime, uint256 stopTime) external returns (uint256)
```

Creates a new payment stream.

### balanceOf

```solidity
function balanceOf(uint256 streamId) public view returns (uint256 recipientBalance, uint256 senderBalance)
```

Calculates the amount currently available for withdrawal.

### withdrawFromStream

```solidity
function withdrawFromStream(uint256 streamId, uint256 amount) external
```

Withdraws available funds from the stream.

### pauseStream

```solidity
function pauseStream(uint256 streamId) external
```

Pauses the stream in case of a dispute.

### resumeStream

```solidity
function resumeStream(uint256 streamId) external
```

Resumes a paused stream (only if not disputed or by arbitrator).

### resolveDispute

```solidity
function resolveDispute(uint256 streamId, uint256 senderAmount, uint256 recipientAmount) external
```

Arbitrator resolves a dispute.

### _calculateTimeElapsed

```solidity
function _calculateTimeElapsed(struct StreamingEscrow.Stream stream) internal view returns (uint256)
```

### _calculateFee

```solidity
function _calculateFee(address freelancer, uint256 amount) internal view returns (uint256)
```

