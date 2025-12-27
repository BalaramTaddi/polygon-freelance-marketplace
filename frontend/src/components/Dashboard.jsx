import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Wallet, Briefcase, CheckCircle, Clock } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS } from '../constants';


function Dashboard() {
    const { address, isConnected } = useAccount();

    const { data: jobCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'jobCount',
    });

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
            <h1 style={{ marginBottom: '30px' }}>Dashboard</h1>

            <div className="grid">
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)' }}>Total Jobs</p>
                            <h2 style={{ fontSize: '2rem' }}>{jobCount?.toString() || '0'}</h2>
                        </div>
                        <Briefcase size={32} color="var(--primary)" />
                    </div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)' }}>Active Jobs</p>
                            <h2 style={{ fontSize: '2rem' }}>0</h2>
                        </div>
                        <Clock size={32} color="#f59e0b" />
                    </div>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)' }}>Completed</p>
                            <h2 style={{ fontSize: '2rem' }}>0</h2>
                        </div>
                        <CheckCircle size={32} color="#10b981" />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '40px' }} className="glass-card">
                <h3>Recent Activity</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>No recent activity found.</p>
            </div>
        </div>
    );
}

export default Dashboard;
