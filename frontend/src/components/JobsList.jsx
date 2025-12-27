import React from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Briefcase, CheckCircle, ExternalLink, RefreshCcw } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS } from '../constants';


function JobsList() {
    const { address } = useAccount();
    const { data: jobCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'jobCount',
    });

    // For a real app, we'd use a subgraph or indexer. 
    // Here we'll iterate through jobs which is fine for small count.
    const jobs = [];
    const count = jobCount ? Number(jobCount) : 0;

    // We need a helper to read all jobs, but wagmi doesn't easily support dynamic counts in one hook.
    // In a real scenario, we'd use useReadContracts for better performance.

    return (
        <div>
            <h1 style={{ marginBottom: '30px' }}>Manage Jobs</h1>
            <div className="grid">
                {count === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No jobs found on this contract.</p>
                ) : (
                    Array.from({ length: count }).map((_, i) => (
                        <JobCard key={i + 1} jobId={i + 1} />
                    ))
                )}
            </div>
        </div>
    );
}

function JobCard({ jobId }) {
    const { address } = useAccount();
    const { data: job, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'jobs',
        args: [BigInt(jobId)],
    });

    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    React.useEffect(() => {
        if (isSuccess) refetch();
    }, [isSuccess]);

    if (!job) return null;

    const [id, client, freelancer, amount, status, resultUri, paid] = job;
    const statusLabels = ['Created', 'Ongoing', 'Completed', 'Disputed', 'Cancelled'];

    const isClient = address?.toLowerCase() === client.toLowerCase();
    const isFreelancer = address?.toLowerCase() === freelancer.toLowerCase();

    const handleRelease = () => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: FreelanceEscrowABI.abi,
            functionName: 'releaseFunds',
            args: [BigInt(jobId)],
        });
    };

    const handleSubmit = () => {
        const uri = prompt('Enter your work result URI (IPFS link):');
        if (!uri) return;
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: FreelanceEscrowABI.abi,
            functionName: 'submitWork',
            args: [BigInt(jobId), uri],
        });
    };

    return (
        <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span className="badge">{statusLabels[status]}</span>
                <span style={{ fontWeight: '600' }}>{formatEther(amount)} MATIC</span>
            </div>

            <h3 style={{ marginBottom: '10px' }}>Job #{jobId}</h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                <p>Client: {client.slice(0, 6)}...{client.slice(-4)}</p>
                <p>Freelancer: {freelancer.slice(0, 6)}...{freelancer.slice(-4)}</p>
            </div>

            {resultUri && (
                <a
                    href={resultUri}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', marginBottom: '20px', textDecoration: 'none', fontSize: '0.9rem' }}
                >
                    <ExternalLink size={14} /> View Work Submission
                </a>
            )
            }

            <div style={{ display: 'flex', gap: '10px' }}>
                {isFreelancer && status < 2 && (
                    <button
                        onClick={handleSubmit}
                        className="btn-primary"
                        style={{ flex: 1 }}
                        disabled={isPending || isConfirming}
                    >
                        {isPending || isConfirming ? 'Processing...' : 'Submit Work'}
                    </button>
                )}

                {isClient && status === 1 && (
                    <button
                        onClick={handleRelease}
                        className="btn-primary"
                        style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        disabled={isPending || isConfirming}
                    >
                        {isPending || isConfirming ? 'Releasing...' : 'Approve & Pay'}
                    </button>
                )}
            </div>

            {
                status === 2 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginTop: '10px' }}>
                        <CheckCircle size={18} />
                        <span>Payment Released & NFT Minted</span>
                    </div>
                )
            }
        </div >
    );
}

export default JobsList;
