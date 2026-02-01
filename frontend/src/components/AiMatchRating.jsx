import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, TrendingUp, AlertCircle, Zap } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:3001/api';

/**
 * AiMatchRating Component
 * Displays a beautiful, AI-powered match score and reasoning for a specific job/freelancer pair.
 */
const AiMatchRating = ({ jobId, freelancerAddress }) => {
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMatch = async () => {
            try {
                // Fetch direct synergy score between freelancer and job via Gemini 2.0
                const response = await axios.get(`${API_BASE_URL}/match/${jobId}/${freelancerAddress}`);
                setMatch(response.data);
            } catch (err) {
                console.error('AI Match Fetch Error:', err);
                setError('AI Match unavailable');
            } finally {
                setLoading(false);
            }
        };

        if (jobId && freelancerAddress) {
            fetchMatch();
        }
    }, [jobId, freelancerAddress]);

    if (loading) return (
        <div className="flex items-center space-x-2 text-sm text-gray-500 animate-pulse">
            <Sparkles size={14} className="text-purple-500" />
            <span>AI Analyzing...</span>
        </div>
    );

    if (error || !match) return null;

    const getScoreColor = (score) => {
        if (score >= 0.8) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        if (score >= 0.5) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
        return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
    };

    return (
        <div className={`mt-3 p-4 rounded-xl border transition-all duration-300 ${getScoreColor(match.score)}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-white/10">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest block opacity-70">Gemini Strategic Match</span>
                        <span className="text-xs font-bold leading-none">{match.riskLevel} Risk Profile</span>
                    </div>
                </div>
                <div className="text-2xl font-black">
                    {Math.round(match.score * 100)}%
                </div>
            </div>

            <p className="text-xs mb-4 leading-relaxed font-medium">
                "{match.reason}"
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
                {match.strengths?.length > 0 && (
                    <div>
                        <span className="text-[9px] font-black uppercase tracking-tighter block mb-1 opacity-60">Strengths</span>
                        <ul className="text-[10px] space-y-0.5 list-disc list-inside font-bold">
                            {match.strengths.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                )}
                {match.gaps?.length > 0 && (
                    <div>
                        <span className="text-[9px] font-black uppercase tracking-tighter block mb-1 opacity-60">Gaps</span>
                        <ul className="text-[10px] space-y-0.5 list-disc list-inside font-bold opacity-80">
                            {match.gaps.slice(0, 2).map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            <div className="pt-3 border-t border-white/10">
                <div className="flex items-center gap-2 text-[10px]">
                    <Zap size={10} className="text-primary fill-primary" />
                    <span className="font-black uppercase">Pro-Tip:</span>
                    <span className="opacity-90">{match.proTip}</span>
                </div>
                {match.agentNotes && (
                    <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono text-text-dim uppercase tracking-tighter italic">
                        <span className="text-primary mr-2">AGENT_LOG:</span>
                        {match.agentNotes}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiMatchRating;
