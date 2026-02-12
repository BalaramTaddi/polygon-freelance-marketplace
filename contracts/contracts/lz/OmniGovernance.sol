// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OApp.sol";
import "./interfaces/ILayerZeroEndpointV2.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title OmniGovernance
 * @notice Cross-chain governance system using LayerZero V2
 * @dev Allows proposals and voting across all supported chains
 */
contract OmniGovernance is OApp, AccessControl, ReentrancyGuard, Pausable {
    
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    ILayerZeroEndpointV2 public immutable lzEndpointV2;

    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    enum VoteType {
        Against,
        For,
        Abstain
    }

    enum MessageType {
        CAST_VOTE,
        EXECUTE_PROPOSAL,
        CANCEL_PROPOSAL,
        SYNC_VOTES
    }

    struct Proposal {
        uint256 id;
        address proposer;
        uint32[] targetChains;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool canceled;
        mapping(address => Receipt) receipts;
    }

    struct Receipt {
        bool hasVoted;
        uint8 support;
        uint256 votes;
    }

    struct ProposalCore {
        uint256 id;
        address proposer;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool canceled;
    }

    // Proposal ID => Proposal
    mapping(uint256 => Proposal) public proposals;
    
    // Chain EID => Proposal ID => Vote counts
    mapping(uint32 => mapping(uint256 => VoteCounts)) public chainVotes;
    
    // Message ID => is processed
    mapping(bytes32 => bool) public processedMessages;

    struct VoteCounts {
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
    }

    uint256 public proposalCount;
    uint256 public votingDelay = 1; // 1 block
    uint256 public votingPeriod = 50400; // ~1 week
    uint256 public proposalThreshold = 100000e18; // 100k tokens
    uint256 public quorumVotes = 400000e18; // 400k tokens

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        uint32[] targetChains,
        address[] targets,
        uint256[] values,
        string description
    );

    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 votes,
        uint32 chainId
    );

    event VoteSynced(
        uint256 indexed proposalId,
        uint32 indexed srcChain,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    );

    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);

    error InvalidProposal();
    error ProposalNotActive();
    error AlreadyVoted();
    error InsufficientVotingPower();
    error ProposalNotSucceeded();
    error ProposalAlreadyExecuted();
    error MessageAlreadyProcessed(bytes32 guid);
    error InvalidChain();

    constructor(
        address _endpoint,
        address _admin
    ) OApp(_admin) {
        lzEndpointV2 = ILayerZeroEndpointV2(_endpoint);
        lzEndpoint = _endpoint;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PROPOSER_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    /**
     * @notice Create a new proposal
     * @param targetChains Chains where actions will be executed
     * @param targets Target contract addresses
     * @param values ETH values for each call
     * @param calldatas Function call data
     * @param description Proposal description
     */
    function propose(
        uint32[] memory targetChains,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external onlyRole(PROPOSER_ROLE) whenNotPaused returns (uint256) {
        require(
            targets.length == values.length && 
            targets.length == calldatas.length &&
            targets.length > 0,
            "Invalid proposal"
        );

        uint256 proposalId = ++proposalCount;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.targetChains = targetChains;
        proposal.targets = targets;
        proposal.values = values;
        proposal.calldatas = calldatas;
        proposal.description = description;
        proposal.startBlock = block.number + votingDelay;
        proposal.endBlock = block.number + votingDelay + votingPeriod;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            targetChains,
            targets,
            values,
            description
        );

        return proposalId;
    }

    /**
     * @notice Cast a vote on a proposal
     * @param proposalId The proposal ID
     * @param support Vote type (0=Against, 1=For, 2=Abstain)
     * @param votes Number of votes
     */
    function castVote(
        uint256 proposalId,
        uint8 support,
        uint256 votes
    ) external whenNotPaused {
        return _castVote(msg.sender, proposalId, support, votes);
    }

    /**
     * @notice Cast a vote and sync to other chains
     * @param proposalId The proposal ID
     * @param support Vote type
     * @param votes Number of votes
     * @param targetChains Chains to sync vote to
     * @param options LayerZero options for each chain
     */
    function castVoteAndSync(
        uint256 proposalId,
        uint8 support,
        uint256 votes,
        uint32[] calldata targetChains,
        bytes[] calldata options
    ) external payable whenNotPaused {
        require(targetChains.length == options.length, "Length mismatch");

        // Cast vote locally
        _castVote(msg.sender, proposalId, support, votes);

        // Sync to other chains
        for (uint256 i = 0; i < targetChains.length; i++) {
            _syncVoteToChain(
                proposalId,
                support,
                votes,
                targetChains[i],
                options[i],
                targetChains.length
            );
        }
    }

    function _castVote(
        address voter,
        uint256 proposalId,
        uint8 support,
        uint256 votes
    ) internal {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert InvalidProposal();
        if (block.number < proposal.startBlock || block.number > proposal.endBlock) {
            revert ProposalNotActive();
        }
        if (proposal.receipts[voter].hasVoted) revert AlreadyVoted();
        if (votes == 0) revert InsufficientVotingPower();

        Receipt storage receipt = proposal.receipts[voter];
        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = votes;

        if (support == uint8(VoteType.Against)) {
            proposal.againstVotes += votes;
        } else if (support == uint8(VoteType.For)) {
            proposal.forVotes += votes;
        } else if (support == uint8(VoteType.Abstain)) {
            proposal.abstainVotes += votes;
        }

        emit VoteCast(voter, proposalId, support, votes, uint32(block.chainid));
    }

    function _syncVoteToChain(
        uint256 proposalId,
        uint8 support,
        uint256 votes,
        uint32 dstEid,
        bytes calldata options,
        uint256 totalChains
    ) internal {
        bytes32 peer = peers[dstEid];
        if (peer == bytes32(0)) revert InvalidChain();

        bytes memory message = abi.encode(
            MessageType.CAST_VOTE,
            proposalId,
            msg.sender,
            support,
            votes,
            uint32(block.chainid)
        );

        ILayerZeroEndpointV2.MessagingParams memory params = ILayerZeroEndpointV2.MessagingParams({
            dstEid: dstEid,
            receiver: peer,
            message: message,
            options: options,
            payInLzToken: false
        });

        // Split fee evenly across target chains
        lzEndpointV2.send{value: msg.value / totalChains}(params, payable(msg.sender));
    }

    /**
     * @notice Execute a successful proposal
     * @param proposalId The proposal ID
     */
    function execute(
        uint256 proposalId
    ) external payable onlyRole(EXECUTOR_ROLE) nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert InvalidProposal();
        if (state(proposalId) != ProposalState.Succeeded) revert ProposalNotSucceeded();
        if (proposal.executed) revert ProposalAlreadyExecuted();

        proposal.executed = true;

        // Execute all calls
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(
                proposal.calldatas[i]
            );
            require(success, "Execution failed");
        }

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Cancel a proposal
     * @param proposalId The proposal ID
     */
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            msg.sender == proposal.proposer || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(!proposal.executed, "Already executed");

        proposal.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    /**
     * @notice Get proposal state
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) return ProposalState.Pending;
        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;
        if (block.number < proposal.startBlock) return ProposalState.Pending;
        if (block.number <= proposal.endBlock) return ProposalState.Active;
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        
        if (totalVotes < quorumVotes || proposal.forVotes <= proposal.againstVotes) {
            return ProposalState.Defeated;
        }
        
        return ProposalState.Succeeded;
    }

    /**
     * @notice Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (
        ProposalCore memory core,
        uint32[] memory targetChains,
        address[] memory targets,
        uint256[] memory values
    ) {
        Proposal storage proposal = proposals[proposalId];
        
        core = ProposalCore({
            id: proposal.id,
            proposer: proposal.proposer,
            description: proposal.description,
            startBlock: proposal.startBlock,
            endBlock: proposal.endBlock,
            forVotes: proposal.forVotes,
            againstVotes: proposal.againstVotes,
            abstainVotes: proposal.abstainVotes,
            executed: proposal.executed,
            canceled: proposal.canceled
        });

        return (core, proposal.targetChains, proposal.targets, proposal.values);
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
        if (processedMessages[_guid]) revert MessageAlreadyProcessed(_guid);
        processedMessages[_guid] = true;

        MessageType msgType = abi.decode(_message, (MessageType));

        if (msgType == MessageType.CAST_VOTE) {
            _handleVoteSync(_srcEid, _message);
        } else if (msgType == MessageType.SYNC_VOTES) {
            _handleVotesSync(_srcEid, _message);
        }
    }

    function _handleVoteSync(uint32 srcEid, bytes memory message) internal {
        (
            ,
            uint256 proposalId,
            address voter,
            uint8 support,
            uint256 votes,
            uint32 originChain
        ) = abi.decode(
            message,
            (MessageType, uint256, address, uint8, uint256, uint32)
        );

        // Update chain-specific vote counts
        VoteCounts storage counts = chainVotes[originChain][proposalId];
        
        if (support == uint8(VoteType.Against)) {
            counts.againstVotes += votes;
        } else if (support == uint8(VoteType.For)) {
            counts.forVotes += votes;
        } else if (support == uint8(VoteType.Abstain)) {
            counts.abstainVotes += votes;
        }

        // Update proposal totals
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id != 0) {
            if (support == uint8(VoteType.Against)) {
                proposal.againstVotes += votes;
            } else if (support == uint8(VoteType.For)) {
                proposal.forVotes += votes;
            } else if (support == uint8(VoteType.Abstain)) {
                proposal.abstainVotes += votes;
            }
        }

        emit VoteSynced(proposalId, originChain, counts.forVotes, counts.againstVotes, counts.abstainVotes);
    }

    function _handleVotesSync(uint32 srcEid, bytes memory message) internal {
        // Handle bulk vote synchronization
    }

    // ============ Admin Functions ============

    function setVotingDelay(uint256 _votingDelay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingDelay = _votingDelay;
    }

    function setVotingPeriod(uint256 _votingPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingPeriod = _votingPeriod;
    }

    function setProposalThreshold(uint256 _proposalThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        proposalThreshold = _proposalThreshold;
    }

    function setQuorumVotes(uint256 _quorumVotes) external onlyRole(DEFAULT_ADMIN_ROLE) {
        quorumVotes = _quorumVotes;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    receive() external payable {}
}
