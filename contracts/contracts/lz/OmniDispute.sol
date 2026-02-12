// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OApp.sol";
import "./interfaces/ILayerZeroEndpointV2.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title OmniDispute
 * @notice Cross-chain dispute resolution system using LayerZero V2
 * @dev Allows initiating disputes and submitting evidence across chains
 */
contract OmniDispute is OApp, AccessControl, ReentrancyGuard, Pausable {
    
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    ILayerZeroEndpointV2 public immutable lzEndpointV2;

    enum DisputeStatus {
        None,
        Active,
        EvidenceSubmitted,
        Resolved,
        Appealed
    }

    enum MessageType {
        INITIATE_DISPUTE,
        SUBMIT_EVIDENCE,
        RESOLVE_DISPUTE,
        SYNC_VERDICT
    }

    struct Dispute {
        uint256 id;
        uint256 jobId;
        uint32 sourceChain;
        address client;
        address freelancer;
        address arbitrator;
        string evidenceIpfs;
        DisputeStatus status;
        uint256 createdAt;
        uint8 verdict; // 0: Refund Client, 1: Pay Freelancer, 2: Split
    }

    // Dispute ID => Dispute
    mapping(uint256 => Dispute) public disputes;
    
    // Remote Job ID => Dispute ID
    mapping(uint64 => mapping(uint256 => uint256)) public remoteJobToDispute;

    uint256 public disputeCount;
    mapping(bytes32 => bool) public processedMessages;

    event DisputeInitiated(
        uint256 indexed disputeId,
        uint256 indexed jobId,
        uint32 sourceChain,
        address client,
        address freelancer
    );

    event EvidenceSubmitted(uint256 indexed disputeId, address indexed submitter, string evidenceIpfs);
    event DisputeResolved(uint256 indexed disputeId, uint8 verdict);
    event VerdictSynced(uint256 indexed jobId, uint32 indexed dstChain, uint8 verdict);

    error DisputeNotFound();
    error Unauthorized();
    error InvalidStatus();
    error MessageAlreadyProcessed();

    constructor(
        address _endpoint,
        address _admin
    ) OApp(_admin) {
        lzEndpointV2 = ILayerZeroEndpointV2(_endpoint);
        lzEndpoint = _endpoint;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ARBITRATOR_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    /**
     * @notice Initiate a dispute for a cross-chain job
     * @param jobId The remote job ID
     * @param sourceChain The source chain EID
     * @param client Client address
     * @param freelancer Freelancer address
     * @param evidenceIpfs Initial evidence
     */
    function initiateDispute(
        uint256 jobId,
        uint32 sourceChain,
        address client,
        address freelancer,
        string calldata evidenceIpfs
    ) external returns (uint256) {
        disputeCount++;
        uint256 disputeId = disputeCount;

        Dispute storage d = disputes[disputeId];
        d.id = disputeId;
        d.jobId = jobId;
        d.sourceChain = sourceChain;
        d.client = client;
        d.freelancer = freelancer;
        d.evidenceIpfs = evidenceIpfs;
        d.status = DisputeStatus.Active;
        d.createdAt = block.timestamp;

        remoteJobToDispute[sourceChain][jobId] = disputeId;

        emit DisputeInitiated(disputeId, jobId, sourceChain, client, freelancer);
        return disputeId;
    }

    /**
     * @notice Resolve a dispute and sync verdict to the source chain
     * @param disputeId The dispute ID
     * @param verdict 0: Refund, 1: Pay, 2: Split
     * @param dstEid Destination chain EID
     * @param options LayerZero options
     */
    function resolveAndSync(
        uint256 disputeId,
        uint8 verdict,
        uint32 dstEid,
        bytes calldata options
    ) external payable onlyRole(ARBITRATOR_ROLE) {
        Dispute storage d = disputes[disputeId];
        if (d.status != DisputeStatus.Active && d.status != DisputeStatus.EvidenceSubmitted) revert InvalidStatus();

        d.verdict = verdict;
        d.status = DisputeStatus.Resolved;

        bytes memory message = abi.encode(
            MessageType.SYNC_VERDICT,
            d.jobId,
            verdict
        );

        bytes32 peer = peers[dstEid];
        
        ILayerZeroEndpointV2.MessagingParams memory params = ILayerZeroEndpointV2.MessagingParams({
            dstEid: dstEid,
            receiver: peer,
            message: message,
            options: options,
            payInLzToken: false
        });

        lzEndpointV2.send{value: msg.value}(params, payable(msg.sender));

        emit DisputeResolved(disputeId, verdict);
        emit VerdictSynced(d.jobId, dstEid, verdict);
    }

    /**
     * @notice Handle incoming LayerZero messages
     */
    function _lzReceive(
        uint32 _srcEid,
        bytes32 _guid,
        bytes memory _message,
        address _executor,
        bytes memory _extraData
    ) internal virtual override {
        if (processedMessages[_guid]) revert MessageAlreadyProcessed();
        processedMessages[_guid] = true;

        MessageType msgType = abi.decode(_message, (MessageType));

        if (msgType == MessageType.INITIATE_DISPUTE) {
            (,, uint256 jobId, address client, address freelancer, string memory evidence) = abi.decode(_message, (MessageType, uint256, address, address, string));
            this.initiateDispute(jobId, _srcEid, client, freelancer, evidence);
        }
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }
}
