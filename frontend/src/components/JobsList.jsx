import React from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle, ExternalLink, RefreshCcw, AlertCircle, MessageSquare, Search, Filter, ArrowUpDown } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { formatEther, formatUnits, parseUnits, erc20Abi } from 'viem';
import { CONTRACT_ADDRESS, SUPPORTED_TOKENS } from '../constants';
import { api } from '../services/api';
import UserLink from './UserLink';
import { checkRiskLevel } from '../utils/riskMitigation';
import { useTransactionToast } from '../hooks/useTransactionToast';
import { uploadJSONToIPFS } from '../utils/ipfs';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { createBiconomySmartAccount, submitWorkGasless } from '../utils/biconomy';

const statusLabels = ['Created', 'Accepted', 'Ongoing', 'Disputed', 'Completed', 'Cancelled'];

function JobsList({ onUserClick, onSelectChat, gasless }) {
    const { address } = useAccount();
    const [filter, setFilter] = React.useState('All');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [minBudget, setMinBudget] = React.useState('');
    const [sortBy, setSortBy] = React.useState('Newest');
    const [statusFilter, setStatusFilter] = React.useState('All');

    const { data: jobCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'jobCount',
    });

    const count = jobCount ? Number(jobCount) : 0;
    const jobIds = Array.from({ length: count }, (_, i) => i + 1);
    if (sortBy === 'Newest') jobIds.reverse();

    const isLoading = jobCount === undefined;

    return (
        <div className="container" style={{ padding: 0 }}>
            {/* Advanced Filter Bar */}
            <header className="mb-12">
                <h1 className="text-5xl font-black mb-4 tracking-tighter">Global <span className="gradient-text">Opportunities</span></h1>
                <p className="text-text-muted font-medium opacity-80 max-w-xl">
                    Discover and secure high-value contracts on the most efficient freelance protocol.
                </p>
            </header>

            <div className="glass-card !border-white/5 hover:border-primary/20" style={{ marginBottom: '32px', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.8fr', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Search high-end gigs..."
                            className="input-field"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Filter size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <select
                            className="input-field"
                            style={{ paddingLeft: '40px', appearance: 'none' }}
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option>All Categories</option>
                            <option>Development</option>
                            <option>Design</option>
                            <option>Marketing</option>
                            <option>Writing</option>
                        </select>
                    </div>

                    <select
                        className="input-field"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="0">Open 🟢</option>
                        <option value="2">Ongoing ⏳</option>
                        <option value="4">Completed ✨</option>
                        <option value="3">Disputed ⚖️</option>
                    </select>

                    <div style={{ position: 'relative' }}>
                        <ArrowUpDown size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <select
                            className="input-field"
                            style={{ paddingLeft: '40px', appearance: 'none' }}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option>Newest</option>
                            <option>Oldest</option>
                            <option>Budget: High to Low</option>
                        </select>
                    </div>

                    <input
                        type="number"
                        placeholder="Min Budget"
                        className="input-field"
                        value={minBudget}
                        onChange={(e) => setMinBudget(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid-marketplace">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="glass-card skeleton skeleton-card !bg-white/5 opacity-50" />
                    ))
                ) : count === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '80px', gridColumn: '1 / -1' }}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px auto'
                            }}>
                                <Briefcase size={40} style={{ color: 'var(--primary)' }} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>No opportunities found</h2>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                                Be the pioneer. Post the first high-quality job and start building the future of decentralized work.
                            </p>
                        </motion.div>
                    </div>
                ) : (
                    jobIds.map((id, i) => (
                        <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.4 }}
                        >
                            <JobCard
                                jobId={id}
                                categoryFilter={filter}
                                searchQuery={searchQuery}
                                minBudget={minBudget}
                                statusFilter={statusFilter}
                                onUserClick={onUserClick}
                                onSelectChat={onSelectChat}
                                gasless={gasless}
                            />
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}

function JobCard({ jobId, categoryFilter, searchQuery, minBudget, statusFilter, onUserClick, onSelectChat, gasless }) {
    const { address } = useAccount();
    const signer = useEthersSigner();
    const [metadata, setMetadata] = React.useState(null);
    const [matchScore, setMatchScore] = React.useState(null);
    const [isApproving, setIsApproving] = React.useState(false);

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

    const { data: hash, writeContract, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    useTransactionToast(hash, isPending, isConfirming, isSuccess, error);

    React.useEffect(() => {
        if (isSuccess) refetch();
    }, [isSuccess]);

    React.useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const data = await api.getJobMetadata(jobId);
                setMetadata(data);

                if (address) {
                    const matches = await api.getJobMatches(jobId);
                    const myMatch = matches.find(m => m.address.toLowerCase() === address.toLowerCase());
                    if (myMatch) setMatchScore(myMatch.matchScore);
                }
            } catch (err) {
                console.error('Failed to fetch job metadata/matches:', err);
            }
        };
        fetchMetadata();
    }, [jobId, address]);

    if (!job) return null;

    const [id, client, freelancer, token, amount, freelancerStake, totalPaidOut, status, resultUri, paid, deadline, milestoneCount] = job;
    const tokenInfo = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === token.toLowerCase()) || SUPPORTED_TOKENS[0];
    const currency = tokenInfo.symbol;
    const decimals = tokenInfo.decimals;

    // Filter logic
    const categoryMatches = categoryFilter === 'All Categories' || categoryFilter === 'All' || metadata?.category === categoryFilter;
    const searchMatches = !searchQuery ||
        metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const budgetMatches = !minBudget || Number(formatUnits(amount, decimals)) >= Number(minBudget);
    const statusMatches = statusFilter === 'All' || status.toString() === statusFilter;

    if (!categoryMatches || !searchMatches || !budgetMatches || !statusMatches) return null;

    const isClient = address?.toLowerCase() === client.toLowerCase();
    const isFreelancer = address?.toLowerCase() === freelancer.toLowerCase();
    const isArbitrator = address?.toLowerCase() === arbitrator?.toLowerCase();

    const handleAccept = () => {
        const requiredStake = (amount * 10n) / 100n;
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: FreelanceEscrowABI.abi,
            functionName: 'acceptJob',
            args: [BigInt(jobId)],
            value: token === '0x0000000000000000000000000000000000000000' ? requiredStake : 0n,
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

    const handleSubmit = async () => {
        const text = prompt('Enter your work summary:');
        if (!text) return;

        let ipfsHash = text;
        try {
            ipfsHash = await uploadJSONToIPFS({
                type: 'work_submission',
                jobId,
                freelancer: address,
                content: text,
                timestamp: Date.now()
            });
        } catch (err) { console.error(err); }

        if (gasless && signer) {
            try {
                const smartAccount = await createBiconomySmartAccount(signer);
                if (smartAccount) {
                    await submitWorkGasless(smartAccount, CONTRACT_ADDRESS, FreelanceEscrowABI.abi, Number(jobId), ipfsHash);
                    refetch();
                    return;
                }
            } catch (err) {
                console.error('[BICONOMY] Gasless submission failed:', err);
            }
        }

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: FreelanceEscrowABI.abi,
            functionName: 'submitWork',
            args: [BigInt(jobId), ipfsHash],
        });
    };

    return (
        <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div className={`badge ${status === 3 ? 'badge-warning' : 'badge-info'}`}>
                    {statusLabels[status]}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                        {formatUnits(amount, decimals)} {currency}
                    </div>
                    {matchScore !== null && status === 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: '700', marginTop: '4px' }}>
                            ✨ {Math.round(matchScore * 100)}% Match
                        </div>
                    )}
                </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-main)' }}>
                {metadata?.title || `Premium Gig #${jobId}`}
            </h3>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                    {metadata?.category || 'General'}
                </span>
                {deadline > 0n && (
                    <span className="badge" style={{
                        background: Math.floor(Date.now() / 1000) > Number(deadline) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        color: Math.floor(Date.now() / 1000) > Number(deadline) ? 'var(--danger)' : 'var(--text-dim)',
                        fontSize: '0.7rem'
                    }}>
                        🕒 {new Date(Number(deadline) * 1000).toLocaleDateString()}
                    </span>
                )}
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px', flex: 1 }}>
                {metadata?.description?.slice(0, 160) || 'Secure decentralized work agreement with automated escrow protection.'}
                {metadata?.description?.length > 160 && '...'}
            </p>

            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(45deg, #6366f1, #a855f7)' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Client:</span>
                        <UserLink address={client} style={{ fontSize: '0.85rem' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: freelancer !== '0x0000000000000000000000000000000000000000' ? 'linear-gradient(45deg, #10b981, #3b82f6)' : '#334155' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Pro:</span>
                        {freelancer === '0x0000000000000000000000000000000000000000' ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Seeking...</span>
                        ) : (
                            <UserLink address={freelancer} style={{ fontSize: '0.85rem' }} />
                        )}
                    </div>
                    {/* Chat Button Integration */}
                    <button
                        onClick={() => onSelectChat(isClient ? freelancer : client)}
                        className="btn-ghost"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
                    >
                        <MessageSquare size={14} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
                {!isClient && !isFreelancer && status === 0 && (
                    <button onClick={handleAccept} className="btn-primary" style={{ width: '100%' }} disabled={isPending || isConfirming}>
                        Pick Gig
                    </button>
                )}

                {isFreelancer && (status === 1 || status === 2) && (
                    <button onClick={handleSubmit} className="btn-primary" style={{ width: '100%' }} disabled={isPending || isConfirming}>
                        Deliver Work
                    </button>
                )}

                {isClient && status === 2 && (
                    <button onClick={handleRelease} className="btn-primary" style={{ width: '100%', background: 'var(--accent)' }} disabled={isPending || isConfirming}>
                        Approve & Pay
                    </button>
                )}

                {status === 4 && (
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent)', fontWeight: '700' }}>
                        <CheckCircle size={20} /> Project Completed
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobsList;
