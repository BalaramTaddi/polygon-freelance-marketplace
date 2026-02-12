import React, { useState } from 'react';
import { useAccount, useContractRead, useContractWrite } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import AssetTokenizerABI from '../abis/AssetTokenizer.json';

const ASSET_TYPE_LABELS = {
    0: { label: 'Invoice', icon: '📄', color: '#3b82f6' },
    1: { label: 'IP Rights', icon: '🎨', color: '#8b5cf6' },
    2: { label: 'Revenue Share', icon: '💰', color: '#22c55e' },
    3: { label: 'Future Earnings', icon: '📈', color: '#f59e0b' },
    4: { label: 'Physical Asset', icon: '📦', color: '#ef4444' }
};

const ASSET_STATUS = {
    0: { label: 'Pending', color: '#f59e0b' },
    1: { label: 'Active', color: '#22c55e' },
    2: { label: 'Completed', color: '#3b82f6' },
    3: { label: 'Defaulted', color: '#ef4444' },
    4: { label: 'Disputed', color: '#f97316' }
};

export default function AssetDashboard({ contractAddress }) {
    const { address } = useAccount();
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [milestoneForm, setMilestoneForm] = useState({
        description: '',
        value: '',
        deadline: ''
    });

    // Create milestone
    const { write: createMilestone, isLoading: isCreatingMilestone } = useContractWrite({
        address: contractAddress,
        abi: AssetTokenizerABI,
        functionName: 'createMilestone'
    });

    // Claim rewards
    const { write: claimRewards, isLoading: isClaiming } = useContractWrite({
        address: contractAddress,
        abi: AssetTokenizerABI,
        functionName: 'claimRewards'
    });

    const handleCreateMilestone = (assetId) => {
        if (!milestoneForm.description || !milestoneForm.value || !milestoneForm.deadline) return;

        const deadlineTimestamp = Math.floor(new Date(milestoneForm.deadline).getTime() / 1000);

        createMilestone({
            args: [
                BigInt(assetId),
                milestoneForm.description,
                parseUnits(milestoneForm.value, 6),
                BigInt(deadlineTimestamp)
            ]
        });

        setMilestoneForm({ description: '', value: '', deadline: '' });
    };

    const handleClaimRewards = (assetId) => {
        claimRewards({
            args: [BigInt(assetId)]
        });
    };

    // Example assets - in production, fetch from contract
    const assets = [
        {
            id: 1,
            assetType: 2, // Revenue Share
            status: 1, // Active
            issuer: address,
            totalValue: 100000,
            totalSupply: 10000,
            distributedValue: 25000,
            maturityDate: Date.now() + 300 * 24 * 60 * 60 * 1000,
            isVerified: true,
            milestoneCount: 4,
            userBalance: 3000, // User owns 30%
            claimableAmount: 7500 // $7,500 claimable
        },
        {
            id: 2,
            assetType: 1, // IP Rights
            status: 1,
            issuer: address,
            totalValue: 50000,
            totalSupply: 1000,
            distributedValue: 10000,
            maturityDate: Date.now() + 600 * 24 * 60 * 60 * 1000,
            isVerified: true,
            milestoneCount: 2,
            userBalance: 500, // User owns 50%
            claimableAmount: 5000
        }
    ];

    return (
        <div className="asset-dashboard">
            <div className="dashboard-header">
                <h1>💎 My Tokenized Assets</h1>
                <p>Manage your real-world asset tokens and claim rewards</p>
            </div>

            <div className="portfolio-summary">
                <div className="summary-card">
                    <div className="summary-icon">💼</div>
                    <div className="summary-content">
                        <div className="summary-value">{assets.length}</div>
                        <div className="summary-label">Active Assets</div>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-icon">💰</div>
                    <div className="summary-content">
                        <div className="summary-value">
                            ${assets.reduce((sum, a) => sum + a.claimableAmount, 0).toLocaleString()}
                        </div>
                        <div className="summary-label">Claimable Rewards</div>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-icon">📊</div>
                    <div className="summary-content">
                        <div className="summary-value">
                            ${assets.reduce((sum, a) => sum + a.totalValue, 0).toLocaleString()}
                        </div>
                        <div className="summary-label">Total Portfolio Value</div>
                    </div>
                </div>
            </div>

            <div className="assets-grid">
                {assets.map((asset) => {
                    const assetTypeInfo = ASSET_TYPE_LABELS[asset.assetType];
                    const statusInfo = ASSET_STATUS[asset.status];
                    const ownershipPercent = ((asset.userBalance / asset.totalSupply) * 100).toFixed(1);
                    const distributionProgress = ((asset.distributedValue / asset.totalValue) * 100).toFixed(1);
                    const daysUntilMaturity = Math.floor((asset.maturityDate - Date.now()) / (24 * 60 * 60 * 1000));

                    return (
                        <div key={asset.id} className="asset-card">
                            <div className="asset-header">
                                <div className="asset-type" style={{ color: assetTypeInfo.color }}>
                                    <span className="type-icon">{assetTypeInfo.icon}</span>
                                    <span className="type-label">{assetTypeInfo.label}</span>
                                </div>
                                <div className="asset-status" style={{ color: statusInfo.color }}>
                                    {statusInfo.label}
                                </div>
                            </div>

                            <div className="asset-id">Asset #{asset.id}</div>

                            <div className="asset-stats">
                                <div className="stat-row">
                                    <span className="stat-label">Total Value:</span>
                                    <span className="stat-value">${asset.totalValue.toLocaleString()}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Your Ownership:</span>
                                    <span className="stat-value ownership">{ownershipPercent}%</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Distributed:</span>
                                    <span className="stat-value">${asset.distributedValue.toLocaleString()}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Maturity:</span>
                                    <span className="stat-value">{daysUntilMaturity} days</span>
                                </div>
                            </div>

                            <div className="progress-section">
                                <div className="progress-label">
                                    <span>Distribution Progress</span>
                                    <span>{distributionProgress}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${distributionProgress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="milestones-section">
                                <div className="milestones-header">
                                    <span>📍 Milestones</span>
                                    <span className="milestone-count">{asset.milestoneCount} total</span>
                                </div>
                                {asset.issuer === address && (
                                    <button
                                        className="btn-add-milestone"
                                        onClick={() => setSelectedAsset(asset.id)}
                                    >
                                        + Add Milestone
                                    </button>
                                )}
                            </div>

                            {asset.claimableAmount > 0 && (
                                <div className="rewards-section">
                                    <div className="claimable-amount">
                                        <span>💰 Claimable:</span>
                                        <span className="amount">${asset.claimableAmount.toLocaleString()}</span>
                                    </div>
                                    <button
                                        className="btn-claim"
                                        onClick={() => handleClaimRewards(asset.id)}
                                        disabled={isClaiming}
                                    >
                                        {isClaiming ? '⏳ Claiming...' : '🎁 Claim Rewards'}
                                    </button>
                                </div>
                            )}

                            {asset.isVerified && (
                                <div className="verified-badge">
                                    ✓ AI Verified
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Milestone Creation Modal */}
            {selectedAsset && (
                <div className="modal-overlay" onClick={() => setSelectedAsset(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>📍 Create New Milestone</h3>
                        <p>Add a milestone for Asset #{selectedAsset}</p>

                        <div className="form-group">
                            <label>Description</label>
                            <input
                                type="text"
                                placeholder="e.g., Q1 Revenue Target"
                                value={milestoneForm.description}
                                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Value to Release (USDC)</label>
                            <input
                                type="number"
                                placeholder="e.g., 25000"
                                value={milestoneForm.value}
                                onChange={(e) => setMilestoneForm({ ...milestoneForm, value: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Deadline</label>
                            <input
                                type="date"
                                value={milestoneForm.deadline}
                                onChange={(e) => setMilestoneForm({ ...milestoneForm, deadline: e.target.value })}
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-cancel"
                                onClick={() => setSelectedAsset(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-create"
                                onClick={() => handleCreateMilestone(selectedAsset)}
                                disabled={isCreatingMilestone}
                            >
                                {isCreatingMilestone ? '⏳ Creating...' : '✓ Create Milestone'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
        .asset-dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .dashboard-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .dashboard-header p {
          color: #94a3b8;
          font-size: 1.125rem;
        }

        .portfolio-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
        }

        .summary-icon {
          font-size: 2.5rem;
        }

        .summary-value {
          font-size: 2rem;
          font-weight: 700;
          color: #e2e8f0;
        }

        .summary-label {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .assets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 2rem;
        }

        .asset-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.8));
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          position: relative;
        }

        .asset-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(99, 102, 241, 0.3);
        }

        .asset-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .asset-type {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
        }

        .type-icon {
          font-size: 1.5rem;
        }

        .asset-id {
          font-size: 1.25rem;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 1.5rem;
        }

        .asset-stats {
          margin-bottom: 1.5rem;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .stat-label {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .stat-value {
          color: #e2e8f0;
          font-weight: 600;
        }

        .ownership {
          color: #6366f1;
          font-size: 1.125rem;
        }

        .progress-section {
          margin-bottom: 1.5rem;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .progress-bar {
          height: 8px;
          background: rgba(99, 102, 241, 0.2);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #a855f7);
          transition: width 0.3s ease;
        }

        .milestones-section {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(99, 102, 241, 0.05);
          border-radius: 8px;
        }

        .milestones-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          color: #e2e8f0;
        }

        .milestone-count {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .btn-add-milestone {
          width: 100%;
          padding: 0.5rem;
          background: rgba(99, 102, 241, 0.1);
          border: 1px dashed rgba(99, 102, 241, 0.3);
          border-radius: 6px;
          color: #6366f1;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-add-milestone:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
        }

        .rewards-section {
          padding: 1rem;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1));
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .claimable-amount {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          color: #22c55e;
          font-weight: 600;
        }

        .amount {
          font-size: 1.25rem;
        }

        .btn-claim {
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #22c55e, #10b981);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-claim:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(34, 197, 94, 0.4);
        }

        .btn-claim:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .verified-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 20px;
          color: #22c55e;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 16px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
        }

        .modal-content h3 {
          margin-bottom: 0.5rem;
          color: #e2e8f0;
        }

        .modal-content p {
          color: #94a3b8;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #e2e8f0;
          font-weight: 600;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 1rem;
        }

        .form-group input:focus {
          outline: none;
          border-color: #6366f1;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-cancel, .btn-create {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-cancel {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .btn-create {
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: white;
        }

        .btn-create:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.4);
        }

        .btn-create:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
        </div>
    );
}
