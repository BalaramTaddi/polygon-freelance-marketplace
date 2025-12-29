import React from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle, ExternalLink, RefreshCcw } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS } from '../constants';
import { api } from '../services/api';
import UserLink from './UserLink';


const statusLabels = ['Created', 'Accepted', 'Ongoing', 'Disputed', 'Completed', 'Cancelled'];

function JobsList({ onUserClick }) {
    const { address } = useAccount();
    const [filter, setFilter] = React.useState('All');
    const { data: jobCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'jobCount',
    });

    const count = jobCount ? Number(jobCount) : 0;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Manage Jobs</h1>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <select
                        className="input-field"
                        style={{ width: '150px', margin: 0 }}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option>All</option>
                        <option>Development</option>
                        <option>Design</option>
                        <option>Marketing</option>
                        <option>Writing</option>
                    </select>
                </div>
            </div>

            <div className="grid">
                {count === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '60px', gridColumn: '1 / -1' }}>
                        <Briefcase size={48} style={{ color: 'var(--text-muted)', marginBottom: '20px', opacity: 0.5 }} />
                        <h3 style={{ color: 'var(--text-muted)' }}>No jobs published yet</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Be the first to post a new gig on the marketplace.</p>
                    </div>
                ) : (
                    Array.from({ length: count }).map((_, i) => (
                        <motion.div
                            key={i + 1}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <JobCard jobId={i + 1} categoryFilter={filter} onUserClick={onUserClick} />
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}

function JobCard({ jobId, categoryFilter, onUserClick }) {
    const { address } = useAccount();
    const [metadata, setMetadata] = React.useState(null);
    const { data: job, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'jobs',
        args: [BigInt(jobId)],
    });

    const { data: arbitrator } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'arbitrator',
    });

    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    React.useEffect(() => {
        if (isSuccess) refetch();
    }, [isSuccess]);

    React.useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const data = await api.getJobMetadata(jobId);
                setMetadata(data);
            } catch (err) {
                console.error('Failed to fetch metadata:', err);
            }
        };
        fetchMetadata();
    }, [jobId]);

    if (!job) return null;

    const [id, client, freelancer, amount, freelancerStake, status, resultUri, paid] = job;

    // Filter logic
    if (categoryFilter !== 'All' && metadata?.category !== categoryFilter) {
        return null;
    }

    const isClient = address?.toLowerCase() === client.toLowerCase();
    const isFreelancer = address?.toLowerCase() === freelancer.toLowerCase();
    const isArbitrator = address?.toLowerCase() === arbitrator?.toLowerCase();

    const handleAccept = () => {
        const stake = (amount * 10n) / 100n;
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: FreelanceEscrowABI.abi,
            functionName: 'acceptJob',
            args: [BigInt(jobId)],
            value: stake,
        });
    };

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

    const handleResolve = (winnerAddr) => {
        const freelancerPay = winnerAddr.toLowerCase() === freelancer.toLowerCase() ? (amount + freelancerStake) : 0n;
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: FreelanceEscrowABI.abi,
            functionName: 'resolveDispute',
            args: [BigInt(jobId), winnerAddr, freelancerPay],
        });
    };

    const handleDispute = () => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: FreelanceEscrowABI.abi,
            functionName: 'dispute',
            args: [BigInt(jobId)],
        });
    };

    return (
        <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span className={`badge ${status === 3 ? 'dispute-badge' : ''}`}>{statusLabels[status]}</span>
                <span style={{ fontWeight: '600' }}>{formatEther(amount)} MATIC</span>
            </div>

            <h3 style={{ marginBottom: '5px' }}>{metadata?.title || `Job #${jobId}`}</h3>
            {metadata?.category && (
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                    {metadata.category}
                </span>
            )}

            <p style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'var(--text)' }}>
                {metadata?.description || 'No description provided.'}
            </p>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                <p style={{ cursor: 'pointer' }} onClick={() => onUserClick(client)}>Client: <UserLink address={client} /></p>
                <p style={{ cursor: 'pointer' }} onClick={() => onUserClick(freelancer)}>Freelancer: <UserLink address={freelancer} /></p>
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
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {isFreelancer && status === 0 && (
                    <button onClick={handleAccept} className="btn-primary" style={{ flex: 1 }} disabled={isPending || isConfirming}>
                        {isPending || isConfirming ? 'Staking...' : 'Accept & Stake (10%)'}
                    </button>
                )}

                {isFreelancer && (status === 1 || status === 2) && (
                    <button onClick={handleSubmit} className="btn-primary" style={{ flex: 1 }} disabled={isPending || isConfirming}>
                        {isPending || isConfirming ? 'Processing...' : 'Submit Work'}
                    </button>
                )}

                {isClient && status === 2 && (
                    <button onClick={handleRelease} className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)' }} disabled={isPending || isConfirming}>
                        {isPending || isConfirming ? 'Releasing...' : 'Approve & Pay'}
                    </button>
                )}

                {(isClient || isFreelancer) && (status === 1 || status === 2) && (
                    <button onClick={handleDispute} className="btn-secondary" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }} disabled={isPending || isConfirming}>
                        Open Dispute
                    </button>
                )}

                {isArbitrator && status === 3 && (
                    <div style={{ width: '100%', display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => handleResolve(client)} className="btn-secondary" style={{ flex: 1 }}>Refund Client</button>
                        <button onClick={() => handleResolve(freelancer)} className="btn-primary" style={{ flex: 1 }}>Pay Freelancer</button>
                    </div>
                )}
            </div>

            {status === 4 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginTop: '10px' }}>
                    <CheckCircle size={18} />
                    <span>Success: Funds & Stake Distributed</span>
                </div>
            )}
        </div>
    );
}

export default JobsList;
