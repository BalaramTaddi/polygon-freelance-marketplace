import React from 'react';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { Wallet, Briefcase, CheckCircle, Clock, Save, User, Award, PlusCircle } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS } from '../constants';
import { api } from '../services/api';

function Dashboard() {
    const { address, isConnected } = useAccount();
    const [profile, setProfile] = React.useState({ name: '', bio: '', skills: '', category: 'Development' });
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
        }
    }, [isConnected, address]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // 1. Get Nonce
            const { nonce } = await api.getNonce(address);
            if (!nonce) throw new Error('Could not get nonce');

            // 2. Sign Message
            const message = `Login to PolyLance: ${nonce}`;
            const signature = await signMessageAsync({ message });

            // 3. Update Profile with Signature
            await api.updateProfile({ address, ...profile, signature });
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
            <div className="glass-card" style={{ textAlign: 'center', marginTop: '100px' }}>
                <Wallet size={48} style={{ marginBottom: '20px', color: 'var(--primary)' }} />
                <h2>Connect your wallet to get started</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>
                    Manage your freelance jobs on Polygon with low fees and NFT proof-of-work.
                </p>
            </div>
        );
    }

    return (
        <div>
            <section className="hero">
                <h1>Workspace for <span className="gradient-text">Creators</span></h1>
                <p>
                    {profile.name ? `Welcome back, ${profile.name}. ` : 'Welcome to PolyLance. '}
                    Manage your decentralized career, track earnings, and explore new opportunities on Polygon.
                </p>
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <div className="badge" style={{ borderColor: 'var(--primary)', color: 'var(--primary)', border: '1px solid' }}>
                        {profile.skills ? 'Freelancer' : 'Client'}
                    </div>
                    <div className="badge">Verified Account</div>
                </div>
            </section>

            <div className="grid">
                <div className="glass-card stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>TOTAL CONTRACTS</p>
                            <div className="stat-value">{jobCount?.toString() || '0'}</div>
                            <p style={{ color: '#10b981', fontSize: '0.8rem' }}>+12% from last month</p>
                        </div>
                        <Briefcase size={24} color="var(--primary)" />
                    </div>
                </div>

                <div className="glass-card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>REPUTATION SCORE</p>
                            <div className="stat-value">{profile.reputationScore || 0}</div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Top {profile.reputationScore > 500 ? '1%' : '10%'} of talent</p>
                        </div>
                        <Award size={24} color="#f59e0b" />
                    </div>
                </div>

                <div className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>TOTAL EARNED</p>
                            <div className="stat-value">{profile.totalEarned?.toFixed(2) || '0.00'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>MATIC</span></div>
                            <p style={{ color: '#10b981', fontSize: '0.8rem' }}>Securely held in escrow</p>
                        </div>
                        <CheckCircle size={24} color="#10b981" />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                <div className="glass-card" style={{ flex: 1, padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Award size={20} color="var(--primary)" />
                    <div>
                        <div style={{ fontWeight: 600 }}>{profile.completedJobs || 0} Jobs Completed</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Proven track record on-chain</div>
                    </div>
                </div>
                <div className="glass-card" style={{ flex: 1, padding: '15px', border: '1px solid var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => window.location.hash = `portfolio`}>
                    <User size={20} color="var(--primary)" />
                    <div>
                        <div style={{ fontWeight: 600 }}>Public Portfolio</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>View your Proof-of-Work gallery →</div>
                    </div>
                </div>
            </div>

            <div className="grid" style={{ marginTop: '40px', gridTemplateColumns: '1.5fr 1fr' }}>
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
                        <User size={20} color="var(--primary)" />
                        <h3 style={{ margin: 0 }}>Professional Profile</h3>
                    </div>
                    <form onSubmit={handleSaveProfile}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>DISPLAY NAME</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={profile.name}
                                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                                    placeholder="e.g. Satoshi Nakamoto"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>BASE CATEGORY</label>
                                <select
                                    className="input-field"
                                    value={profile.category}
                                    onChange={e => setProfile({ ...profile, category: e.target.value })}
                                >
                                    <option>Development</option>
                                    <option>Design</option>
                                    <option>Marketing</option>
                                    <option>Writing</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>SKILLS (comma separated)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={profile.skills}
                                    onChange={e => setProfile({ ...profile, skills: e.target.value })}
                                    placeholder="React, Solidity, UX"
                                />
                            </div>
                        </div>
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>BIO</label>
                            <textarea
                                className="input-field"
                                style={{ minHeight: '120px' }}
                                value={profile.bio}
                                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                                placeholder="Describe your background and professional experience..."
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isSaving} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Save size={18} /> {isSaving ? 'Syncing Profile...' : 'Sync to Database'}
                        </button>
                    </form>
                </div>

                <div className="glass-card">
                    <h3 style={{ marginBottom: '20px' }}>Recent Activity</h3>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="activity-item">
                            <div className="activity-icon">
                                <Wallet size={18} color="var(--primary)" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Wallet Connected Successfully</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Just now • Polygon Network</p>
                            </div>
                        </div>
                        <div className="activity-item" style={{ opacity: 0.5 }}>
                            <div className="activity-icon">
                                <PlusCircle size={18} />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Welcome to PolyLance</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Get started by exploring jobs</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
