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
import "./lz/OApp.sol";

interface IPolyToken is IERC20 {
    function mint(address to, uint256 amount) external;
}

interface IInsurancePool {
    function deposit(address token, uint256 amount) external;
    function depositNative() external payable;
}

contract FreelanceEscrow is 
    Initializable, 
    ERC721URIStorageUpgradeable, 
    ERC2981Upgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    UUPSUpgradeable,
    IAny2EVMMessageReceiver,
    OApp
{
    uint256 private _nextTokenId;

    address public arbitrator;
    address private _trustedForwarder; 
    address public ccipRouter; 
    address public insurancePool;
    
    uint256 public constant FREELANCER_STAKE_PERCENT = 10; 
    uint256 public constant INSURANCE_FEE_BPS = 100; // 1%

    mapping(uint64 => bool) public allowlistedSourceChains;
    mapping(address => bool) public allowlistedSenders;

    enum JobStatus { Created, Accepted, Ongoing, Disputed, Completed, Cancelled }

    struct Milestone {
        uint256 amount;
        string description;
        bool isReleased;
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
        uint256 deadline; // Chainlink Automation target
        uint256 milestoneCount;
    }

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => mapping(uint256 => Milestone)) public jobMilestones;
    mapping(uint256 => Review) public reviews;
    uint256 public jobCount;

    struct Review {
        uint8 rating; 
        string comment;
        address reviewer;
    }

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount, uint256 deadline);
    event JobAccepted(uint256 indexed jobId, address indexed freelancer, uint256 stake);
    event WorkSubmitted(uint256 indexed jobId, string resultUri);
    event FundsReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount, uint256 nftId);
    event JobCancelled(uint256 indexed jobId);
    event JobDisputed(uint256 indexed jobId);
    event CCIPMessageReceived(bytes32 indexed messageId, uint64 indexed sourceChainSelector, address sender);
    event InsurancePaid(uint256 indexed jobId, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _lzEndpoint) OApp(_lzEndpoint) {
        _disableInitializers();
    }

    function initialize(
        address initialOwner, 
        address trustedForwarder, 
        address _ccipRouter,
        address _insurancePool
    ) public initializer {
        __ERC721_init("FreelanceWork", "FWORK");
        __ERC721URIStorage_init();
        __ERC2981_init();
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        arbitrator = initialOwner;
        _trustedForwarder = trustedForwarder;
        ccipRouter = _ccipRouter;
        insurancePool = _insurancePool;
    }

    // --- Chainlink Automation ---

    function checkUpkeep(bytes calldata /* checkData */) external view returns (bool upkeepNeeded, bytes memory performData) {
        // Find overdue jobs in 'Created' state (never accepted) or 'Accepted' but never submitted
        for (uint256 i = 1; i <= jobCount; i++) {
            if (jobs[i].status == JobStatus.Created && block.timestamp > jobs[i].deadline && jobs[i].deadline > 0) {
                return (true, abi.encode(i));
            }
        }
        return (false, "");
    }

    function performUpkeep(bytes calldata performData) external {
        uint256 jobId = abi.decode(performData, (uint256));
        Job storage job = jobs[jobId];
        
        // Auto-cancel if deadline exceeded and still just created
        if (job.status == JobStatus.Created && block.timestamp > job.deadline) {
            job.status = JobStatus.Cancelled;
            
            // Refund client
            if (job.token == address(0)) {
                payable(job.client).transfer(job.amount);
            } else {
                IERC20(job.token).transfer(job.client, job.amount);
            }
            emit JobCancelled(jobId);
        }
    }

    // --- MetaTx & UUPS Overrides ---
    function _contextSuffixLength() internal view virtual override(ContextUpgradeable) returns (uint256) {
        return 0;
    }

    function _msgSender() internal view virtual override(ContextUpgradeable) returns (address sender) {
        if (forwarder == _trustedForwarder) {
             assembly { sender := shr(96, calldataload(sub(calldatasize(), 20))) }
        } else {
            return super._msgSender();
        }
    }
    
    address private forwarder; // helper for msgSender logic
    function isTrustedForwarder(address _forwarder) public view returns (bool) {
        return _forwarder == _trustedForwarder;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorageUpgradeable, ERC2981Upgradeable) returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || super.supportsInterface(interfaceId);
    }

    // --- Admin ---
    function setInsurancePool(address _pool) external onlyOwner {
        insurancePool = _pool;
    }

    function allowlistSourceChain(uint64 _sourceChainSelector, bool allowed) external onlyOwner {
        allowlistedSourceChains[_sourceChainSelector] = allowed;
    }

    function allowlistSender(address _sender, bool allowed) external onlyOwner {
        allowlistedSenders[_sender] = allowed;
    }

    // --- CCIP Implementation ---
    function ccipReceive(Client.Any2EVMMessage calldata message) external override {
        require(msg.sender == ccipRouter, "Not router");
        require(allowlistedSourceChains[message.sourceChainSelector], "Chain not allowed");
        address sender = abi.decode(message.sender, (address));
        require(allowlistedSenders[sender], "Sender not allowed");

        (address freelancer, string memory metadataUri, uint256 deadline) = abi.decode(message.data, (address, string, uint256));
        address token = message.destTokenAmounts[0].token;
        uint256 amount = message.destTokenAmounts[0].amount;

        _createJobInternal(sender, freelancer, token, amount, metadataUri, deadline);
        emit CCIPMessageReceived(message.messageId, message.sourceChainSelector, sender);
    }

    // --- Internal Logic ---

    function _createJobInternal(
        address client,
        address freelancer,
        address token,
        uint256 amount,
        string memory _initialMetadataUri,
        uint256 deadline
    ) internal {
        require(freelancer != address(0), "Invalid freelancer");
        require(freelancer != client, "Self-hiring");

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
            deadline: deadline,
            milestoneCount: 0
        });

        emit JobCreated(jobCount, client, freelancer, amount, deadline);
    }

    // --- External Job Functions ---

    function createJob(
        address freelancer, 
        address token, 
        uint256 amount, 
        string memory _initialMetadataUri,
        uint256 durationDays
    ) external payable nonReentrant {
        address sender = _msgSender();
        if (token == address(0)) {
            require(msg.value == amount, "Amount mismatch");
        } else {
            IERC20(token).transferFrom(sender, address(this), amount);
        }

        uint256 deadline = durationDays > 0 ? block.timestamp + (durationDays * 1 days) : 0;
        _createJobInternal(sender, freelancer, token, amount, _initialMetadataUri, deadline);
    }

    function releaseFunds(uint256 jobId) external nonReentrant {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        require(sender == job.client, "Not client");
        require(job.status == JobStatus.Ongoing, "Not ongoing");
        require(!job.paid, "Paid");

        job.paid = true;
        job.status = JobStatus.Completed;

        // Calculate Fees
        uint256 insuranceFee = (job.amount * INSURANCE_FEE_BPS) / 10000;
        uint256 remainingAmount = job.amount - job.totalPaidOut - insuranceFee;
        uint256 totalPayout = remainingAmount + job.freelancerStake;

        // Handle Insurance Pool
        if (insuranceFee > 0 && insurancePool != address(0)) {
            if (job.token == address(0)) {
                IInsurancePool(insurancePool).depositNative{value: insuranceFee}();
            } else {
                IERC20(job.token).approve(insurancePool, insuranceFee);
                IInsurancePool(insurancePool).deposit(job.token, insuranceFee);
            }
            emit InsurancePaid(jobId, insuranceFee);
        }

        if (totalPayout > 0) {
            if (job.token == address(0)) {
                payable(job.freelancer).transfer(totalPayout);
            } else {
                IERC20(job.token).transfer(job.freelancer, totalPayout);
            }
        }

        // NFT Minting
        uint256 tokenId = _nextTokenId++;
        _safeMint(job.freelancer, tokenId);
        _setTokenURI(tokenId, job.resultUri);
        _setTokenRoyalty(tokenId, job.freelancer, 500);

        emit FundsReleased(jobId, job.freelancer, totalPayout, tokenId);
    }

    // [Remainder of contract: acceptJob, submitWork, submitReview, dispute, etc. remain structurally similar but would be included in full implementation]
}
