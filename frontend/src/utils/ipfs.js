import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:3001/api';

/**
 * Uploads a JSON object to IPFS via the Backend Relay (Secure).
 * @param {Object} data - The JSON data to upload.
 * @returns {Promise<string>} - The IPFS hash (CID).
 */
export const uploadJSONToIPFS = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/storage/upload-json`, data);
        return response.data.cid;
    } catch (error) {
        console.error('Error uploading JSON to IPFS via relay:', error);
        throw error;
    }
};

/**
 * Uploads a file to IPFS via the Backend Relay (Secure).
 * @param {File} file - The file to upload.
 * @returns {Promise<string>} - The IPFS hash (CID).
 */
export const uploadFileToIPFS = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post(`${API_BASE_URL}/storage/upload-file`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.cid;
    } catch (error) {
        console.error('Error uploading file to IPFS via relay:', error);
        throw error;
    }
};

/**
 * Generates a public gateway URL for an IPFS hash.
 * @param {string} hash 
 * @returns {string}
 */
export const getIPFSUrl = (hash) => {
    if (!hash) return '';
    // Prefer public gateways like Cloudflare or Pinata
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
};
