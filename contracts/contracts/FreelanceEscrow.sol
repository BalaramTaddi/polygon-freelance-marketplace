// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./ccip/Client.sol";
import "./ccip/IAny2EVMMessageReceiver.sol";

interface IPolyToken is IERC20 {
    function mint(address to, uint256 amount) external;
}

contract FreelanceEscrow is 
    Initializable, 
    ERC721URIStorageUpgradeable, 
    ERC2981Upgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    UUPSUpgradeable,
    IAny2EVMMessageReceiver 
{
    uint256 private _nextTokenId;

    address public arbitrator;
    address private _trustedForwarder; 
    address public ccipRouter; // Chainlink CCIP Router
    uint256 public constant FREELANCER_STAKE_PERCENT = 10; 

    // CCIP Allow-lists
    mapping(uint64 => bool) public allowlistedSourceChains;
    mapping(address => bool) public allowlistedSenders;

    enum JobStatus { Created, Accepted, Ongoing, Disputed, Completed, Cancelled }

    struct Milestone {
        uint256 amount;
        string description;
        bool isReleased;
    }

    struct Review {
        uint8 rating; 
        string comment;
        address reviewer;
    }

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        address token; 
        uint256 amount;
        uint256 freelancerStake;
        uint256 totalPaidOut;
        JobStatus status;
        string resultUri;
        bool paid;
        uint256 milestoneCount;
    }

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => mapping(uint256 => Milestone)) public jobMilestones;
    mapping(uint256 => Review) public reviews;
    uint256 public jobCount;

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount);
    event JobAccepted(uint256 indexed jobId, address indexed freelancer, uint256 stake);
    event WorkSubmitted(uint256 indexed jobId, string resultUri);
    event FundsReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount, uint256 nftId);
    event MilestoneCreated(uint256 indexed jobId, uint256 milestoneId, uint256 amount, string description);
    event MilestoneReleased(uint256 indexed jobId, uint256 milestoneId, uint256 amount);
    event ReviewSubmitted(uint256 indexed jobId, address indexed reviewer, uint8 rating, string comment);
    event JobCancelled(uint256 indexed jobId);
    event JobDisputed(uint256 indexed jobId);
    event CCIPMessageReceived(bytes32 indexed messageId, uint64 indexed sourceChainSelector, address sender);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, address trustedForwarder, address _ccipRouter) public initializer {
        __ERC721_init("FreelanceWork", "FWORK");
        __ERC721URIStorage_init();
        __ERC2981_init();
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        arbitrator = initialOwner;
        _trustedForwarder = trustedForwarder;
        ccipRouter = _ccipRouter;
    }

    // --- MetaTx & UUPS Overrides ---
    function _contextSuffixLength() internal view virtual override(ContextUpgradeable) returns (uint256) {
        return 0;
    }

    function _msgSender() internal view virtual override(ContextUpgradeable) returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            assembly { sender := shr(96, calldataload(sub(calldatasize(), 20))) }
        } else {
            return super._msgSender();
        }
    }

    function _msgData() internal view virtual override(ContextUpgradeable) returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }

    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == _trustedForwarder;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorageUpgradeable, ERC2981Upgradeable) returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || super.supportsInterface(interfaceId);
    }

    // --- Admin ---
    function setArbitrator(address _arbitrator) external onlyOwner {
        require(_arbitrator != address(0), "Invalid address");
        arbitrator = _arbitrator;
    }

    function allowlistSourceChain(uint64 _sourceChainSelector, bool allowed) external onlyOwner {
        allowlistedSourceChains[_sourceChainSelector] = allowed;
    }

    function allowlistSender(address _sender, bool allowed) external onlyOwner {
        allowlistedSenders[_sender] = allowed;
    }

    function setCCIPRouter(address _router) external onlyOwner {
        ccipRouter = _router;
    }

    // --- CCIP Implementation ---
    modifier onlyRouter() {
        require(msg.sender == ccipRouter, "Caller not CCIP Router");
        _;
    }

    function ccipReceive(Client.Any2EVMMessage calldata message) external override onlyRouter {
        // Validate Source Chain
        require(allowlistedSourceChains[message.sourceChainSelector], "Source chain not allowlisted");
        
        // Validate Sender
        address sender = abi.decode(message.sender, (address));
        require(allowlistedSenders[sender], "Sender not allowlisted");

        // Decode Payload: (freelancer, metadataUri)
        (address freelancer, string memory metadataUri) = abi.decode(message.data, (address, string));

        // Expect exactly 1 token (USDC)
        require(message.destTokenAmounts.length == 1, "Expect 1 token");
        address token = message.destTokenAmounts[0].token;
        uint256 amount = message.destTokenAmounts[0].amount;

        emit CCIPMessageReceived(message.messageId, message.sourceChainSelector, sender);

        // Internal Job Creation (Assuming contract now holds the tokens)
        _createJobInternal(sender, freelancer, token, amount, metadataUri);
    }

    // --- Job Logic ---

    function _createJobInternal(
        address client,
        address freelancer,
        address token,
        uint256 amount,
        string memory _initialMetadataUri
    ) internal {
        require(freelancer != address(0), "Invalid freelancer");
        require(freelancer != client, "No self-hiring");

        jobCount++;
        jobs[jobCount] = Job({
            id: jobCount,
            client: client,
            freelancer: freelancer,
            token: token,
            amount: amount,
            freelancerStake: 0,
            totalPaidOut: 0,
            status: JobStatus.Created,
            resultUri: _initialMetadataUri,
            paid: false,
            milestoneCount: 0
        });

        emit JobCreated(jobCount, client, freelancer, amount);
    }

    function createJob(address freelancer, address token, uint256 amount, string memory _initialMetadataUri) external payable nonReentrant {
        address sender = _msgSender();

        if (token == address(0)) {
            require(msg.value == amount && amount > 0, "Invalid native amount");
        } else {
            require(msg.value == 0, "Do not send native with token job");
            // Transfer tokens from user to contract
            IERC20(token).transferFrom(sender, address(this), amount);
        }

        _createJobInternal(sender, freelancer, token, amount, _initialMetadataUri);
    }

    function createJobWithMilestones(
        address freelancer,
        address token,
        uint256 totalAmount,
        string memory _initialMetadataUri,
        uint256[] memory milestoneAmounts,
        string[] memory milestoneDescriptions
    ) external payable nonReentrant {
        address sender = _msgSender();
        require(milestoneAmounts.length == milestoneDescriptions.length, "Mismatched milestones");
        
        uint256 calcTotal = 0;
        for(uint256 i = 0; i < milestoneAmounts.length; i++) {
            calcTotal += milestoneAmounts[i];
        }
        require(calcTotal == totalAmount && totalAmount > 0, "Invalid total amount");

        if (token == address(0)) {
            require(msg.value == totalAmount, "Invalid native amount");
        } else {
            require(msg.value == 0, "No native with token");
            IERC20(token).transferFrom(sender, address(this), totalAmount);
        }

        jobCount++;
        jobs[jobCount] = Job({
            id: jobCount,
            client: sender,
            freelancer: freelancer,
            token: token,
            amount: totalAmount,
            freelancerStake: 0,
            totalPaidOut: 0,
            status: JobStatus.Created,
            resultUri: _initialMetadataUri,
            paid: false,
            milestoneCount: milestoneAmounts.length
        });

        for(uint256 i = 0; i < milestoneAmounts.length; i++) {
            jobMilestones[jobCount][i] = Milestone({
                amount: milestoneAmounts[i],
                description: milestoneDescriptions[i],
                isReleased: false
            });
            emit MilestoneCreated(jobCount, i, milestoneAmounts[i], milestoneDescriptions[i]);
        }

        emit JobCreated(jobCount, sender, freelancer, totalAmount);
    }

    function releaseMilestone(uint256 jobId, uint256 milestoneId) external nonReentrant {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        require(sender == job.client, "Only client can release milestones");
        require(milestoneId < job.milestoneCount, "Invalid milestone ID");
        
        Milestone storage milestone = jobMilestones[jobId][milestoneId];
        require(!milestone.isReleased, "Already released");
        require(!job.paid, "Job already finalized");

        milestone.isReleased = true;
        job.totalPaidOut += milestone.amount;

        if (job.token == address(0)) {
            (bool success, ) = payable(job.freelancer).call{value: milestone.amount}("");
            require(success, "Native transfer failed");
        } else {
            IERC20(job.token).transfer(job.freelancer, milestone.amount);
        }

        emit MilestoneReleased(jobId, milestoneId, milestone.amount);
    }

    function acceptJob(uint256 jobId) external payable nonReentrant {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        require(sender == job.freelancer, "Only freelancer can accept");
        require(job.status == JobStatus.Created, "Invalid status");
        
        uint256 requiredStake = (job.amount * FREELANCER_STAKE_PERCENT) / 100;
        
        if (job.token == address(0)) {
            require(msg.value >= requiredStake, "Insufficient stake");
            job.freelancerStake = msg.value;
        } else {
            require(msg.value == 0, "No native stake for token job");
            IERC20(job.token).transferFrom(sender, address(this), requiredStake);
            job.freelancerStake = requiredStake;
        }

        job.status = JobStatus.Accepted;
        emit JobAccepted(jobId, sender, job.freelancerStake);
    }

    function submitWork(uint256 jobId, string memory resultUri) external {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        require(sender == job.freelancer, "Only freelancer can submit work");
        require(job.status == JobStatus.Accepted || job.status == JobStatus.Ongoing, "Invalid job status");

        job.status = JobStatus.Ongoing;
        job.resultUri = resultUri;

        emit WorkSubmitted(jobId, resultUri);
    }

    function releaseFunds(uint256 jobId) external nonReentrant {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        require(sender == job.client, "Only client can release funds");
        require(job.status == JobStatus.Ongoing, "Work must be submitted first");
        require(!job.paid, "Funds already released");

        job.paid = true;
        job.status = JobStatus.Completed;

        uint256 remainingAmount = job.amount - job.totalPaidOut;
        uint256 totalPayout = remainingAmount + job.freelancerStake;
        
        if (totalPayout > 0) {
            if (job.token == address(0)) {
                (bool success, ) = payable(job.freelancer).call{value: totalPayout}("");
                require(success, "Native transfer failed");
            } else {
                IERC20(job.token).transfer(job.freelancer, totalPayout);
            }
        }

        // Mint NFT for freelancer
        uint256 tokenId = _nextTokenId++;
        _safeMint(job.freelancer, tokenId);
        _setTokenURI(tokenId, job.resultUri);
        
        // Set 5% Royalty (500 basis points) for the freelancer
        _setTokenRoyalty(tokenId, job.freelancer, 500);

        emit FundsReleased(jobId, job.freelancer, totalPayout, tokenId);
    }

    function submitReview(uint256 jobId, uint8 rating, string memory comment) external {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        require(sender == job.client, "Only client can review");
        require(job.status == JobStatus.Completed, "Job not completed");
        require(rating >= 1 && rating <= 5, "Rating 1-5");
        require(reviews[jobId].reviewer == address(0), "Review already submitted");

        reviews[jobId] = Review({
            rating: rating,
            comment: comment,
            reviewer: sender
        });

        emit ReviewSubmitted(jobId, sender, rating, comment);
    }

    function dispute(uint256 jobId) external {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        require(sender == job.client || sender == job.freelancer, "Not involved in job");
        require(job.status == JobStatus.Ongoing || job.status == JobStatus.Created, "Cannot dispute now");

        job.status = JobStatus.Disputed;
        emit JobDisputed(jobId);
    }

    function resolveDispute(uint256 jobId, address winner, uint256 freelancerAmount) external nonReentrant {
        address sender = _msgSender();
        require(sender == arbitrator, "Only arbitrator can resolve");
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Disputed, "Job not in dispute");
        require(winner == job.client || winner == job.freelancer, "Invalid winner");
        
        uint256 totalPool = job.amount + job.freelancerStake - job.totalPaidOut;
        require(freelancerAmount <= totalPool, "Amount exceeds pool");

        job.paid = true;
        job.status = JobStatus.Completed;

        uint256 clientRefund = totalPool - freelancerAmount;

        if (job.token == address(0)) {
            if (freelancerAmount > 0) {
                (bool success, ) = payable(job.freelancer).call{value: freelancerAmount}("");
                require(success, "Freelancer payout failed");
            }
            if (clientRefund > 0) {
                (bool refundSuccess, ) = payable(job.client).call{value: clientRefund}("");
                require(refundSuccess, "Client refund failed");
            }
        } else {
            if (freelancerAmount > 0) {
                IERC20(job.token).transfer(job.freelancer, freelancerAmount);
            }
            if (clientRefund > 0) {
                IERC20(job.token).transfer(job.client, clientRefund);
            }
        }
    }
}
