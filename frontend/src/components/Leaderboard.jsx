import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Trophy, Medal, Award, ExternalLink, User } from 'lucide-react';
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

    if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading the Hall of Fame...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>
                    Hall of <span className="gradient-text">Fame</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    Top performing creators and freelancers on the Polygon network.
                </p>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '20px', textAlign: 'left', color: 'var(--text-muted)' }}>RANK</th>
                            <th style={{ padding: '20px', textAlign: 'left', color: 'var(--text-muted)' }}>CREATOR</th>
                            <th style={{ padding: '20px', textAlign: 'left', color: 'var(--text-muted)' }}>SPECIALIZATION</th>
                            <th style={{ padding: '20px', textAlign: 'right', color: 'var(--text-muted)' }}>STRIKE RATE</th>
                            <th style={{ padding: '20px', textAlign: 'right', color: 'var(--text-muted)' }}>TOTAL EARNED</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaders.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No records found. Be the first to reach the top!
                                </td>
                            </tr>
                        ) : (
                            leaders.map((leader, index) => (
                                <motion.tr
                                    key={leader.address}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    style={{ borderBottom: '1px solid var(--glass-border)' }}
                                    className="leaderboard-row"
                                >
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {index === 0 && <Trophy size={20} color="#fbbf24" />}
                                            {index === 1 && <Medal size={20} color="#94a3b8" />}
                                            {index === 2 && <Award size={20} color="#b45309" />}
                                            <span style={{ fontWeight: 700, fontSize: '1.2rem', opacity: index > 2 ? 0.3 : 1 }}>
                                                {index + 1}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="activity-icon" style={{ width: '40px', height: '40px' }}>
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{leader.name || 'Anonymous Creator'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {leader.address.slice(0, 6)}...{leader.address.slice(-4)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <span className="badge">{leader.skills || 'Undefined'}</span>
                                    </td>
                                    <td style={{ padding: '20px', textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600 }}>{leader.completedJobs} Jobs</div>
                                        <div style={{ fontSize: '0.7rem', color: '#10b981' }}>100% SUCCESS</div>
                                    </td>
                                    <td style={{ padding: '20px', textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                                            {leader.totalEarned.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MATIC</span>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .leaderboard-row {
                    transition: background 0.3s ease;
                }
                .leaderboard-row:hover {
                    background: rgba(138, 43, 226, 0.05);
                }
            ` }} />
        </div>
    );
}

export default Leaderboard;
