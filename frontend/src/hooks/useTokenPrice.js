import { useReadContract } from 'wagmi';
import { CHAINLINK_PRICE_FEEDS, PRICE_FEED_ABI } from '../constants';
import { formatUnits } from 'viem';

/**
 * useTokenPrice Hook
 * Fetches the live USD price of a token using Chainlink Oracles.
 */
export function useTokenPrice(symbol = 'MATIC') {
    const feedAddress = CHAINLINK_PRICE_FEEDS[symbol];

    const { data: roundData, isLoading, isError } = useReadContract({
        address: feedAddress,
        abi: PRICE_FEED_ABI,
        functionName: 'latestRoundData',
        query: {
            enabled: !!feedAddress,
            staleTime: 60000, // Cache for 1 minute
        }
    });

    const price = roundData ? Number(formatUnits(roundData[1], 8)) : 0;

    const convertToUsd = (amount, decimals = 18) => {
        if (!price || !amount) return 0;
        const normalizedAmount = Number(formatUnits(amount, decimals));
        return (normalizedAmount * price);
    };

    return {
        price,
        convertToUsd,
        isLoading,
        isError
    };
}
