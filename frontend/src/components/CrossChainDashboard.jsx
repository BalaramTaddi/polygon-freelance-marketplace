import React, { useState, useEffect } from 'react';
import { useMultiChain } from '../hooks/useMultiChain';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import CreateCrossChainJob from './CreateCrossChainJob';

const CrossChainDashboard = () => {
    const { address } = useAccount();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const {
        balances,
        loading: balancesLoading,
        getChainInfo,
        fetchBalancesAcrossChains,
        SUPPORTED_CHAINS
    } = useMultiChain();

    const [crossChainJobs, setCrossChainJobs] = useState([]);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [aggregatedStats, setAggregatedStats] = useState({
        totalJobs: 0,
        totalEarned: 0,
        activeChains: 0,
        pendingPayments: 0
    });
    const [loading, setLoading] = useState(true);
    const [selectedChain, setSelectedChain] = useState('all');

    useEffect(() => {
        if (address) {
            fetchCrossChainData();
            fetchBalancesAcrossChains();
        }
    }, [address]);

    const fetchCrossChainData = async () => {
        setLoading(true);
        try {
            // TODO: Fetch from subgraph or backend
            // For now, using mock data
            const mockJobs = [
                {
                    id: 1,
                    localJobId: 123,
                    remoteJobId: 456,
                    title: 'Build DeFi Dashboard',
                    sourceChain: 137,
                    destinationChain: 1,
                    amount: '500',
                    token: 'USDC',
                    status: 'Ongoing',
                    client: '0x1234...5678',
                    freelancer: address,
                    createdAt: Date.now() - 86400000 * 2
                },
                {
                    id: 2,
                    localJobId: 124,
                    remoteJobId: 457,
                    title: 'Smart Contract Audit',
                    sourceChain: 1,
                    destinationChain: 42161,
                    amount: '1000',
                    token: 'USDC',
                    status: 'Completed',
                    client: '0xabcd...efgh',
                    freelancer: address,
                    createdAt: Date.now() - 86400000 * 5
                }
            ];

            setCrossChainJobs(mockJobs);

            // Calculate aggregated stats
            const stats = {
                totalJobs: mockJobs.length,
                totalEarned: mockJobs.reduce((sum, job) => sum + parseFloat(job.amount), 0),
                activeChains: new Set(mockJobs.flatMap(j => [j.sourceChain, j.destinationChain])).size,
                pendingPayments: mockJobs.filter(j => j.status === 'Submitted').length
            };

            setAggregatedStats(stats);
        } catch (error) {
            console.error('Failed to fetch cross-chain data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Created': '#3b82f6',
            'Accepted': '#8b5cf6',
            'Ongoing': '#f59e0b',
            'Submitted': '#10b981',
            'Completed': '#22c55e',
            'Disputed': '#ef4444',
            'Cancelled': '#6b7280'
        };
        return colors[status] || '#6b7280';
    };

    const getChainDisplay = (chainId) => {
        const chain = getChainInfo(chainId);
        return chain ? (
            <span className="chain-badge" style={{ borderColor: chain.color }}>
                <span className="chain-icon">{chain.icon}</span>
                <span>{chain.name}</span>
            </span>
        ) : (
            <span>Unknown Chain</span>
        );
    };

    const filteredJobs = selectedChain === 'all'
        ? crossChainJobs
        : crossChainJobs.filter(j =>
            j.sourceChain === Number(selectedChain) ||
            j.destinationChain === Number(selectedChain)
        );

    return (
        <div className="cross-chain-dashboard">
            <div className="dashboard-header flex justify-between items-center">
                <div>
                    <h1>🌐 Cross-Chain Dashboard</h1>
                    <p>Manage your jobs and assets across multiple blockchains</p>
                </div>
                <button
                    className="btn-primary flex items-center gap-2"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <span>+ Post Cross-Chain Gig</span>
                </button>
            </div>

            {isCreateModalOpen && (
                <CreateCrossChainJob
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        fetchCrossChainData();
                    }}
                />
            )}

            {/* Aggregated Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Cross-Chain Jobs</div>
                        <div className="stat-value">{aggregatedStats.totalJobs}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Earned</div>
                        <div className="stat-value">${aggregatedStats.totalEarned.toLocaleString()}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⛓️</div>
                    <div className="stat-content">
                        <div className="stat-label">Active Chains</div>
                        <div className="stat-value">{aggregatedStats.activeChains}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <div className="stat-label">Pending Payments</div>
                        <div className="stat-value">{aggregatedStats.pendingPayments}</div>
                    </div>
                </div>
            </div>

            {/* Chain Balances */}
            <div className="section">
                <h2>💼 Balances Across Chains</h2>
                <div className="balances-grid">
                    {Object.entries(balances).map(([chainId, data]) => (
                        <div key={chainId} className="balance-card">
                            <div className="balance-header">
                                <span className="chain-icon">{data.chainInfo.icon}</span>
                                <span className="chain-name">{data.chainInfo.name}</span>
                            </div>
                            <div className="balance-amount">
                                {data.error ? (
                                    <span className="error-text">Failed to load</span>
                                ) : (
                                    <>
                                        <span className="amount">{parseFloat(data.native).toFixed(4)}</span>
                                        <span className="currency">Native</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cross-Chain Jobs */}
            <div className="section">
                <div className="section-header">
                    <h2>🔗 Cross-Chain Jobs</h2>
                    <select
                        className="chain-filter"
                        value={selectedChain}
                        onChange={(e) => setSelectedChain(e.target.value)}
                    >
                        <option value="all">All Chains</option>
                        {Object.entries(SUPPORTED_CHAINS).map(([id, info]) => (
                            <option key={id} value={id}>
                                {info.icon} {info.name}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading cross-chain jobs...</p>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🌐</div>
                        <h3>No Cross-Chain Jobs Found</h3>
                        <p>Create your first cross-chain job to get started!</p>
                    </div>
                ) : (
                    <div className="jobs-list">
                        {filteredJobs.map(job => (
                            <div key={job.id} className="job-card cross-chain">
                                <div className="job-header">
                                    <h3>{job.title}</h3>
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(job.status) }}
                                    >
                                        {job.status}
                                    </span>
                                </div>

                                <div className="job-route">
                                    <div className="route-item">
                                        <span className="route-label">Source</span>
                                        {getChainDisplay(job.sourceChain)}
                                    </div>
                                    <div className="route-arrow">→</div>
                                    <div className="route-item">
                                        <span className="route-label">Destination</span>
                                        {getChainDisplay(job.destinationChain)}
                                    </div>
                                </div>

                                <div className="job-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Amount:</span>
                                        <span className="detail-value">{job.amount} {job.token}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Client:</span>
                                        <span className="detail-value">{job.client}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Created:</span>
                                        <span className="detail-value">
                                            {new Date(job.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="job-actions">
                                    <button className="btn-outline btn-sm">View Details</button>
                                    {job.status === 'Ongoing' && (
                                        <button className="btn-primary btn-sm">Submit Work</button>
                                    )}
                                    {job.status === 'Submitted' && (
                                        <button className="btn-success btn-sm">Release Payment</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pending Cross-Chain Transactions */}
            {pendingTransactions.length > 0 && (
                <div className="section">
                    <h2>⏳ Pending Cross-Chain Transactions</h2>
                    <div className="transactions-list">
                        {pendingTransactions.map(tx => (
                            <div key={tx.id} className="transaction-card">
                                <div className="tx-icon">🔄</div>
                                <div className="tx-content">
                                    <div className="tx-title">{tx.type}</div>
                                    <div className="tx-route">
                                        {getChainDisplay(tx.sourceChain)} → {getChainDisplay(tx.destinationChain)}
                                    </div>
                                </div>
                                <div className="tx-status">
                                    <div className="spinner-sm"></div>
                                    <span>Processing...</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
        .cross-chain-dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 2rem;
        }

        .dashboard-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .dashboard-header p {
          color: #999;
          font-size: 1.1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.2);
        }

        .stat-icon {
          font-size: 2.5rem;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
        }

        .section {
          margin-bottom: 3rem;
        }

        .section h2 {
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
          color: #fff;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .chain-filter {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 0.9rem;
        }

        .balances-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .balance-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.25rem;
        }

        .balance-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .chain-icon {
          font-size: 1.5rem;
        }

        .chain-name {
          font-weight: 600;
          color: #fff;
        }

        .balance-amount {
          display: flex;
          flex-direction: column;
        }

        .amount {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }

        .currency {
          color: #999;
          font-size: 0.85rem;
        }

        .jobs-list {
          display: grid;
          gap: 1.5rem;
        }

        .job-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .job-card:hover {
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
        }

        .job-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .job-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #fff;
        }

        .job-route {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .route-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .route-label {
          font-size: 0.75rem;
          color: #999;
          text-transform: uppercase;
        }

        .route-arrow {
          font-size: 1.5rem;
          color: #8b5cf6;
        }

        .chain-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .job-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          font-size: 0.85rem;
          color: #999;
        }

        .detail-value {
          font-weight: 600;
          color: #fff;
        }

        .job-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #999;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .cross-chain-dashboard {
            padding: 1rem;
          }

          .dashboard-header h1 {
            font-size: 1.75rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .job-route {
            flex-direction: column;
            align-items: flex-start;
          }

          .route-arrow {
            transform: rotate(90deg);
          }
        }
      `}</style>
        </div>
    );
};

export default CrossChainDashboard;
