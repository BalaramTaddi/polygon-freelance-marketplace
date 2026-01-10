import React, { useEffect } from 'react';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { Wallet, Briefcase, CheckCircle, Clock, Save, User, Award, PlusCircle } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS } from '../constants';
import { api } from '../services/api';
import LiveJobFeed from './LiveJobFeed';

function Dashboard() {
    const { address, isConnected } = useAccount();

    useEffect(() => {
        console.log('[DASHBOARD] Account State:', { address, isConnected });
    }, [address, isConnected]);
    const [profile, setProfile] = React.useState({ name: '', bio: '', skills: '', category: 'Development' });
    const [analytics, setAnalytics] = React.useState({ totalJobs: 0, totalVolume: 0, totalUsers: 0 });
    const [isSaving, setIsSaving] = React.useState(false);
    const { signMessageAsync } = useSignMessage();

    const { data: jobCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'jobCount',
    });

    React.useEffect(() => {
        if (isConnected && address) {
            api.getProfile(address).then(data => {
                if (data.address) setProfile(data);
            });
            api.getAnalytics().then(data => {
                if (data && data.totalJobs !== undefined) setAnalytics(data);
            });
        }
    }, [isConnected, address]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { nonce } = await api.getNonce(address);
            if (!nonce) throw new Error('Could not get nonce');
            const message = `Login to PolyLance: ${nonce}`;
            const signature = await signMessageAsync({ message });
            await api.updateProfile({ address, ...profile, signature, message });
            alert('Profile updated securely!');
        } catch (err) {
            console.error(err);
            alert('Failed to update profile: ' + (err.shortMessage || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade">
                <div className="glass-card max-w-lg p-12">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <Wallet size={40} className="text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Connect to the Future</h2>
                    <p className="text-text-muted text-lg mb-8 leading-relaxed">
                        PolyLance is for the bold. Connect your wallet to manage your decentralized career, track earnings, and explore global opportunities.
                    </p>
                    <button className="btn-primary">
                        Get Started Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade">
            <header className="mb-12">
                <div className="flex items-center gap-4 mb-3">
                    <span className="badge badge-info">{profile.skills ? 'Certified Talent' : 'Employer'}</span>
                    {profile.reputationScore > 500 && (
                        <span className="badge badge-warning">✨ Elite Freelancer</span>
                    )}
                </div>
                <h1 className="text-5xl font-extrabold mb-4 leading-tight">
                    Welcome back, <span className="gradient-text">{profile.name || 'Pioneer'}</span>
                </h1>
                <p className="text-text-muted text-xl max-w-2xl leading-relaxed">
                    The decentralized workforce is at your fingertips. Monitor your contracts, analyze your growth, and stay ahead of the curve.
                </p>
            </header>

            <div className="grid grid-marketplace mb-12">
                <div className="glass-card border-l-4 border-primary">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-text-dim uppercase tracking-widest">Active Contracts</span>
                        <Briefcase size={20} className="text-primary" />
                    </div>
                    <div className="text-4xl font-bold mb-2">{jobCount?.toString() || '0'}</div>
                    <div className="text-sm font-medium text-accent">Total Job History</div>
                </div>

                <div className="glass-card border-l-4 border-warning" style={{ '--tw-border-opacity': 1, borderColor: '#f59e0b' }}>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-text-dim uppercase tracking-widest">Reputation Rank</span>
                        <Award size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="text-4xl font-bold mb-2">{profile.reputationScore || 0}</div>
                    <div className="text-sm font-medium text-text-muted">Top {profile.reputationScore > 500 ? '1%' : '10%'} World Rank</div>
                </div>

                <div className="glass-card border-l-4 border-accent">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-text-dim uppercase tracking-widest">Aggregate Earnings</span>
                        <CheckCircle size={20} className="text-accent" />
                    </div>
                    <div className="text-4xl font-bold mb-2">
                        {profile.totalEarned?.toFixed(2) || '0.00'}
                        <span className="text-base font-medium text-text-dim ml-2">MATIC</span>
                    </div>
                    <div className="text-sm font-medium text-accent">Secured via Smart Escrow</div>
                </div>
            </div>

            <div className="glass-panel mb-12 flex flex-wrap gap-8 items-center justify-between">
                <div className="flex gap-12">
                    <div>
                        <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Global Volume</p>
                        <p className="text-lg font-bold">{(analytics.totalVolume || 0).toFixed(2)} MATIC</p>
                    </div>
                    <div className="w-px h-10 bg-white/5" />
                    <div>
                        <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Ecosystem Jobs</p>
                        <p className="text-lg font-bold">{analytics.totalJobs || 0}</p>
                    </div>
                    <div className="w-px h-10 bg-white/5" />
                    <div>
                        <p className="text-[10px] font-bold text-text-dim uppercase mb-1">Platform Users</p>
                        <p className="text-lg font-bold">{analytics.totalUsers || 0}</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setPortfolioAddress(address)} className="btn-ghost !py-2 !px-4 flex items-center gap-2">
                        <User size={16} /> My Portfolio
                    </button>
                    <button className="btn-primary !py-2 !px-4">
                        <PlusCircle size={16} /> New Job
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <User size={20} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Identity & Credentials</h3>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="input-group">
                                <label className="input-label">Public Alias</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={profile.name}
                                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                                    placeholder="Enter your professional name"
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Core Specialization</label>
                                <select
                                    className="input-field"
                                    value={profile.category}
                                    onChange={e => setProfile({ ...profile, category: e.target.value })}
                                >
                                    <option>Development</option>
                                    <option>Design</option>
                                    <option>Marketing</option>
                                    <option>Writing</option>
                                    <option>AI Services</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Professional Bio</label>
                            <textarea
                                className="input-field min-h-[140px]"
                                value={profile.bio}
                                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                                placeholder="Highlight your expertise and career achievements..."
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Skillset Matrix (Comma Separated)</label>
                            <input
                                type="text"
                                className="input-field"
                                value={profile.skills}
                                onChange={e => setProfile({ ...profile, skills: e.target.value })}
                                placeholder="e.g. Solidity, React, Rust, UI/UX"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary w-full md:w-auto"
                            disabled={isSaving}
                        >
                            <Save size={18} /> {isSaving ? 'Syncing to Blockchain...' : 'Update On-chain Profile'}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-24">
                        <h3 className="text-lg font-bold mb-4 opacity-60 uppercase tracking-widest text-center">Live Opportunity Flow</h3>
                        <LiveJobFeed />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
