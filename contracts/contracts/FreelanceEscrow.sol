// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ccip/Client.sol";
import "./ccip/IAny2EVMMessageReceiver.sol";
import "./lz/OApp.sol";
import "./PriceConverter.sol";
import "./interfaces/IChainlinkPriceFeed.sol";

interface IPolyToken is IERC20 {
    function mint(address to, uint256 amount) external;
}

interface IInsurancePool {
    function deposit(address token, uint256 amount) external;
    function depositNative() external payable;
}

interface IFreelanceSBT {
    function safeMint(address to, string memory uri) external;
    function mintCertificate(address to, uint16 categoryId, uint8 rating) external returns (uint256);
}


interface IFreelancerReputation {
    function levelUp(address to, uint256 id, uint256 amount) external;
}

interface IArbitrable {
    event Dispute(IArbitrator indexed _arbitrator, uint256 indexed _disputeID, uint256 _metaEvidenceID, uint256 _evidenceID);
    event Evidence(IArbitrator indexed _arbitrator, uint256 indexed _evidenceID, address indexed _party, string _evidence);
    event Ruling(IArbitrator indexed _arbitrator, uint256 indexed _disputeID, uint256 _ruling);
    function rule(uint256 _disputeID, uint256 _ruling) external;
}

interface IArbitrator {
    function createDispute(uint256 _choices, bytes calldata _extraData) external payable returns (uint256 disputeID);
    function arbitrationCost(bytes calldata _extraData) external view returns (uint256 cost);
}

/**
 * @title FreelanceEscrow
 * @author PolyLance Team
 * @notice A high-performance, professional freelance escrow ecosystem built on Polygon.
 * @dev This contract manages job lifecycles, milestone payments, reputation, 
 * and decentralized arbitration. It supports multi-token payments (MATIC, ERC20),
 * cross-chain job creation via CCIP, and meta-transactions via ERC2771.
 */
contract FreelanceEscrow is 
    Initializable, 
    ERC721URIStorageUpgradeable, 
    ERC2981Upgradeable, 
    AccessControlUpgradeable,
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable,
    IAny2EVMMessageReceiver,
    OApp,
    IArbitrable
{
    using SafeERC20 for IERC20;
    using PriceConverter for uint256;

    /// @notice Role for designated arbitrators who can resolve disputes manually
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    /// @notice Role for platform managers who can update configurations
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /// @notice Address of the arbitration service (e.g., Kleros or Platform Admin)
    address public arbitrator;
    /// @dev Internal address for the Meta-transaction forwarder
    address private _trustedForwarder; 
    /// @notice Chainlink CCIP Router for cross-chain job creation
    address public ccipRouter; 
    /// @notice Address of the insurance pool contract
    address public insurancePool;
    /// @notice Address of the platform utility token (PolyToken)
    address public polyToken;
    /// @notice Soulbound Token contract for completion certificates
    address public sbtContract;
    /// @notice Reputation contract for tracking freelancer levels
    address public reputationContract;
    /// @notice Address where platform fees are collected
    address public vault;
    /// @notice Standard reward amount in PolyToken for successful job completion
    uint256 public constant REWARD_AMOUNT = 100 * 10**18;
    /// @notice Platform fee in basis points (1 = 0.01%, 100 = 1%)
    uint256 public platformFeeBps; 
    
    /// @notice Whitelisted tokens accepted as payment
    mapping(address => bool) public whitelistedTokens;
    /// @notice Chainlink Price Feeds mapping for whitelisted tokens
    mapping(address => address) public tokenPriceFeeds; 
    
    /// @notice Required freelancer stake percentage (10%)
    uint256 public constant FREELANCER_STAKE_PERCENT = 10; 
    /// @notice Insurance fee in basis points (1%)
    uint256 public constant INSURANCE_FEE_BPS = 100; 

    /// @notice Allowlisted source chains for CCIP messages
    mapping(uint64 => bool) public allowlistedSourceChains;
    /// @notice Allowlisted senders for CCIP messages
    mapping(address => bool) public allowlistedSenders;

    // ====== CUSTOM ERRORS ======
    error NotAuthorized();
    error SelfHiring();
    error TokenNotWhitelisted();
    error InsufficientPayment();
    error InvalidAmount();
    error JobAlreadyAssigned();
    error InvalidStatus();
    error AlreadyApplied();
    error InsufficientStake();
    error NoRefundAvailable();
    error AlreadyPaid();
    error MilestoneAlreadyReleased();
    error InvalidMilestone();
    error InvalidRating();
    error DeadlineNotPassed();
    error TransferFailed();
    error InvalidAddress();
    error FeeTooHigh();
    error NotRouter();
    error ChainNotAllowed();
    error SenderNotAllowed();
    error LengthMismatch();
    error TotalMismatch();
    error InvalidFreelancer();
    error OnlyArbitrator();
    error NotParty();
    error CostNotMet();
    error NotDisputed();
    error NotClient();
    error NotFreelancer();
    error InvalidJobId();

    /**
     * @notice Enum representing the current status of a freelance job
     */
    enum JobStatus { Created, Accepted, Ongoing, Disputed, Arbitration, Completed, Cancelled }

    /**
     * @notice Struct representing a payment milestone within a job
     */
    struct Milestone {
        uint256 amount;
        string ipfsHash;
        bool isReleased;
    }

    /**
     * @notice Primary Job structure optimized for storage packing
     */
    struct Job {
        // Slot 1: Packs address (20) + uint32 (4) + uint48 (6) + enum (1) + uint8 (1) = 32 bytes
        address client;          
        uint32 id;               
        uint48 deadline;         
        JobStatus status;        
        uint8 rating;            

        // Slot 2: Packs address (20) + uint16 (2) + uint16 (2) + bool (1) = 25 bytes
        address freelancer;      
        uint16 categoryId;       
        uint16 milestoneCount;   
        bool paid;               

        // Slot 3: Token Address
        address token;           

        // Remaining slots for large numbers / dynamic data
        uint256 amount;
        uint256 freelancerStake;
        uint256 totalPaidOut;
        string ipfsHash;
    }

    /**
     * @notice Struct representing a freelancer's application for a job
     */
    struct Application {
        address freelancer;
        uint256 stake;
    }

    /// @notice Mapping from Job ID to Job details
    mapping(uint256 => Job) public jobs;
    /// @notice Mapping from Job ID to Milestone ID to Milestone details
    mapping(uint256 => mapping(uint256 => Milestone)) public jobMilestones;
    /// @notice Mapping from Job ID to Review submitted by the client
    mapping(uint256 => Review) public reviews;
    /// @notice Mapping from Job ID to list of applications
    mapping(uint256 => Application[]) public jobApplications;
    /// @notice Mapping to track if a freelancer has already applied to a job
    mapping(uint256 => mapping(address => bool)) public hasApplied;
    /// @notice Pending refunds for unselected freelancers or cancelled jobs
    mapping(address => mapping(address => uint256)) public pendingRefunds; 
    
    /// @notice Total number of jobs created on the platform
    uint256 public jobCount;
    /// @notice Required application stake percentage (5%)
    uint256 public constant APPLICATION_STAKE_PERCENT = 5; 

    /**
     * @notice Struct representing a review for a completed job
     */
    struct Review {
        uint8 rating; 
        string ipfsHash;
        address reviewer;
    }

    // ====== EVENTS ======
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount, uint256 deadline);
    event JobApplied(uint256 indexed jobId, address indexed freelancer, uint256 stake);
    event FreelancerSelected(uint256 indexed jobId, address indexed freelancer);
    event JobAccepted(uint256 indexed jobId, address indexed freelancer, uint256 stake);
    event WorkSubmitted(uint256 indexed jobId, address indexed freelancer, string ipfsHash);
    event FundsReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount, uint256 nftId);
    event MilestoneReleased(uint256 indexed jobId, uint256 indexed milestoneId, uint256 amount);
    event MilestonesDefined(uint256 indexed jobId, uint256[] amounts, string[] ipfsHashes);
    event JobCancelled(uint256 indexed jobId);
    event JobDisputed(uint256 indexed jobId);
    event DisputeRaised(uint256 indexed jobId, address indexed raiser);
    event Ruling(address indexed _arbitrator, uint256 indexed _disputeID, uint256 _ruling);
    event ReviewSubmitted(uint256 indexed jobId, address indexed reviewer, uint8 rating, string ipfsHash);
    event CCIPMessageReceived(bytes32 indexed messageId, uint64 indexed sourceChainSelector, address sender);
    event InsurancePaid(uint256 indexed jobId, uint256 amount);
    event RefundClaimed(address indexed user, address indexed token, uint256 indexed amount);
    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event DisputeResolvedManual(uint256 indexed jobId, uint256 freelancerAmount, uint256 clientAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the PolyLance ecosystem contracts and roles
     * @param initialOwner Address of the contract owner and super-admin
     * @param trustedForwarder Meta-transaction forwarder address
     * @param _ccipRouter CCIP Router address
     * @param _insurancePool Insurance pool contract address
     * @param _lzEndpoint LayerZero endpoint address
     */
    function initialize(
        address initialOwner, 
        address trustedForwarder, 
        address _ccipRouter,
        address _insurancePool,
        address _lzEndpoint
    ) public initializer {
        __ERC721_init("FreelanceWork", "FWORK");
        __ERC721URIStorage_init();
        __ERC2981_init();
        __Ownable_init(initialOwner);
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        __OApp_init(_lzEndpoint);

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(ARBITRATOR_ROLE, initialOwner);
        _grantRole(MANAGER_ROLE, initialOwner);

        arbitrator = initialOwner;
        _trustedForwarder = trustedForwarder;
        ccipRouter = _ccipRouter;
        insurancePool = _insurancePool;
        vault = initialOwner;
        platformFeeBps = 250; 
    }


    /**
     * @notice Updates the trusted forwarder address for meta-transactions
     * @param forwarder New forwarder address
     */
    function setTrustedForwarder(address forwarder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _trustedForwarder = forwarder;
    }

    /**
     * @notice Updates the reputation contract address
     * @param _reputation New reputation contract address
     */
    function setReputationContract(address _reputation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reputationContract = _reputation;
    }

    /**
     * @notice Whitelists or removes a token from the allowed payment tokens
     * @param token Address of the ERC20 token
     * @param allowed Boolean flag for whitelist status
     */
    function setTokenWhitelist(address token, bool allowed) external onlyRole(MANAGER_ROLE) {
        whitelistedTokens[token] = allowed;
    }

    /**
     * @notice Sets the insurance pool contract address
     * @param _pool New insurance pool address
     */
    function setInsurancePool(address _pool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        insurancePool = _pool;
    }

    /**
     * @notice Sets the PolyToken utility token address
     * @param _token New PolyToken address
     */
    function setPolyToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        polyToken = _token;
    }

    /**
     * @notice Updates the platform fee collection vault
     * @param _vault New vault address
     */
    function setVault(address _vault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_vault == address(0)) revert InvalidAddress();
        emit VaultUpdated(vault, _vault);
        vault = _vault;
    }

    /**
     * @notice Updates the platform fee basis points
     * @param _bps Fee in basis points (max 1000 = 10%)
     */
    function setPlatformFee(uint256 _bps) external onlyRole(MANAGER_ROLE) {
        if (_bps > 1000) revert FeeTooHigh();
        platformFeeBps = _bps;
    }

    /**
     * @notice Pauses all critical contract functions
     */
    function pause() external onlyRole(MANAGER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses contract functions
     */
    function unpause() external onlyRole(MANAGER_ROLE) {
        _unpause();
    }

    /**
     * @notice Set Chainlink price feed for a token (USD pegging)
     * @param token Token address (use address(0) for native token)
     * @param priceFeed Chainlink price feed address
     */
    function setPriceFeed(address token, address priceFeed) external onlyRole(MANAGER_ROLE) {
        tokenPriceFeeds[token] = priceFeed;
    }

    /**
     * @notice Get USD value of a token amount
     * @param token Token address
     * @param amount Token amount in wei
     * @return USD value with 8 decimals
     */
    function getUSDValue(address token, uint256 amount) public view returns (uint256) {
        address priceFeed = tokenPriceFeeds[token];
        // PriceConverter.getUSDValue will revert with PriceFeedNotSet() if priceFeed is address(0)
        return amount.getUSDValue(priceFeed);
    }

    /**
     * @dev Context utility for meta-transactions.
     * Overridden for ERC-2771 compatibility if needed, though usually handled by _msgSender.
     */
    function _contextSuffixLength() internal view virtual override(ContextUpgradeable) returns (uint256) {
        return 0;
    }

    /**
     * @dev Overridden _msgSender for ERC-2771 meta-transaction compatibility.
     * Helps in extracting the actual user address from the appended calldata from a trusted forwarder.
     * @return sender The original sender of the meta-transaction.
     */
    function _msgSender() internal view virtual override(ContextUpgradeable) returns (address sender) {
        if (msg.sender == _trustedForwarder && _trustedForwarder != address(0)) {
             assembly { sender := shr(96, calldataload(sub(calldatasize(), 20))) }
        } else {
            return super._msgSender();
        }
    }

    /**
     * @dev Overridden _msgData for ERC-2771 meta-transaction compatibility.
     * Removes the appended user address from the calldata when sent via a trusted forwarder.
     * @return data The original transaction calldata.
     */
    function _msgData() internal view virtual override(ContextUpgradeable) returns (bytes calldata) {
        if (msg.sender == _trustedForwarder && _trustedForwarder != address(0)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }
    
    /**
     * @dev UUPS upgrade authorization hook.
     * Restricts upgrades to addresses with the DEFAULT_ADMIN_ROLE.
     * @param newImplementation Address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /**
     * @notice Checks if the contract supports a specific interface.
     * @dev Overrides supportsInterface from several parents to combine logic.
     * @param interfaceId The interface identifier to check.
     * @return bool True if the interface is supported.
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorageUpgradeable, ERC2981Upgradeable, AccessControlUpgradeable) returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @notice Returns the token URI containing the dynamic PoW SVG.
     * @dev Generates an on-chain Base64-encoded JSON metadata object.
     * @param tokenId The ID of the completed job NFT.
     * @return string Data URI for the NFT metadata.
     */
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorageUpgradeable) returns (string memory) {
        _requireOwned(tokenId);
        Job storage job = jobs[tokenId];
        
        string memory imageURI = string(abi.encodePacked(
            "data:image/svg+xml;base64,", 
            Base64.encode(bytes(_generateSVG(tokenId, job.categoryId, job.amount, job.rating)))
        ));

        string memory ratingTrait = job.rating > 0 
            ? string(abi.encodePacked('{"trait_type": "Rating", "value": "', Strings.toString(job.rating), '"}, ')) 
            : '';

        string memory json = string(abi.encodePacked(
            '{"name": "PolyLance Job #', Strings.toString(tokenId), 
            '", "description": "Proof of Work for PolyLance Marketplace", "image": "', imageURI, 
            '", "attributes": [', ratingTrait, '{"trait_type": "Category", "value": "', _getCategoryName(job.categoryId), 
            '"}, {"trait_type": "Budget", "value": "', Strings.toString(job.amount), '"}]}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /**
     * @notice Generate dynamic SVG with rating-based background colors
     * @param jobId Job ID
     * @param categoryId Category ID
     * @param amount Budget amount
     * @param rating Rating (1-5 stars): Gold (4-5), Silver (3), Bronze (1-2)
     */
    /**
     * @notice Generates the dynamic SVG image for the Job Completion NFT.
     * @dev Uses rating-specific background colors and badge labels.
     * @param jobId The unique identifier of the job.
     * @param categoryId Industry category index.
     * @param amount Job budget amount.
     * @param rating Rating (1-5) awarded for the work.
     * @return string The raw SVG markup.
     */
    function _generateSVG(uint256 jobId, uint256 categoryId, uint256 amount, uint8 rating) internal view returns (string memory) {
        string memory category = _getCategoryName(categoryId);
        string memory jobIdStr = Strings.toString(jobId);
        string memory amountStr = Strings.toString(amount);
        
        // Rating-based gradient colors: Gold, Silver, Bronze, or default purple
        (string memory color1, string memory color2, string memory badge) = _getRatingColors(rating);

        bytes memory header = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<rect width="100%" height="100%" fill="#1a1c2c"/>',
            '<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:', color1, '"/>',
            '<stop offset="100%" style="stop-color:', color2, '"/>',
            '</linearGradient></defs>'
        );

        bytes memory body = abi.encodePacked(
            '<circle cx="200" cy="200" r="150" fill="url(#grad)" opacity="0.9"/>',
            '<text x="50%" y="30%" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">POLYLANCE WORK</text>',
            '<text x="50%" y="45%" text-anchor="middle" fill="white" font-family="Arial" font-size="18">Job #', jobIdStr, '</text>',
            '<text x="50%" y="55%" text-anchor="middle" fill="#fbbf24" font-family="Arial" font-size="20">', category, '</text>',
            '<text x="50%" y="65%" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Budget: ', amountStr, '</text>'
        );

        bytes memory footer = abi.encodePacked(
            rating > 0 ? string(abi.encodePacked(
                '<text x="50%" y="80%" text-anchor="middle" fill="', badge, '" font-family="Arial" font-size="22" font-weight="bold">',
                _getStars(rating), ' ', badge, '</text>'
            )) : '',
            '</svg>'
        );

        return string(abi.encodePacked(header, body, footer));
    }

    /**
     * @notice Get gradient colors based on rating
     * @return color1 Primary gradient color
     * @return color2 Secondary gradient color
     * @return badge Badge text (GOLD/SILVER/BRONZE)
     */
    /**
     * @dev Map completion rating to specific UI colors and achievement levels.
     * @param rating Job rating (1-5).
     * @return color1 Primary brand color.
     * @return color2 Secondary brand color.
     * @return badge Achievement label (GOLD, SILVER, BRONZE).
     */
    function _getRatingColors(uint8 rating) internal pure returns (string memory color1, string memory color2, string memory badge) {
        if (rating >= 4) {
            // Gold: 4-5 stars
            return ("#FFD700", "#FFA500", "GOLD");
        } else if (rating == 3) {
            // Silver: 3 stars
            return ("#C0C0C0", "#808080", "SILVER");
        } else if (rating > 0) {
            // Bronze: 1-2 stars
            return ("#CD7F32", "#8B4513", "BRONZE");
        } else {
            // Default purple gradient (no rating yet)
            return ("#4f46e5", "#9333ea", "");
        }
    }

    /**
     * @notice Generate star rating visualization
     */
    /**
     * @dev Helper to convert numeric rating to visual star characters.
     * @param rating Star count (1-5).
     * @return string Star representation (e.g., "*****").
     */
    function _getStars(uint8 rating) internal pure returns (string memory) {
        if (rating == 5) return "*****";
        if (rating == 4) return "****";
        if (rating == 3) return "***";
        if (rating == 2) return "**";
        if (rating == 1) return "*";
        return "";
    }

    /**
     * @dev Internal resolver for category names.
     * @param categoryId Numeric category ID.
     * @return string Human-readable category name.
     */
    function _getCategoryName(uint256 categoryId) internal pure returns (string memory) {
        if (categoryId == 1) return "Development";
        if (categoryId == 2) return "Design";
        if (categoryId == 3) return "Marketing";
        if (categoryId == 4) return "Writing";
        return "General";
    }

    /**
     * @notice Callback handler for cross-chain messages via Chainlink CCIP.
     * @dev Allows job creation from authorized sources on other chains.
     * @param message The CCIP message data.
     */
    function ccipReceive(Client.Any2EVMMessage calldata message) external override {
        if (msg.sender != ccipRouter) revert NotAuthorized();
        if (!allowlistedSourceChains[message.sourceChainSelector]) revert NotAuthorized();
        address sender = abi.decode(message.sender, (address));
        if (!allowlistedSenders[sender]) revert NotAuthorized();

        (address freelancer, string memory ipfsHash, uint256 deadline, uint256 categoryId) = abi.decode(message.data, (address, string, uint256, uint256));
        address token = message.destTokenAmounts[0].token;
        uint256 amount = message.destTokenAmounts[0].amount;

        _createJobInternal(sender, freelancer, token, amount, ipfsHash, deadline, categoryId);
        emit CCIPMessageReceived(message.messageId, message.sourceChainSelector, sender);
    }

    /**
     * @notice Internal function to create a job entry
     * @param client Address of the job poster
     * @param freelancer Optional pre-selected freelancer address
     * @param token Payment token address (address(0) for MATIC)
     * @param amount Total budget for the job
     * @param _ipfsHash CID for job description and metadata
     * @param deadline Optional unix timestamp for job completion
     * @param categoryId Industry category index
     */
    /**
     * @dev Internal implementation for job entry creation.
     * Handles state initialization for both direct and CCIP job creation.
     * @param client The address of the job poster.
     * @param freelancer Pre-selected freelancer (optional).
     * @param token Payment token address.
     * @param amount Budget amount.
     * @param _ipfsHash Metadata pointer.
     * @param deadline Completion deadline timestamp.
     * @param categoryId Work category identifier.
     */
    function _createJobInternal(
        address client,
        address freelancer,
        address token,
        uint256 amount,
        string memory _ipfsHash,
        uint256 deadline,
        uint256 categoryId
    ) internal {
        if (freelancer != address(0) && freelancer == client) revert SelfHiring();

        jobCount++;
        jobs[jobCount] = Job({
            id: uint32(jobCount),
            client: client,
            freelancer: freelancer,
            token: token,
            amount: amount,
            freelancerStake: 0,
            totalPaidOut: 0,
            status: JobStatus.Created,
            ipfsHash: _ipfsHash,
            paid: false,
            deadline: uint48(deadline),
            milestoneCount: 0,
            categoryId: uint16(categoryId),
            rating: 0
        });

        emit JobCreated(jobCount, client, freelancer, amount, deadline);
    }

    /**
     * @notice Updates the IPFS metadata hash for an existing job
     * @param jobId Target Job ID
     * @param ipfsHash New metadata CID
     */
    function saveIPFSHash(uint256 jobId, string calldata ipfsHash) external {
        Job storage job = jobs[jobId];
        address sender = _msgSender();
        if (sender != job.client && sender != job.freelancer) revert NotAuthorized();
        job.ipfsHash = ipfsHash;
    }

    /**
     * @notice Creates a new freelance job with instant fund locking
     * @param freelancer Optional pre-selected freelancer
     * @param token Payment token address
     * @param amount Budget amount
     * @param _ipfsHash Metadata CID
     * @param durationDays Number of days until deadline
     * @param categoryId Category index
     */
    function createJob(
        address freelancer, 
        address token, 
        uint256 amount, 
        string memory _ipfsHash,
        uint256 durationDays,
        uint256 categoryId
    ) external payable whenNotPaused nonReentrant {
        if (token != address(0)) {
            if (!whitelistedTokens[token]) revert TokenNotWhitelisted();
            IERC20(token).safeTransferFrom(_msgSender(), address(this), amount);
        } else {
            if (msg.value < amount) revert InsufficientPayment();
        }
        
        uint256 deadline = durationDays > 0 ? block.timestamp + (durationDays * 1 days) : 0;
        _createJobInternal(_msgSender(), freelancer, token, amount, _ipfsHash, deadline, categoryId);
    }

    /**
     * @notice Creates a job with multiple payment milestones
     * @param freelancer Optional pre-selected freelancer
     * @param token Payment token address
     * @param amount Total budget
     * @param _ipfsHash Primary metadata CID
     * @param milestoneAmounts Array of amounts for each milestone
     * @param milestoneIpfsHashes Array of metadata CIDs for each milestone
     * @param categoryId Category index
     */
    function createJobWithMilestones(
        address freelancer,
        address token,
        uint256 amount,
        string memory _ipfsHash,
        uint256[] memory milestoneAmounts,
        string[] memory milestoneIpfsHashes,
        uint256 categoryId
    ) external payable whenNotPaused nonReentrant {
        uint256 totalMilestoneAmount = 0;
        uint256 len = milestoneAmounts.length;
        for (uint256 i = 0; i < len; ) {
            totalMilestoneAmount += milestoneAmounts[i];
            unchecked { ++i; }
        }
        if (totalMilestoneAmount != amount) revert InvalidAmount();

        if (token != address(0)) {
            if (!whitelistedTokens[token]) revert TokenNotWhitelisted();
            IERC20(token).safeTransferFrom(_msgSender(), address(this), amount);
        } else {
            if (msg.value < amount) revert InsufficientPayment();
        }

        uint256 deadline = 0; 
        _createJobInternal(_msgSender(), freelancer, token, amount, _ipfsHash, deadline, categoryId);
        
        uint256 jobId = jobCount;
        jobs[jobId].milestoneCount = uint16(len);
        for (uint256 i = 0; i < len; ) {
            jobMilestones[jobId][i] = Milestone({
                amount: milestoneAmounts[i],
                ipfsHash: milestoneIpfsHashes[i],
                isReleased: false
            });
            unchecked { ++i; }
        }
        emit MilestonesDefined(jobId, milestoneAmounts, milestoneIpfsHashes);
    }

    /**
     * @dev Freelancers apply for a job by providing a small stake.
     * Prevents spam and ensures commitment.
     */
    function applyForJob(uint256 jobId) external payable nonReentrant {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Created) revert InvalidStatus();
        if (job.freelancer != address(0)) revert JobAlreadyAssigned();
        address sender = _msgSender();
        if (sender == job.client) revert NotAuthorized();
        if (hasApplied[jobId][sender]) revert AlreadyApplied();

        uint256 stake = (job.amount * APPLICATION_STAKE_PERCENT) / 100;
        if (job.token != address(0)) {
            IERC20(job.token).safeTransferFrom(sender, address(this), stake);
        } else {
            if (msg.value < stake) revert InsufficientStake();
        }

        jobApplications[jobId].push(Application({
            freelancer: sender,
            stake: stake
        }));
        hasApplied[jobId][sender] = true;

        emit JobApplied(jobId, sender, stake);
    }

    /**
     * @dev Client picks a freelancer from the applicants.
     * Unselected applicants get their stake refunded.
     */
    function pickFreelancer(uint256 jobId, address freelancer) external whenNotPaused nonReentrant {
        Job storage job = jobs[jobId];
        if (_msgSender() != job.client) revert NotAuthorized();
        if (job.status != JobStatus.Created) revert InvalidStatus();
        if (job.freelancer != address(0)) revert JobAlreadyAssigned();
        if (!hasApplied[jobId][freelancer]) revert NotAuthorized();

        job.freelancer = freelancer;
        job.status = JobStatus.Accepted;

        Application[] storage apps = jobApplications[jobId];
        uint256 len = apps.length;
        for (uint256 i = 0; i < len; ) {
            if (apps[i].freelancer == freelancer) {
                job.freelancerStake = apps[i].stake;
            } else {
                pendingRefunds[apps[i].freelancer][job.token] += apps[i].stake;
            }
            unchecked { ++i; }
        }

        emit FreelancerSelected(jobId, freelancer);
        emit JobAccepted(jobId, freelancer, job.freelancerStake);
    }

    /**
     * @notice Allows a user to claim their pending refunds
     * @param token Address of the token to claim
     */
    function claimRefund(address token) external nonReentrant {
        uint256 amount = pendingRefunds[_msgSender()][token];
        if (amount == 0) revert NoRefundAvailable();

        pendingRefunds[_msgSender()][token] = 0;
        _sendFunds(_msgSender(), token, amount);

        emit RefundClaimed(_msgSender(), token, amount);
    }

    /**
     * @notice Finalizes a job and releases all remaining funds to the freelancer
     * @dev Also mints the Proof-of-Work NFT and grants reputation
     * @param jobId Target Job ID
     */
    function releaseFunds(uint256 jobId) external whenNotPaused nonReentrant {
        Job storage job = jobs[jobId];
        if (_msgSender() != job.client) revert NotAuthorized();
        if (job.status != JobStatus.Ongoing && job.status != JobStatus.Accepted) revert InvalidStatus();
        if (job.paid) revert AlreadyPaid();

        job.paid = true;
        job.status = JobStatus.Completed;

        uint256 insuranceFee = (job.amount * INSURANCE_FEE_BPS) / 10000;
        uint256 platformFee = (job.amount * platformFeeBps) / 10000;
        uint256 remainingAmount = job.amount - job.totalPaidOut - insuranceFee - platformFee;
        uint256 totalPayout = remainingAmount + job.freelancerStake;

        if (insuranceFee > 0 && insurancePool != address(0)) {
            if (job.token == address(0)) {
                IInsurancePool(insurancePool).depositNative{value: insuranceFee}();
            } else {
                IERC20(job.token).safeIncreaseAllowance(insurancePool, insuranceFee);
                IInsurancePool(insurancePool).deposit(job.token, insuranceFee);
            }
            emit InsurancePaid(jobId, insuranceFee);
        }

        if (platformFee > 0 && vault != address(0)) {
            _sendFunds(vault, job.token, platformFee);
        }

        if (totalPayout > 0) {
            _sendFunds(job.freelancer, job.token, totalPayout);
        }

        uint256 tokenId = jobId;
        _safeMint(job.freelancer, tokenId);
        _setTokenURI(tokenId, job.ipfsHash);
        
        if (reputationContract != address(0)) {
            IFreelancerReputation(reputationContract).levelUp(job.freelancer, job.categoryId, 1);
        }

        _rewardParties(jobId);

        emit FundsReleased(jobId, job.freelancer, totalPayout, tokenId);
    }

    /**
     * @notice Releases a specific milestone payment to the freelancer
     * @param jobId Target Job ID
     * @param milestoneId Index of the milestone
     */
    function releaseMilestone(uint256 jobId, uint256 milestoneId) external whenNotPaused nonReentrant {
        Job storage job = jobs[jobId];
        if (_msgSender() != job.client) revert NotAuthorized();
        if (milestoneId >= job.milestoneCount) revert InvalidMilestone();
        
        Milestone storage m = jobMilestones[jobId][milestoneId];
        if (m.isReleased) revert MilestoneAlreadyReleased();

        m.isReleased = true;
        job.totalPaidOut += m.amount;

        _sendFunds(job.freelancer, job.token, m.amount);
        emit MilestoneReleased(jobId, milestoneId, m.amount);
    }

    /**
     * @notice Allows a selected freelancer to accept a job and lock their stake
     * @param jobId Target Job ID
     */
    function acceptJob(uint256 jobId) external payable nonReentrant {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Created) revert InvalidStatus();
        if (job.freelancer == address(0)) revert InvalidStatus();
        address sender = _msgSender();
        if (sender != job.freelancer) revert NotAuthorized();

        uint256 stake = (job.amount * FREELANCER_STAKE_PERCENT) / 100;
        if (job.token != address(0)) {
            IERC20(job.token).safeTransferFrom(sender, address(this), stake);
        } else {
            if (msg.value < stake) revert InsufficientStake();
        }

        job.freelancerStake = stake;
        job.status = JobStatus.Accepted;
        emit JobAccepted(jobId, _msgSender(), stake);
    }

    /**
     * @notice Marks a job as ongoing and records initial work metadata
     * @param jobId Target Job ID
     * @param ipfsHash Metadata CID for the work plan/submission
     */
    function submitWork(uint256 jobId, string calldata ipfsHash) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Accepted) revert InvalidStatus();
        address sender = _msgSender();
        if (sender != job.freelancer) revert NotAuthorized();

        job.ipfsHash = ipfsHash;
        job.status = JobStatus.Ongoing;
        emit WorkSubmitted(jobId, sender, ipfsHash);
    }

    /**
     * @notice Elevates a job status to Arbitration due to conflict
     * @dev If an external arbitrator is set, the dispute is created on their contract
     * @param jobId Target Job ID
     */
    function dispute(uint256 jobId) external payable nonReentrant {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Ongoing && job.status != JobStatus.Accepted) revert InvalidStatus();
        address sender = _msgSender();
        if (sender != job.client && sender != job.freelancer) revert NotAuthorized();

        job.status = JobStatus.Arbitration;
        
        // Kleros Integration: If arbitrator is external, create dispute there
        if (arbitrator != owner()) {
            uint256 disputeID = IArbitrator(arbitrator).createDispute{value: msg.value}(2, ""); 
            disputeIdToJobId[disputeID] = jobId;
            emit Dispute(IArbitrator(arbitrator), disputeID, jobId, jobId);
        }

        emit DisputeRaised(jobId, _msgSender());
    }

    /**
     * @notice Platform-level dispute resolution by the owner
     * @param jobId Target Job ID
     * @param winner Address of the party receiving the primary payout
     * @param freelancerPayout Amount to pay the freelancer (rest goes to client)
     */
    function resolveDispute(uint256 jobId, address winner, uint256 freelancerPayout) external onlyOwner nonReentrant {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Arbitration) revert InvalidStatus();

        job.paid = true;
        job.status = JobStatus.Completed;

        _sendFunds(winner, job.token, freelancerPayout);
        
        // Refund remaining to client if any
        uint256 totalEscrow = job.amount + job.freelancerStake;
        if (totalEscrow > freelancerPayout) {
            _sendFunds(job.client, job.token, totalEscrow - freelancerPayout);
        }

        emit FundsReleased(jobId, winner, freelancerPayout, jobId);
    }

    /**
     * @notice Submits a review and rating for a completed job
     * @param jobId Target Job ID
     * @param rating Rating from 1 to 5
     * @param ipfsHash Review text/metadata CID
     */
    function submitReview(uint256 jobId, uint8 rating, string calldata ipfsHash) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Completed) revert InvalidStatus();
        if (_msgSender() != job.client) revert NotAuthorized();
        if (rating < 1 || rating > 5) revert InvalidRating();

        reviews[jobId] = Review({
            rating: rating,
            ipfsHash: ipfsHash,
            reviewer: _msgSender()
        });

        // Update job rating for dynamic NFT colors (Gold/Silver/Bronze)
        job.rating = rating;

        if (sbtContract != address(0)) {
            IFreelanceSBT(sbtContract).mintCertificate(job.freelancer, uint16(job.categoryId), rating);
        }

        emit ReviewSubmitted(jobId, _msgSender(), rating, ipfsHash);
    }

    /**
     * @notice External arbitrator callback to settle a dispute
     * @param _disputeID Kleros/External Dispute ID
     * @param _ruling Ruling choice (1: Client, 2: Freelancer)
     */
    function rule(uint256 _disputeID, uint256 _ruling) external nonReentrant {
        if (msg.sender != arbitrator) revert NotAuthorized();
        uint256 jobId = disputeIdToJobId[_disputeID];
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Disputed) revert InvalidStatus();

        job.paid = true;
        if (_ruling == 1) { // Refund Client
            job.status = JobStatus.Cancelled;
            _sendFunds(job.client, job.token, job.amount + job.freelancerStake);
        } else { // Pay Freelancer
            job.status = JobStatus.Completed;
            _sendFunds(job.freelancer, job.token, job.amount + job.freelancerStake);
        }
        emit Ruling(IArbitrator(msg.sender), _disputeID, _ruling);
    }

    /**
     * @dev Manually resolve a dispute by splitting funds.
     * @param jobId The job to resolve.
     * @param freelancerShareBps The portion (in basis points) to give to the freelancer.
     */
    function resolveDisputeManual(uint256 jobId, uint256 freelancerShareBps) external onlyRole(ARBITRATOR_ROLE) nonReentrant {
        if (freelancerShareBps > 10000) revert InvalidAmount();
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.Arbitration) revert InvalidStatus();

        uint256 totalEscrow = job.amount + job.freelancerStake;
        uint256 freelancerAmount = (totalEscrow * freelancerShareBps) / 10000;
        uint256 clientAmount = totalEscrow - freelancerAmount;

        job.status = JobStatus.Completed;
        job.paid = true;

        if (freelancerAmount > 0) {
            _sendFunds(job.freelancer, job.token, freelancerAmount);
        }
        if (clientAmount > 0) {
            _sendFunds(job.client, job.token, clientAmount);
        }

        emit DisputeResolvedManual(jobId, freelancerAmount, clientAmount);
    }

    /**
     * @dev Internal helper to transfer funds securely (Native or ERC20).
     * @param to Recipient address.
     * @param token Address of the token (Zero address for Native).
     * @param amount Quantity of funds to transfer.
     */
    function _sendFunds(address to, address token, uint256 amount) internal {
        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @dev Distributes PolyToken rewards to both parties upon job completion.
     * @param jobId The ID of the completed job.
     */
    function _rewardParties(uint256 jobId) internal {
        if (polyToken == address(0)) return;
        Job storage job = jobs[jobId];
        try IPolyToken(polyToken).mint(job.freelancer, REWARD_AMOUNT) {} catch {}
        try IPolyToken(polyToken).mint(job.client, REWARD_AMOUNT / 2) {} catch {}
    }

    /**
     * @dev Allows the client to reclaim funds if the job deadline is passed 
     * and no freelancer was assigned or they failed to submit work.
     */
    function refundExpiredJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.client != _msgSender()) revert NotAuthorized();
        if (job.deadline == 0 || block.timestamp <= job.deadline) revert DeadlineNotPassed();
        if (job.status != JobStatus.Created && job.status != JobStatus.Accepted) revert InvalidStatus();
        if (job.paid) revert AlreadyPaid();

        job.paid = true;
        job.status = JobStatus.Cancelled;

        uint256 totalRefund = job.amount;
        _sendFunds(job.client, job.token, totalRefund);

        // Also refund freelancer stake if they accepted but failed to finish
        if (job.freelancerStake > 0 && job.freelancer != address(0)) {
            _sendFunds(job.freelancer, job.token, job.freelancerStake);
        }

        emit JobCancelled(jobId);
    }

    mapping(uint256 => uint256) public disputeIdToJobId;
}
