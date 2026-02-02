import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Lock,
    Unlock,
    AlertCircle,
    CheckCircle2,
    Search,
    Filter,
    LayoutDashboard,
    ArrowUpRight,
    Clock,
    Shield
} from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS } from '../constants';
import { api } from '../services/api';
import { formatUnits } from 'viem';

const statusMap = {
    0: { label: 'Created', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Clock },
    1: { label: 'Accepted', color: 'text-indigo-400', bg: 'bg-indigo-400/10', icon: Activity },
    2: { label: 'Ongoing', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Activity },
    3: { label: 'Disputed', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: AlertCircle },
    4: { label: 'Arbitration', color: 'text-purple-400', bg: 'bg-purple-400/10', icon: Shield },
    5: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
    6: { label: 'Cancelled', color: 'text-gray-400', bg: 'bg-gray-400/10', icon: Lock },
};

const ManagerDashboard = () => {
    const { address } = useAccount();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: jobCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'jobCount',
    });

    useEffect(() => {
        const fetchJobs = async () => {
            if (!address) return;
            setLoading(true);
            try {
                const metadataList = await api.getJobsMetadata();
                // Filter to show jobs where user is client or freelancer
                const userJobs = metadataList.filter(j =>
                    j.client?.toLowerCase() === address.toLowerCase() ||
                    j.freelancer?.toLowerCase() === address.toLowerCase()
                );
                setJobs(userJobs);
            } catch (err) {
                console.error('Failed to fetch manager data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, [address]);

    const stats = {
        active: jobs.filter(j => j.status <= 2).length,
        funded: jobs.reduce((acc, j) => acc + (j.amount || 0), 0),
        disputed: jobs.filter(j => j.status === 3).length,
        completed: jobs.filter(j => j.status === 5).length
    };

    const filteredJobs = jobs.filter(j => {
        const matchesStatus = filterStatus === 'All' || statusMap[j.status]?.label === filterStatus;
        const matchesSearch = j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            j.id?.toString().includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="container !p-0 space-y-12">
            <header>
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <LayoutDashboard size={32} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter uppercase italic">Escrow <span className="text-primary">Manager</span></h1>
                        <p className="text-text-muted font-bold tracking-widest text-[10px] uppercase">Real-time Smart Contract Monitoring</p>
                    </div>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Escrows', value: stats.active, icon: Activity, color: 'text-primary' },
                    { label: 'Total TVL', value: `${stats.funded.toFixed(2)} MATIC`, icon: Lock, color: 'text-emerald-400' },
                    { label: 'In Dispute', value: stats.disputed, icon: AlertCircle, color: 'text-rose-400' },
                    { label: 'Success Rate', value: `${jobs.length ? Math.round((stats.completed / jobs.length) * 100) : 0}%`, icon: CheckCircle2, color: 'text-indigo-400' },
                ].map((s, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="glass-card !p-6 border-white/5 bg-white/5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-white/5 ${s.color}`}>
                                <s.icon size={20} />
                            </div>
                            <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Live</span>
                        </div>
                        <div className="text-2xl font-black mb-1">{s.value}</div>
                        <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{s.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                    {['All', 'Created', 'Ongoing', 'Disputed', 'Completed'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-text-muted hover:bg-white/10'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
                    <input
                        type="text"
                        placeholder="Search Escrow ID or Title..."
                        className="input-field !pl-12 !py-2 text-xs w-64"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Escrow List */}
            <div className="glass-card !p-0 border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/2">
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-text-dim">Escrow ID</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-text-dim">Project</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-text-dim">Locked Value</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-text-dim">Status</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-text-dim">Progress</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-text-dim">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-6"><div className="h-4 bg-white/5 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <p className="text-text-dim font-bold uppercase tracking-widest text-xs">No matching escrows found.</p>
                                    </td>
                                </tr>
                            ) : filteredJobs.map((job) => {
                                const StatusIcon = statusMap[job.status]?.icon || Clock;
                                return (
                                    <motion.tr
                                        key={job.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="p-6">
                                            <span className="font-mono text-xs opacity-50">#{job.id}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-white">{job.title}</span>
                                                <span className="text-[10px] text-text-dim">{job.category}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="font-black text-sm">{job.amount} MATIC</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusMap[job.status]?.bg}`}>
                                                <StatusIcon size={12} className={statusMap[job.status]?.color} />
                                                <span className={`text-[10px] font-black uppercase tracking-tighter ${statusMap[job.status]?.color}`}>
                                                    {statusMap[job.status]?.label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{ width: `${job.status === 5 ? 100 : job.status >= 2 ? 60 : 20}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <button className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-white transition-all">
                                                <ArrowUpRight size={16} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManagerDashboard;
