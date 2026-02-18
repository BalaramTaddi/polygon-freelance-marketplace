import { useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { toast } from 'react-toastify';

/**
 * useOptimisticTransaction Hook
 * Manages UI state for blockchain transactions, providing instant feedback
 * while Antigravity confirms the block in the background.
 */
export function useOptimisticTransaction() {
    const [isPending, setIsPending] = useState(false);
    const [optimisticState, setOptimisticState] = useState({});
    const publicClient = usePublicClient();

    const executeOptimistic = useCallback(async ({
        mutationFn,
        optimisticData,
        onSuccess,
        onError,
        onConfirmed,
        transactionLabel = "Transaction"
    }) => {
        setIsPending(true);

        // 1. Instantly update UI with optimistic data
        if (optimisticData) {
            setOptimisticState(prev => ({ ...prev, ...optimisticData }));
            toast.info(`⚡ ${transactionLabel} submitted!`, {
                toastId: 'optimistic-toast',
                autoClose: 2000,
                theme: 'dark'
            });
        }

        try {
            // 2. Call the actual mutation (signature request)
            const hash = await mutationFn();

            // Call success callback immediately after signature (optional)
            if (onSuccess) onSuccess(hash);

            // 3. Wait for confirmation in background
            // Antigravity is fast, so this usually takes < 1s
            const receipt = await publicClient.waitForTransactionReceipt({
                hash,
                confirmations: 1 // Optimization for Antigravity's high speed
            });

            if (receipt.status === 'success') {
                if (onConfirmed) onConfirmed(receipt);
                toast.update('optimistic-toast', {
                    render: `${transactionLabel} confirmed on-chain!`,
                    type: 'success',
                    isLoading: false,
                    autoClose: 5000
                });
            } else {
                throw new Error("Transaction reverted on-chain");
            }

        } catch (error) {
            console.error(`[OPTIMISTIC ERROR] ${transactionLabel}:`, error);

            // 4. Rollback optimistic state on failure
            if (optimisticData) {
                setOptimisticState(prev => {
                    const newState = { ...prev };
                    Object.keys(optimisticData).forEach(key => delete newState[key]);
                    return newState;
                });
            }

            toast.update('optimistic-toast', {
                render: `${transactionLabel} failed: ${error.message}`,
                type: 'error',
                isLoading: false,
                autoClose: 5000
            });

            if (onError) onError(error);
        } finally {
            setIsPending(false);
        }
    }, [publicClient]);

    return {
        executeOptimistic,
        isPending,
        optimisticState
    };
}
