# Solidity API

## OApp

### lzEndpoint

```solidity
address lzEndpoint
```

### peers

```solidity
mapping(uint32 => bytes32) peers
```

### constructor

```solidity
constructor(address _owner) internal
```

_Constructor for OApp, initializing it with an owner._

### __OApp_init

```solidity
function __OApp_init(address _endpoint) internal
```

### setPeer

```solidity
function setPeer(uint32 _eid, bytes32 _peer) external virtual
```

