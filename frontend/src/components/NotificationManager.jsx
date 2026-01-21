import { useWatchContractEvent, useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS } from '../constants';
import { useQueryClient } from '@tanstack/react-query';

export function NotificationManager() {
    const { address } = useAccount();
    const queryClient = useQueryClient();

    // Helper to refresh all contract related data
    const refreshData = () => {
        queryClient.invalidateQueries();
    };

    // Watch JobCreated
    useWatchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        eventName: 'JobCreated',
        onLogs(logs) {
            logs.forEach((log) => {
                const { jobId, client, freelancer } = log.args;
                if (address && (address.toLowerCase() === client.toLowerCase() || address.toLowerCase() === freelancer.toLowerCase())) {
                    toast.success(`Job #${jobId} Created Successfully! 🚀`, {
                        autoClose: 5000,
                    });
                }
                refreshData();
            });
        },
    });

    // Watch JobAccepted
    useWatchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        eventName: 'JobAccepted',
        onLogs(logs) {
            logs.forEach((log) => {
                const { jobId } = log.args;
                toast.success(`Job #${jobId} Accepted & Stake Secured! 🛡️`, {
                    autoClose: 5000,
                });
                refreshData();
            });
        },
    });

    // Watch WorkSubmitted
    useWatchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        eventName: 'WorkSubmitted',
        onLogs(logs) {
            logs.forEach((log) => {
                const { jobId } = log.args;
                toast.info(`Work submitted for Job #${jobId}! 📑`, {
                    autoClose: 5000,
                });
                refreshData();
            });
        },
    });

    // Watch FundsReleased
    useWatchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        eventName: 'FundsReleased',
        onLogs(logs) {
            logs.forEach((log) => {
                const { jobId, freelancer } = log.args;
                if (address && address.toLowerCase() === freelancer.toLowerCase()) {
                    toast.success(`Funds for Job #${jobId} Received! 💰`, {
                        autoClose: 6000,
                    });
                } else {
                    toast.success(`Funds released for Job #${jobId}! ✅`);
                }
                refreshData();
            });
        },
    });

    // Watch JobDisputed
    useWatchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        eventName: 'JobDisputed',
        onLogs(logs) {
            logs.forEach((log) => {
                const { jobId } = log.args;
                toast.error(`Job #${jobId} has been disputed! ⚖️`, {
                    autoClose: 10000,
                });
                refreshData();
            });
        },
    });

    return null;
}
