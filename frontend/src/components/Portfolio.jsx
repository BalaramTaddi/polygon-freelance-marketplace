import React, { useState, useEffect } from 'react';
import { User, Briefcase, MapPin, Link as LinkIcon, Award, ExternalLink, Globe, Github, Twitter, Zap, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReadContract } from 'wagmi';
import { erc20Abi, formatEther } from 'viem';
import { POLY_TOKEN_ADDRESS } from '../constants';
import { api } from '../services/api';
import Reputation3D from './Reputation3D';

function Portfolio({ address, onBack }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (address) {
            api.getPortfolio(address).then(res => {
                setData(res);
                setLoading(false);
            });
        }
    }, [address]);

    const { data: plnBalance } = useReadContract({
        address: POLY_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
    });

    if (loading) return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 0' }}>
            <div className="skeleton h-8 w-32 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="skeleton h-[600px] w-full" />
                <div className="md:col-span-2 space-y-8">
                    <div className="skeleton h-20 w-1/2" />
                    <div className="skeleton h-60 w-full" />
                    <div className="skeleton h-60 w-full" />
                </div>
            </div>
        </div>
    );

    if (!data?.profile?.address) return (
        <div className="flex flex-col items-center justify-center py-20">
            <User size={60} className="text-white/10 mb-6" />
            <h3 className="text-2xl font-bold">Profile not found</h3>
            <p className="text-text-muted mt-2">This address hasn't registered a PolyLance identity yet.</p>
            {onBack && <button onClick={onBack} className="mt-8 btn-ghost">Return to Marketplace</button>}
        </div>
    );

    const { profile, jobs } = data;
    const completedJobs = jobs.filter(j => j.status === 'Completed' || j.status === 2 || j.status === 4);

    // Calculate average rating
    const ratedJobs = completedJobs.filter(j => j.rating > 0);
    const avgRating = ratedJobs.length > 0
        ? (ratedJobs.reduce((acc, j) => acc + j.rating, 0) / ratedJobs.length).toFixed(1)
        : null;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
            {onBack && (
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-primary hover:text-white mb-10 group transition-all"
                    style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.15em' }}
                >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Marketplace
                </button>
            )}

            <div className="grid-portfolio" style={{ display: 'grid', gap: '40px' }}>
                {/* Profile Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ width: '100%', height: '200px', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(138, 43, 226, 0.1)', borderRadius: '20px' }}>
                            {/* <Reputation3D level={Math.floor((profile.reputationScore || 0) / 100) + 1} /> */}
                            <User size={80} color="var(--primary)" style={{ opacity: 0.5 }} />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{profile.name || 'Anonymous Creator'}</h2>

                        {avgRating && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', color: '#fbbf24', marginBottom: '15px' }}>
                                {'★'.repeat(Math.round(avgRating))}
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '5px' }}>({avgRating})</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                            {profile.skills?.split(',').map((skill, idx) => (
                                <span key={idx} className="badge" style={{ border: '1px solid var(--primary)', color: 'var(--primary)', background: 'rgba(138, 43, 226, 0.05)', fontSize: '0.75rem' }}>
                                    {skill.trim()}
                                </span>
                            )) || <span className="badge">General Creator</span>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div className="glass-card" style={{ padding: '15px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{profile.completedJobs}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>JOBS</div>
                            </div>
                            <div className="glass-card" style={{ padding: '15px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{profile.totalEarned.toFixed(1)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MATIC</div>
                            </div>
                        </div>

                        <div className="glass-card !bg-primary/5 !border-primary/20 mb-8">
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '2px' }}>{profile.reputationScore || 0}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 800 }}>REPUTATION SCORE</div>
                        </div>

                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '30px', fontSize: '0.95rem' }}>
                            {profile.bio || "This creator hasn't added a bio yet. Their work on PolyLance speaks for itself."}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                            <a href="#" className="btn-nav" style={{ color: 'inherit' }} title="Website"><Globe size={20} /></a>
                            <a href="#" className="btn-nav" style={{ color: 'inherit' }} title="GitHub"><Github size={20} /></a>
                            <a href="#" className="btn-nav" style={{ color: 'inherit' }} title="Twitter"><Twitter size={20} /></a>
                        </div>
                    </div>

                    <div className="glass-card">
                        <h3 style={{ marginBottom: '20px' }}>Wallet Identity</h3>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', wordBreak: 'break-all', fontSize: '0.85rem', border: '1px solid var(--glass-border)' }}>
                            {profile.address}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Award size={14} /> Verified on Polygon
                        </p>
                    </div>

                    <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(34, 211, 238, 0.1))' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <Zap size={20} color="var(--accent-cyan)" /> Rewards & Stake
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>PLN Balance</span>
                                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                                    {plnBalance ? parseFloat(formatEther(plnBalance)).toFixed(0) : '0'} PLN
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Reputation</span>
                                <span style={{ fontWeight: 700 }}>{profile.reputationScore || 0} RP</span>
                            </div>
                            <button className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: '0.8rem', marginTop: '10px', background: 'var(--accent-cyan)' }}>
                                Stake PLN (Coming Soon)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content: Proof of Work */}
                <div>
                    <h2 style={{ marginBottom: '30px', fontSize: '2rem' }}>Proof of <span className="gradient-text">Work</span></h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {completedJobs.length === 0 ? (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '100px 40px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--glass-border)' }}>
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Briefcase size={64} style={{ opacity: 0.1, marginBottom: '24px', color: 'var(--primary)' }} />
                                    <h3 style={{ marginBottom: '10px', opacity: 0.5 }}>Future Success in Progress</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>This creator hasn't finalized any contracts yet. Stake on their potential today!</p>
                                </motion.div>
                            </div>
                        ) : (
                            completedJobs.map((job, i) => (
                                <motion.div
                                    key={job.jobId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="glass-card"
                                    style={{ display: 'flex', gap: '20px', alignItems: 'start' }}
                                >
                                    <div style={{ width: '120px', height: '120px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0 }}>
                                        <img
                                            src={`https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=300&q=80&sig=${job.jobId}`}
                                            alt="NFT Certificate"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <h3 style={{ margin: 0 }}>{job.title}</h3>
                                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none' }}>COMPLETED</span>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {job.description}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                                                <Award size={14} /> NFT Proof-of-Work
                                            </div>
                                            <a href={`https://polygonscan.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Check Ledger <ExternalLink size={12} />
                                            </a>
                                        </div>

                                        {job.review && (
                                            <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: '3px solid #fbbf24' }}>
                                                <div style={{ color: '#fbbf24', fontSize: '0.8rem', marginBottom: '4px' }}>
                                                    {'★'.repeat(job.rating)} Verified Review
                                                </div>
                                                <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text)' }}>
                                                    "{job.review}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Portfolio;
