import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:3001/api';

/**
 * AiRecommendations Component
 * Displays a list of AI-recommended jobs for the current freelancer.
 */
const AiRecommendations = ({ address }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/recommendations/${address}`);
                setJobs(response.data);
            } catch (err) {
                console.error('Failed to fetch recommendations:', err);
            } finally {
                setLoading(false);
            }
        };

        if (address) {
            fetchRecommendations();
        }
    }, [address]);

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/5" />
            ))}
        </div>
    );

    if (jobs.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-purple-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-text-dim">Gemini Recommendations</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {jobs.map((job, i) => (
                    <motion.div
                        key={job.jobId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card !p-5 group cursor-pointer hover:border-primary/40 transition-all border-white/5"
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-tighter">
                                        High Match
                                    </span>
                                    <span className="text-[10px] text-text-dim font-bold uppercase tracking-widest">
                                        Job #{job.jobId}
                                    </span>
                                </div>
                                <h4 className="font-bold text-text-main group-hover:text-primary transition-colors">
                                    {job.title}
                                </h4>
                                <p className="text-xs text-text-muted line-clamp-1">
                                    {job.description}
                                </p>
                            </div>
                            <div className="bg-primary/10 text-primary p-2 rounded-xl group-hover:scale-110 transition-transform">
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AiRecommendations;
