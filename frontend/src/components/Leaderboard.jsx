import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Trophy, Medal, Award, ExternalLink, User, Star, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getLeaderboard().then(data => {
            setLeaders(data);
            setLoading(false);
        });
    }, []);

    if (loading) return (
        <div className="container" style={{ maxWidth: '1200px', padding: '40px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                <div className="skeleton skeleton-title mx-auto" style={{ width: '400px', height: '60px' }} />
                <div className="skeleton skeleton-text mx-auto" style={{ width: '600px', marginTop: '20px' }} />
            </div>
            <div className="glass-card !border-white/5 opacity-50">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="skeleton h-16 w-full mb-2" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="animate-fade">
            <header className="mb-16 text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter shimmer-text">
                        The Elite
                    </h1>
                    <p className="text-text-muted text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                        Celebrating the world's most trusted decentralized creators and their mission-critical contributions.
                    </p>
                </motion.div>
            </header>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>RANKING</th>
                                <th style={{ padding: '24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>CREATOR</th>
                                <th style={{ padding: '24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>EXPERTISE</th>
                                <th style={{ padding: '24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>RATING</th>
                                <th style={{ padding: '24px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>REP SCORE</th>
                                <th style={{ padding: '24px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>TOTAL VOLUME</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        The leaderboard is awaiting its first legends.
                                    </td>
                                </tr>
                            ) : (
                                leaders.map((leader, index) => (
                                    <motion.tr
                                        key={leader.address}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.3s' }}
                                        className="leaderboard-row"
                                    >
                                        <td style={{ padding: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {index === 0 && <Trophy size={24} style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' }} />}
                                                    {index === 1 && <Medal size={24} style={{ color: '#cbd5e1' }} />}
                                                    {index === 2 && <Award size={24} style={{ color: '#b45309' }} />}
                                                    {index > 2 && <span style={{ fontWeight: 800, color: 'var(--text-dim)', opacity: 0.5 }}>{index + 1}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={24} color="white" />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', fontFamily: 'Outfit' }}>{leader.name || 'Elite Member'}</div>
                                                        {leader.reputationScore >= 10 && (
                                                            <div className="badge !px-2 !py-0.5 !text-[9px] !font-black !bg-gradient-to-r !from-amber-400 !to-orange-500 !text-black !border-none">SUPREME</div>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                                        {leader.address.slice(0, 10)}...{leader.address.slice(-6)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {leader.skills?.split(',').slice(0, 2).map((s, i) => (
                                                    <span key={i} className="badge" style={{ background: 'rgba(99, 102, 241, 0.08)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>{s.trim().toUpperCase()}</span>
                                                )) || <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>CREATOR</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            {leader.avgRating > 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Star size={14} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                                                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{leader.avgRating.toFixed(1)}</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '24px', textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                <TrendingUp size={16} />
                                                {leader.reputationScore || 0}
                                            </div>
                                        </td>
                                        <td style={{ padding: '24px', textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                                                {leader.totalEarned.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>USDC</span>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style sx={{ display: 'none' }}>{`
                .leaderboard-row:hover {
                    background: rgba(255, 255, 255, 0.02) !important;
                }
            `}</style>
        </div>
    );
}

export default Leaderboard;
