import React, { useEffect, useState, useRef } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    Activity, Users, Briefcase, DollarSign, TrendingUp,
    PieChart as PieIcon, Loader2, Globe
} from 'lucide-react';
import { api } from '../services/api';
import { useAnimeAnimations } from '../hooks/useAnimeAnimations';

const COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316'];
const cardBg = { padding: 32, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' };
const dimLabel = { fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 4 };

export default function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const statRefs = useRef([]);
    const { countUp, staggerFadeIn, revealOnScroll } = useAnimeAnimations();

    useEffect(() => { fetchAnalytics(); }, []);
    const fetchAnalytics = async () => {
        try { const stats = await api.getAnalytics(); setData(stats); }
        catch (error) { console.error('Failed to fetch analytics:', error); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (!loading && data) {
            staggerFadeIn('.analytics-stat-card', 100);
            revealOnScroll('.analytics-reveal');

            // Animate numbers
            statRefs.current.forEach((el) => {
                if (el) {
                    const val = parseFloat(el.getAttribute('data-value').replace(/[^0-9.]/g, ''));
                    if (!isNaN(val)) countUp(el, val, 2000);
                }
            });
        }
    }, [loading, data]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
            <Loader2 size={40} style={{ color: 'var(--accent-light)', animation: 'spin 1s linear infinite' }} />
            <p style={dimLabel}>Synchronizing Neural Data...</p>
        </div>
    );

    const statColors = ['#34d399', '#60a5fa', 'var(--accent-light)', '#a855f7'];
    const stats = [
        { label: 'Total Value Locked', value: `$${parseFloat(data.tvl || 0).toLocaleString()}`, icon: DollarSign, color: statColors[0] },
        { label: 'Network Citizens', value: data.totalUsers, icon: Users, color: statColors[1] },
        { label: 'Active Contracts', value: data.totalJobs, icon: Briefcase, color: statColors[2] },
        { label: 'Total Ecosystem Volume', value: `$${parseFloat(data.totalVolume || 0).toLocaleString()}`, icon: Activity, color: statColors[3] },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 48 }}>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {stats.map((stat, i) => (
                    <div key={i} className="analytics-stat-card"
                        style={{ ...cardBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.3s ease', opacity: 0, transform: 'translateY(20px)' }}>
                        <div>
                            <p style={dimLabel}>{stat.label}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
                                {stat.label.includes('Value') || stat.label.includes('Volume') ? '$' : ''}
                                <span ref={el => statRefs.current[i] = el} data-value={stat.value}>0</span>
                            </h3>
                        </div>
                        <div style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.04)', color: stat.color }}>
                            <stat.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                {/* Growth Trends */}
                <div className="analytics-reveal"
                    style={{ ...cardBg, height: 400, display: 'flex', flexDirection: 'column', opacity: 0, transform: 'translateY(30px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={20} style={{ color: 'var(--accent-light)' }} /> Ecosystem Growth
                            </h3>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Daily contract creation volume</p>
                        </div>
                        <span style={{
                            padding: '4px 12px', borderRadius: 20,
                            background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.15)',
                            ...dimLabel, color: 'var(--accent-light)', marginBottom: 0,
                        }}>Live Metrics</span>
                    </div>
                    <div style={{ flex: 1, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trends}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#02040a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, fontWeight: 700 }}
                                    itemStyle={{ color: '#8b5cf6' }} />
                                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" animationDuration={2000} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="analytics-reveal"
                    style={{ ...cardBg, height: 400, display: 'flex', flexDirection: 'column', opacity: 0, transform: 'translateY(30px)' }}>
                    <div style={{ marginBottom: 32 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PieIcon size={20} style={{ color: 'var(--accent-light)' }} /> Sector Load
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Work distribution by category</p>
                    </div>
                    <div style={{ flex: 1, width: '100%', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.categoryDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {data.categoryDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#02040a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                        }}>
                            <span style={{ ...dimLabel, marginBottom: 0 }}>Global</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>RECAP</span>
                        </div>
                    </div>
                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {data.categoryDistribution.slice(0, 4).map((entry, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length] }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {entry.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Neural Insights */}
            <div className="analytics-reveal"
                style={{ ...cardBg, background: 'rgba(124,92,252,0.04)', borderColor: 'rgba(124,92,252,0.15)', opacity: 0, transform: 'translateY(30px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                    <div style={{
                        padding: 24, borderRadius: 40, background: 'rgba(124,92,252,0.12)',
                        color: 'var(--accent-light)', boxShadow: '0 25px 50px -12px rgba(124,92,252,0.2)', flexShrink: 0,
                    }}>
                        <Globe size={48} style={{ animation: 'spin 10s linear infinite' }} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{
                                padding: '2px 8px', borderRadius: 4, background: 'var(--accent-light)', color: '#fff',
                                fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase',
                            }}>AI Protocol</span>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>Neural Network Insight</h3>
                        </div>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem', lineHeight: 1.7, maxWidth: 700, fontWeight: 500 }}>
                            Synthesizing on-chain data: The PolyLance ecosystem is currently operating at{' '}
                            <span style={{ color: 'var(--accent-light)', fontWeight: 700 }}>SUPREME</span> efficiency.
                            Active contract volume has grown significantly in the last period, with a focus on{' '}
                            <span style={{ color: '#34d399', fontWeight: 700 }}>{data.categoryDistribution[0]?.name || 'High-Tier'}</span> projects.
                            Reputation synchronization across Neural Nodes is maintaining a network average of{' '}
                            <span style={{ color: '#60a5fa', fontWeight: 700 }}>{data.avgReputation.toFixed(1)}/100</span>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
