// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FreelanceEscrow is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    address public arbitrator;
    uint256 public constant FREELANCER_STAKE_PERCENT = 10; // 10% stake required

    enum JobStatus { Created, Accepted, Ongoing, Disputed, Completed, Cancelled }

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        uint256 amount;
        uint256 freelancerStake;
        JobStatus status;
        string resultUri;
        bool paid;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public jobCount;

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount);
    event JobAccepted(uint256 indexed jobId, address indexed freelancer, uint256 stake);
    event WorkSubmitted(uint256 indexed jobId, string resultUri);
    event FundsReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount, uint256 nftId);
    event JobCancelled(uint256 indexed jobId);
    event JobDisputed(uint256 indexed jobId);

    constructor() ERC721("FreelanceWork", "FWORK") Ownable(msg.sender) {
        arbitrator = msg.sender; // Default to owner
    }

    function setArbitrator(address _arbitrator) external onlyOwner {
        require(_arbitrator != address(0), "Invalid address");
        arbitrator = _arbitrator;
    }

    function createJob(address freelancer, string memory _initialMetadataUri) external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        require(freelancer != address(0), "Invalid freelancer address");
        require(freelancer != msg.sender, "Client cannot be freelancer");

        jobCount++;
        jobs[jobCount] = Job({
            id: jobCount,
            client: msg.sender,
            freelancer: freelancer,
            amount: msg.value,
            freelancerStake: 0,
            status: JobStatus.Created,
            resultUri: _initialMetadataUri,
            paid: false
        });

        emit JobCreated(jobCount, msg.sender, freelancer, msg.value);
    }

    function acceptJob(uint256 jobId) external payable {
        Job storage job = jobs[jobId];
        require(msg.sender == job.freelancer, "Only freelancer can accept");
        require(job.status == JobStatus.Created, "Invalid status");
        
        uint256 requiredStake = (job.amount * FREELANCER_STAKE_PERCENT) / 100;
        require(msg.value >= requiredStake, "Insufficient stake");

        job.freelancerStake = msg.value;
        job.status = JobStatus.Accepted;

        emit JobAccepted(jobId, msg.sender, msg.value);
    }

    function submitWork(uint256 jobId, string memory resultUri) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.freelancer, "Only freelancer can submit work");
        require(job.status == JobStatus.Accepted || job.status == JobStatus.Ongoing, "Invalid job status");

        job.status = JobStatus.Ongoing;
        job.resultUri = resultUri;

        emit WorkSubmitted(jobId, resultUri);
    }

    function releaseFunds(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "Only client can release funds");
        require(job.status == JobStatus.Ongoing, "Work must be submitted first");
        require(!job.paid, "Funds already released");

        job.paid = true;
        job.status = JobStatus.Completed;

        // Transfer funds + stake back to freelancer
        uint256 totalPayout = job.amount + job.freelancerStake;
        (bool success, ) = payable(job.freelancer).call{value: totalPayout}("");
        require(success, "Transfer failed");

        // Mint NFT for freelancer
        uint256 tokenId = _nextTokenId++;
        _safeMint(job.freelancer, tokenId);
        _setTokenURI(tokenId, job.resultUri);

        emit FundsReleased(jobId, job.freelancer, totalPayout, tokenId);
    }

    function dispute(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client || msg.sender == job.freelancer, "Not involved in job");
        require(job.status == JobStatus.Ongoing || job.status == JobStatus.Created, "Cannot dispute now");

        job.status = JobStatus.Disputed;
        emit JobDisputed(jobId);
    }

    function resolveDispute(uint256 jobId, address winner, uint256 freelancerAmount) external {
        require(msg.sender == arbitrator, "Only arbitrator can resolve");
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Disputed, "Job not in dispute");
        require(winner == job.client || winner == job.freelancer, "Invalid winner");
        
        uint256 totalPool = job.amount + job.freelancerStake;
        require(freelancerAmount <= totalPool, "Amount exceeds pool");

        job.paid = true;
        job.status = JobStatus.Completed;

        if (freelancerAmount > 0) {
            (bool success, ) = payable(job.freelancer).call{value: freelancerAmount}("");
            require(success, "Freelancer payout failed");
        }

        uint256 clientRefund = totalPool - freelancerAmount;
        if (clientRefund > 0) {
            (bool refundSuccess, ) = payable(job.client).call{value: clientRefund}("");
            require(refundSuccess, "Client refund failed");
        }
    }
}
