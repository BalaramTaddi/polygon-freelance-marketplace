import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { User, Briefcase, MapPin, Link as LinkIcon, Award, ExternalLink, Globe, Github, Twitter } from 'lucide-react';
import { motion } from 'framer-motion';

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

    if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading Portfolio...</div>;
    if (!data?.profile?.address) return <div style={{ textAlign: 'center', padding: '100px' }}>Profile not found.</div>;

    const { profile, jobs } = data;
    const completedJobs = jobs.filter(j => j.status === 'Completed' || j.status === 2); // Status 2 is Completed on-chain

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {onBack && (
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginBottom: '20px', fontWeight: 600 }}>
                    ← Back to App
                </button>
            )}

            <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
                {/* Profile Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div className="activity-icon" style={{ width: '100px', height: '100px', margin: '0 auto 20px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))' }}>
                            <User size={48} color="#fff" />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{profile.name || 'Anonymous Creator'}</h2>
                        <p className="badge" style={{ marginBottom: '20px' }}>{profile.skills || 'General Creator'}</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                            <div className="glass-card" style={{ padding: '15px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{profile.completedJobs}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>JOBS</div>
                            </div>
                            <div className="glass-card" style={{ padding: '15px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{profile.totalEarned.toFixed(1)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MATIC</div>
                            </div>
                        </div>

                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '30px', fontSize: '0.95rem' }}>
                            {profile.bio || "This creator hasn't added a bio yet. Their work on PolyLance speaks for itself."}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                            <Globe size={20} className="btn-nav" style={{ cursor: 'pointer' }} />
                            <Github size={20} className="btn-nav" style={{ cursor: 'pointer' }} />
                            <Twitter size={20} className="btn-nav" style={{ cursor: 'pointer' }} />
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
                </div>

                {/* Main Content: Proof of Work */}
                <div>
                    <h2 style={{ marginBottom: '30px', fontSize: '2rem' }}>Proof of <span className="gradient-text">Work</span></h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {completedJobs.length === 0 ? (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '80px' }}>
                                <Briefcase size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
                                <p style={{ color: 'var(--text-muted)' }}>No completed jobs found for this creator yet.</p>
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
                                                <Award size={14} /> NFT Minted
                                            </div>
                                            <a href={`https://polygonscan.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Verify on Chain <ExternalLink size={12} />
                                            </a>
                                        </div>
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
