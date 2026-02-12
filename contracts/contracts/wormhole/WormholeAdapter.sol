// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IWormhole {
    function publishMessage(
        uint32 nonce,
        bytes memory payload,
        uint8 consistencyLevel
    ) external payable returns (uint64 sequence);

    function parseAndVerifyVM(bytes calldata encodedVM) external view returns (VM memory vm, bool valid, string memory reason);
    
    struct VM {
        uint8 version;
        uint32 timestamp;
        uint32 nonce;
        uint16 emitterChainId;
        bytes32 emitterAddress;
        uint64 sequence;
        uint8 consistencyLevel;
        bytes payload;
        uint32 guardianSetIndex;
        Signature[] signatures;
        bytes32 hash;
    }

    struct Signature {
        bytes32 r;
        bytes32 s;
        uint8 v;
        uint8 guardianIndex;
    }
}

interface ICrossChainEscrowManager {
    enum JobStatus {
        None,
        Created,
        Accepted,
        Ongoing,
        Submitted,
        Completed,
        Disputed,
        Cancelled
    }
    function updateJobStatus(uint256 localJobId, JobStatus newStatus) external;
}

/**
 * @title WormholeAdapter
 * @notice Bridges the PolyLance marketplace to Solana via Wormhole
 */
contract WormholeAdapter is Ownable {
    IWormhole public immutable wormhole;
    ICrossChainEscrowManager public escrowManager;
    
    // Solana Chain ID in Wormhole is 1
    uint16 public constant SOLANA_CHAIN_ID = 1;
    bytes32 public solanaProgramAddress;

    mapping(bytes32 => bool) public processedMessages;

    event MessageSent(uint64 sequence, bytes payload);
    event MessageReceived(bytes32 emitterAddress, bytes payload);

    constructor(
        address _wormhole, 
        bytes32 _solanaProgram, 
        address _escrowManager,
        address _owner
    ) Ownable(_owner) {
        wormhole = IWormhole(_wormhole);
        solanaProgramAddress = _solanaProgram;
        escrowManager = ICrossChainEscrowManager(_escrowManager);
    }

    /**
     * @notice Send a message to Solana
     * @param payload The message content
     */
    function sendToSolana(bytes calldata payload) external payable returns (uint64 sequence) {
        sequence = wormhole.publishMessage{value: msg.value}(
            0, // nonce
            payload,
            1 // consistency level
        );
        emit MessageSent(sequence, payload);
    }

    /**
     * @notice Receive and verify a message from Solana
     * @param encodedVM The verified message from Wormhole guardians
     */
    function receiveFromSolana(bytes calldata encodedVM) external {
        (IWormhole.VM memory vm, bool valid, string memory reason) = wormhole.parseAndVerifyVM(encodedVM);
        require(valid, reason);
        require(vm.emitterChainId == SOLANA_CHAIN_ID, "Invalid source chain");
        require(vm.emitterAddress == solanaProgramAddress, "Invalid emitter");
        require(!processedMessages[vm.hash], "Already processed");

        processedMessages[vm.hash] = true;
        
        // Handle logic based on payload
        // Payload format: [msgType: 1 byte][jobId: 32 bytes][status: 1 byte]
        require(vm.payload.length >= 34, "Invalid payload length");
        
        uint8 msgType = uint8(vm.payload[0]);
        uint256 jobId;
        bytes memory payload = vm.payload;
        assembly {
            jobId := mload(add(payload, 33))
        }
        uint8 status = uint8(vm.payload[33]);

        if (msgType == 1) { // UPDATE_STATUS
             escrowManager.updateJobStatus(jobId, ICrossChainEscrowManager.JobStatus(status));
        }
        
        emit MessageReceived(vm.emitterAddress, vm.payload);
    }

    function setSolanaProgram(bytes32 _program) external onlyOwner {
        solanaProgramAddress = _program;
    }

    function setEscrowManager(address _escrowManager) external onlyOwner {
        escrowManager = ICrossChainEscrowManager(_escrowManager);
    }
}
