// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title PolyCompletionSBT
 * @author PolyLance Team
 * @notice Soulbound Token (ERC-5192) for Job Completion Certificates on PolyLance.
 * @dev These tokens are non-transferable (Soulbound) and serve as on-chain proof of successful delivery.
 * Metadata is generated on-chain as a Base64-encoded JSON object.
 */
contract PolyCompletionSBT is ERC721, Ownable {
    using Strings for uint256;

    /// @dev Counter for tracking the next token ID to be minted
    uint256 private _nextTokenId;
    
    /// @notice Authorized marketplace address allowed to mint certificates
    address public marketplace;

    /**
     * @notice Structure to store certificate-specific data
     * @param categoryId Numerical identifier for the work category
     * @param rating Rating assigned to the completed work (0-5)
     * @param completionTimestamp Unix timestamp when the job was marked complete
     */
    struct CertificateData {
        uint16 categoryId;
        uint8 rating;
        uint48 completionTimestamp;
    }

    /// @notice Maps token ID to its certificate metadata
    mapping(uint256 => CertificateData) public certificateDetails;

    /// @notice Emitted when a token is locked as per ERC-5192
    event Locked(uint256 tokenId);
    /// @notice Emitted when a token is unlocked as per ERC-5192 (Not used in this implementation)
    event Unlocked(uint256 tokenId);

    /// @notice Error thrown when an unauthorized address attempts to mint
    error NotMarketplace();
    /// @notice Error thrown when a transfer of a Soulbound token is attempted
    error Soulbound();
    /// @notice Error thrown when querying a non-existent token
    error NonExistentToken();

    /**
     * @notice Initializes the PolyCompletionSBT contract
     * @param initialOwner Address of the contract administrator
     * @param _marketplace Address of the PolyLance Escrow/Marketplace contract
     */
    constructor(address initialOwner, address _marketplace) 
        ERC721("PolyLance Completion Certificate", "PLCC") 
        Ownable(initialOwner) 
    {
        marketplace = _marketplace;
    }

    /**
     * @notice Updates the authorized marketplace address
     * @dev Only callable by the contract owner
     * @param _marketplace New marketplace address
     */
    function setMarketplace(address _marketplace) external onlyOwner {
        marketplace = _marketplace;
    }

    /**
     * @notice Mints a soulbound completion certificate
     * @dev Restricted to the authorized Marketplace contract
     * @param to Recipient address (freelancer)
     * @param categoryId Job category ID
     * @param rating Rating awarded for the job
     * @return uint256 The ID of the newly minted certificate
     */
    function mintCertificate(address to, uint16 categoryId, uint8 rating) external returns (uint256) {
        if (msg.sender != marketplace) revert NotMarketplace();
        
        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        
        certificateDetails[tokenId] = CertificateData({
            categoryId: categoryId,
            rating: rating,
            completionTimestamp: uint48(block.timestamp)
        });

        emit Locked(tokenId);
        return tokenId;
    }

    /**
     * @notice ERC-5192: Returns the locking status of a token
     * @param tokenId The ID of the token to check
     * @return bool Always returns true as certificates are Soulbound by design
     */
    function locked(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) revert NonExistentToken();
        return true; 
    }

    /**
     * @dev Internal hook to prevent all transfers except minting and burning
     * @param to Recipient address
     * @param tokenId Token ID being updated
     * @param auth Address authorized for the operation
     * @return address The address of the previous owner
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Only allow minting (from == 0) and burning (to == 0)
        if (from != address(0) && to != address(0)) {
            revert Soulbound();
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Generates on-chain metadata for a given certificate
     * @dev Returns a Base64-encoded JSON metadata object
     * @param tokenId The ID of the token
     * @return string Data URI containing the JSON metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        CertificateData memory data = certificateDetails[tokenId];
        
        string memory category = _getCategoryName(data.categoryId);
        
        string memory json = string(abi.encodePacked(
            '{"name": "Work Certificate #', tokenId.toString(), 
            '", "description": "Official Proof of Work verified by PolyLance Protocol", ',
            '"attributes": [',
            '{"trait_type": "Category", "value": "', category, '"},',
            '{"trait_type": "Rating", "value": ', uint256(data.rating).toString(), '},',
            '{"display_type": "date", "trait_type": "Completion Date", "value": ', uint256(data.completionTimestamp).toString(), '}',
            ']}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /**
     * @dev Helper to resolve category ID to a human-readable name
     * @param id Category identifier
     * @return string Human-readable category name
     */
    function _getCategoryName(uint16 id) internal pure returns (string memory) {
        if (id == 1) return "Development";
        if (id == 2) return "Design";
        if (id == 3) return "Marketing";
        if (id == 4) return "Writing";
        return "General Services";
    }

    /**
     * @notice Standard interface support check (includes ERC-5192 support)
     * @param interfaceId The interface identifier
     */
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }
}
