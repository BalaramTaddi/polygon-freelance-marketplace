import { useWriteContract, useAccount, usePublicClient } from 'wagmi';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS } from '../constants';
import { uploadJSONToIPFS } from '../utils/ipfs';
import { toast } from 'react-toastify';

/**
 * Hook for Decentralized Arbitration (Kleros-style)
 * Enables raising disputes and submitting evidence (including XMTP logs)
 */
export function useArbitration() {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();

    /**
     * Raise a dispute for a job
     * @param {number} jobId 
     */
    const raiseDispute = async (jobId) => {
        try {
            // 1. Get Arbitrator address from Escrow
            const arbitrator = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: FreelanceEscrowABI.abi,
                functionName: 'arbitrator',
            });

            // 2. Get Cost from Arbitrator
            let cost = 0n;
            if (arbitrator !== '0x0000000000000000000000000000000000000000') {
                try {
                    cost = await publicClient.readContract({
                        address: arbitrator,
                        abi: [{
                            name: 'arbitrationCost',
                            type: 'function',
                            stateMutability: 'view',
                            inputs: [{ type: 'bytes', name: '_extraData' }],
                            outputs: [{ type: 'uint256', name: 'fee' }]
                        }],
                        functionName: 'arbitrationCost',
                        args: ["0x"]
                    });
                } catch (e) {
                    console.warn('[ARBITRATION] Could not fetch cost, using 0', e);
                }
            }

            const tx = await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: FreelanceEscrowABI.abi,
                functionName: 'raiseDispute',
                args: [BigInt(jobId)],
                value: cost
            });

            toast.success("Dispute raised. Waiting for arbitration.");
            return tx;
        } catch (error) {
            console.error('[ARBITRATION] Failed to raise dispute:', error);
            toast.error("Failed to raise dispute: " + error.message);
            throw error;
        }
    };

    /**
     * Submit evidence to the decentralized court
     * @param {number} jobId 
     * @param {object} evidenceData - JSON evidence data
     */
    const submitEvidence = async (jobId, evidenceData) => {
        try {
            toast.info("Uploading evidence to IPFS...");
            const cid = await uploadJSONToIPFS(evidenceData);

            const tx = await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: FreelanceEscrowABI.abi,
                functionName: 'submitEvidence',
                args: [BigInt(jobId), cid]
            });

            toast.success("Evidence submitted to on-chain court.");
            return tx;
        } catch (error) {
            console.error('[ARBITRATION] Failed to submit evidence:', error);
            toast.error("Evidence submission failed.");
            throw error;
        }
    };

    /**
     * Specifically formats and submits XMTP chat logs as evidence
     * @param {number} jobId 
     * @param {Array} messages - XMTP message objects
     * @param {string} partyRole - 'client' or 'freelancer'
     */
    const submitChatLogsAsEvidence = async (jobId, messages, partyRole) => {
        const formattedLogs = messages.map(m => ({
            from: m.senderAddress,
            content: m.content || m.fallback || "Media/Attachment",
            timestamp: m.sent?.getTime() || Date.now()
        }));

        const evidence = {
            jobId,
            type: 'Communication Log',
            platform: 'XMTP',
            party: partyRole,
            submitter: address,
            data: formattedLogs,
            description: `Official chat logs between client and freelancer for Job #${jobId}`
        };

        return submitEvidence(jobId, evidence);
    };

    return {
        raiseDispute,
        submitEvidence,
        submitChatLogsAsEvidence
    };
}
