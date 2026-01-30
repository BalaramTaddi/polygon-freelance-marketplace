export const CONTRACT_ADDRESS = '0x25F6C8ed995C811E6c0ADb1D66A60830E8115e9A';

export const SUPPORTED_TOKENS = [
    { symbol: 'MATIC', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDC', address: '0x41e94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', decimals: 6 },
    { symbol: 'DAI', address: '0x001B68356E62095104ee17672f101d2959E73fF3', decimals: 18 },
];

export const CHAINLINK_PRICE_FEEDS = {
    MATIC: '0x001382149eBa3441043c1c66972b4772963f5D43', // Amoy MATIC/USD
};

export const PRICE_FEED_ABI = [
    {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
            { "internalType": "uint80", "name": "roundId", "type": "uint80" },
            { "internalType": "int256", "name": "answer", "type": "int256" },
            { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
            { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
            { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

export const POLY_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
export const STREAMING_ESCROW_ADDRESS = '0x0000000000000000000000000000000000000000';
