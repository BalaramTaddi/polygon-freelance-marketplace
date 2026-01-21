// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/**
 * @title IFreelanceSBT
 * @notice Minimal interface for the Soulbound Token used for reputation-based voting.
 */
interface IFreelanceSBT {
    /**
     * @notice Returns the number of reputation tokens held by an owner
     * @param owner Address of the token holder
     * @return uint256 Balance of SBTs
     */
    function balanceOf(address owner) external view returns (uint256);
}

/**
 * @title FreelanceGovernance
 * @author Akhil Muvva
 * @notice Reputation-based governance system for the PolyLance ecosystem.
 * @dev Users with a minimum number of Soulbound Tokens (SBTs) can create proposals.
 * Voting weight is proportional to the number of SBTs (reputation) held.
 */
contract FreelanceGovernance is Ownable {
    /// @notice The contract address of the reputation SBT
    IFreelanceSBT public sbtContract;
    
    /**
     * @notice Data structure representing a governance proposal
     * @param id Unique identifier for the proposal
     * @param proposer Address of the user who created the proposal
     * @param description Brief description of the proposed change
     * @param forVotes Total weight of votes in favor
     * @param againstVotes Total weight of votes against
     * @param startTime Timestamp when voting begins
     * @param endTime Timestamp when voting ends
     * @param executed Boolean indicating if the proposal has been finalized
     * @param hasVoted Internal mapping to track voters
     */
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

    /// @notice Total number of proposals ever created
    uint256 public proposalCount;
    /// @notice Mapping from proposal ID to proposal details
    mapping(uint256 => Proposal) public proposals;
    /// @notice Duration for which voting is open (3 days)
    uint256 public constant VOTING_PERIOD = 3 days;
    /// @notice Minimum SBT balance required to create a new proposal
    uint256 public constant MIN_REPUTATION_FOR_PROPOSAL = 5; 

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    /**
     * @notice Deploys the governance contract
     * @param _sbtContract Address of the reputation SBT contract
     */
    constructor(address _sbtContract) Ownable(msg.sender) {
        sbtContract = IFreelanceSBT(_sbtContract);
    }

    /**
     * @notice Creates a new governance proposal
     * @dev User must have at least MIN_REPUTATION_FOR_PROPOSAL SBTs
     * @param description Textual description of the proposal
     */
    function createProposal(string calldata description) external {
        uint256 rep = sbtContract.balanceOf(msg.sender);
        require(rep >= MIN_REPUTATION_FOR_PROPOSAL, "Insufficient reputation to propose");

        proposalCount++;
        Proposal storage p = proposals[proposalCount];
        p.id = proposalCount;
        p.proposer = msg.sender;
        p.description = description;
        p.startTime = block.timestamp;
        p.endTime = block.timestamp + VOTING_PERIOD;

        emit ProposalCreated(proposalCount, msg.sender, description);
    }

    /**
     * @notice Casts a vote on a proposal
     * @dev Voting power is equal to the sender's SBT balance
     * @param proposalId ID of the proposal to vote on
     * @param support True to vote for, False to vote against
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.startTime && block.timestamp <= p.endTime, "Voting not active");
        require(!p.hasVoted[msg.sender], "Already voted");

        uint256 weight = sbtContract.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        if (support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }
        p.hasVoted[msg.sender] = true;

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Finalizes a proposal after the voting period has ended
     * @dev Proposal must have more 'for' votes than 'against' votes
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp > p.endTime, "Voting still active");
        require(!p.executed, "Already executed");
        require(p.forVotes > p.againstVotes, "Proposal didn't pass");

        p.executed = true;
        emit ProposalExecuted(proposalId);
        
        // In a real DAO, this would trigger on-chain actions via a Timelock or similar.
    }
}
