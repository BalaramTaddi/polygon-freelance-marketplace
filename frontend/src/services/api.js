const API_URL = 'http://localhost:3001/api';

export const api = {
    getProfile: async (address) => {
        const response = await fetch(`${API_URL}/profiles/${address}`);
        return response.json();
    },

    getNonce: async (address) => {
        const response = await fetch(`${API_URL}/auth/nonce/${address}`);
        return response.json();
    },

    updateProfile: (data) => fetch(`${API_URL}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(res => res.json()),

    getLeaderboard: () => fetch(`${API_URL}/leaderboard`).then(res => res.json()),

    getPortfolio: (address) => fetch(`${API_URL}/portfolios/${address}`).then(res => res.json()),

    getDisputedJobs: () => fetch(`${API_URL}/jobs/disputed`).then(res => res.json()), // Placeholder if we add specific disputed endpoint

    getJobsMetadata: async () => {
        const response = await fetch(`${API_URL}/jobs`);
        return response.json();
    },

    getJobMetadata: async (jobId) => {
        const response = await fetch(`${API_URL}/jobs/${jobId}`);
        return response.json();
    },

    saveJobMetadata: async (jobMetadata) => {
        const response = await fetch(`${API_URL}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobMetadata),
        });
        return response.json();
    },
};
