const API_URL = 'http://localhost:3001/api';

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const api = {
    getProfile: (address) => fetch(`${API_URL}/profiles/${address}`).then(handleResponse),

    getNonce: (address) => fetch(`${API_URL}/auth/nonce/${address}`).then(handleResponse),

    updateProfile: (data) => fetch(`${API_URL}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(handleResponse),

    getLeaderboard: () => fetch(`${API_URL}/leaderboard`).then(handleResponse),

    getPortfolio: (address) => fetch(`${API_URL}/portfolios/${address}`).then(handleResponse),

    getJobsMetadata: () => fetch(`${API_URL}/jobs`).then(handleResponse),

    getJobMetadata: (jobId) => fetch(`${API_URL}/jobs/${jobId}`).then(handleResponse),

    saveJobMetadata: (jobMetadata) => fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobMetadata),
    }).then(handleResponse),

    getAnalytics: () => fetch(`${API_URL}/analytics`).then(handleResponse),

    getMatchScore: (jobId, address) => fetch(`${API_URL}/match/${jobId}/${address}`).then(handleResponse),

    createStripeOnrampSession: (address) => fetch(`${API_URL}/stripe/create-onramp-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
    }).then(handleResponse),

    polishBio: (data) => fetch(`${API_URL}/profiles/polish-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(handleResponse),
};
