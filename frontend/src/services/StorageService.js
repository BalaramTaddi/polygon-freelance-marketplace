import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:3001/api';

/**
 * StorageService handles communication with the backend's IPFS relay.
 */
const StorageService = {
    /**
     * Uploads JSON metadata to IPFS via backend
     * @param {Object} metadata 
     * @returns {Promise<{cid: string, url: string}>}
     */
    async uploadMetadata(metadata) {
        try {
            const response = await axios.post(`${API_BASE_URL}/storage/upload-json`, metadata);
            return response.data;
        } catch (error) {
            console.error('IPFS JSON upload failed:', error);
            throw error;
        }
    },

    /**
     * Uploads a file to IPFS via backend
     * @param {File} file 
     * @returns {Promise<{cid: string, url: string}>}
     */
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${API_BASE_URL}/storage/upload-file`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('IPFS File upload failed:', error);
            throw error;
        }
    }
};

export default StorageService;
