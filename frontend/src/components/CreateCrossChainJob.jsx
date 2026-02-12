import React, { useState, useEffect } from 'react';
import { useMultiChain } from '../hooks/useMultiChain';
import { ethers } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { toast } from 'react-hot-toast';
import { CROSS_CHAIN_ESCROW_MANAGER_ADDRESS, CONTRACT_ADDRESS } from '../constants';

const CreateCrossChainJob = ({ onClose, onSuccess }) => {
    const {
        currentChain,
        getMainnetChains,
        getTestnetChains,
        estimateCrossChainFee,
        getCurrentCCIPSelector
    } = useMultiChain();

    const signer = useEthersSigner();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'development',
        amount: '',
        token: 'USDC',
        deadline: '',
        sourceChain: currentChain?.id || 137,
        destinationChain: 1,
        freelancer: '', // Optional: pre-select freelancer
        milestones: []
    });

    const [estimatedFee, setEstimatedFee] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // Multi-step form

    const chains = [...getMainnetChains(), ...getTestnetChains()];

    // Estimate fee when destination chain changes
    useEffect(() => {
        if (formData.destinationChain && currentChain) {
            estimateFee();
        }
    }, [formData.destinationChain, currentChain]);

    const estimateFee = async () => {
        const fee = await estimateCrossChainFee(
            formData.destinationChain,
            'CREATE_JOB',
            null // Contract address would go here
        );
        setEstimatedFee(fee);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const addMilestone = () => {
        setFormData(prev => ({
            ...prev,
            milestones: [
                ...prev.milestones,
                { description: '', amount: '', isUpfront: false }
            ]
        }));
    };

    const updateMilestone = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            milestones: prev.milestones.map((m, i) =>
                i === index ? { ...m, [field]: value } : m
            )
        }));
    };

    const removeMilestone = (index) => {
        setFormData(prev => ({
            ...prev,
            milestones: prev.milestones.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!signer) {
            toast.error('Please connect your wallet');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Upload job details to IPFS
            const jobData = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                milestones: formData.milestones
            };

            // TODO: Upload to IPFS
            const ipfsHash = 'QmExample...'; // Placeholder

            // Step 2: Call CrossChainEscrowManager
            const escrowManagerAddress = CROSS_CHAIN_ESCROW_MANAGER_ADDRESS;
            const escrowManagerABI = [
                'function createCrossChainJob(uint64 destinationChain, address freelancer, uint256 amount, address token, bytes calldata jobData) external payable returns (uint256 localJobId, bytes32 messageId)'
            ];

            const escrowManager = new ethers.Contract(
                escrowManagerAddress,
                escrowManagerABI,
                signer
            );

            // Encode job data
            const encodedJobData = ethers.AbiCoder.defaultAbiCoder().encode(
                ['string', 'string', 'uint256', 'string[]', 'uint256[]', 'bool[]'],
                [
                    ipfsHash,
                    formData.category,
                    formData.deadline ? Math.floor(new Date(formData.deadline).getTime() / 1000) : 0,
                    formData.milestones.map(m => m.description),
                    formData.milestones.map(m => ethers.parseUnits(m.amount, 6)), // Assuming USDC
                    formData.milestones.map(m => m.isUpfront)
                ]
            );

            // Get destination chain selector
            const destinationChainInfo = chains.find(c => c.id === Number(formData.destinationChain));
            const destinationSelector = destinationChainInfo?.ccipSelector;

            // Get token address
            const tokenAddress = getTokenAddress(formData.token, currentChain.id);

            // Calculate total fee
            const totalFee = estimatedFee ? ethers.parseEther(estimatedFee.nativeFee.toString()) : ethers.parseEther('0.01');

            // Create cross-chain job
            const tx = await escrowManager.createCrossChainJob(
                destinationSelector,
                formData.freelancer || ethers.ZeroAddress,
                ethers.parseUnits(formData.amount, 6), // Assuming USDC
                tokenAddress,
                encodedJobData,
                { value: totalFee }
            );

            toast.loading('Creating cross-chain job...', { id: 'create-job' });

            const receipt = await tx.wait();

            // Extract job ID and message ID from events
            const jobCreatedEvent = receipt.logs.find(log =>
                log.topics[0] === ethers.id('CrossChainJobCreated(uint256,uint64,address,uint256,bytes32)')
            );

            toast.success('Cross-chain job created successfully!', { id: 'create-job' });

            if (onSuccess) {
                onSuccess({
                    jobId: jobCreatedEvent?.args?.localJobId,
                    messageId: jobCreatedEvent?.args?.messageId,
                    txHash: receipt.hash
                });
            }

            onClose();
        } catch (error) {
            console.error('Failed to create cross-chain job:', error);
            toast.error(error.message || 'Failed to create job', { id: 'create-job' });
        } finally {
            setLoading(false);
        }
    };

    const getTokenAddress = (symbol, chainId) => {
        const tokens = {
            137: { USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
            1: { USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
            8453: { USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
            42161: { USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' }
        };
        return tokens[chainId]?.[symbol] || ethers.ZeroAddress;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content cross-chain-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🌐 Create Cross-Chain Job</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="step-indicator">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Job Details</div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Chains & Payment</div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Milestones</div>
                    <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Review</div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Step 1: Job Details */}
                    {step === 1 && (
                        <div className="form-step">
                            <div className="form-group">
                                <label>Job Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Build a DeFi Dashboard"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Describe the job requirements..."
                                    rows="5"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Category *</label>
                                <select name="category" value={formData.category} onChange={handleInputChange}>
                                    <option value="development">Development</option>
                                    <option value="design">Design</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="writing">Writing</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Deadline (Optional)</label>
                                <input
                                    type="date"
                                    name="deadline"
                                    value={formData.deadline}
                                    onChange={handleInputChange}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            <button type="button" className="btn-primary" onClick={() => setStep(2)}>
                                Next: Chains & Payment →
                            </button>
                        </div>
                    )}

                    {/* Step 2: Chains & Payment */}
                    {step === 2 && (
                        <div className="form-step">
                            <div className="chain-selector-grid">
                                <div className="form-group">
                                    <label>Source Chain (Current)</label>
                                    <div className="chain-display">
                                        <span className="chain-icon">{currentChain?.icon}</span>
                                        <span>{currentChain?.name}</span>
                                    </div>
                                </div>

                                <div className="arrow">→</div>

                                <div className="form-group">
                                    <label>Destination Chain *</label>
                                    <select
                                        name="destinationChain"
                                        value={formData.destinationChain}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <optgroup label="Mainnets">
                                            {getMainnetChains().map(chain => (
                                                <option key={chain.id} value={chain.id}>
                                                    {chain.icon} {chain.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Testnets">
                                            {getTestnetChains().map(chain => (
                                                <option key={chain.id} value={chain.id}>
                                                    {chain.icon} {chain.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Payment Amount *</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        placeholder="100"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Token *</label>
                                    <select name="token" value={formData.token} onChange={handleInputChange}>
                                        <option value="USDC">USDC</option>
                                        <option value="USDT">USDT</option>
                                        <option value="DAI">DAI</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Freelancer Address (Optional)</label>
                                <input
                                    type="text"
                                    name="freelancer"
                                    value={formData.freelancer}
                                    onChange={handleInputChange}
                                    placeholder="0x... (leave empty for open job)"
                                />
                            </div>

                            {estimatedFee && (
                                <div className="fee-estimate">
                                    <h4>📊 Estimated Cross-Chain Fee</h4>
                                    <div className="fee-details">
                                        <span>Network Fee:</span>
                                        <span>{estimatedFee.nativeFee} {estimatedFee.currency}</span>
                                    </div>
                                    <div className="fee-details">
                                        <span>USD Equivalent:</span>
                                        <span>~${estimatedFee.usdFee.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="button-group">
                                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                                    ← Back
                                </button>
                                <button type="button" className="btn-primary" onClick={() => setStep(3)}>
                                    Next: Milestones →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Milestones */}
                    {step === 3 && (
                        <div className="form-step">
                            <h3>Milestones (Optional)</h3>
                            <p className="help-text">Break down the job into milestones for better payment management</p>

                            {formData.milestones.map((milestone, index) => (
                                <div key={index} className="milestone-item">
                                    <div className="milestone-header">
                                        <h4>Milestone {index + 1}</h4>
                                        <button
                                            type="button"
                                            className="btn-icon-danger"
                                            onClick={() => removeMilestone(index)}
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    <div className="form-group">
                                        <label>Description</label>
                                        <input
                                            type="text"
                                            value={milestone.description}
                                            onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                                            placeholder="e.g., Complete UI design"
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Amount</label>
                                            <input
                                                type="number"
                                                value={milestone.amount}
                                                onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                                                placeholder="25"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>

                                        <div className="form-group checkbox-group">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={milestone.isUpfront}
                                                    onChange={(e) => updateMilestone(index, 'isUpfront', e.target.checked)}
                                                />
                                                <span>Release upfront</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button type="button" className="btn-outline" onClick={addMilestone}>
                                + Add Milestone
                            </button>

                            <div className="button-group">
                                <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                                    ← Back
                                </button>
                                <button type="button" className="btn-primary" onClick={() => setStep(4)}>
                                    Review →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {step === 4 && (
                        <div className="form-step">
                            <h3>Review Your Cross-Chain Job</h3>

                            <div className="review-section">
                                <h4>Job Details</h4>
                                <div className="review-item">
                                    <span>Title:</span>
                                    <span>{formData.title}</span>
                                </div>
                                <div className="review-item">
                                    <span>Category:</span>
                                    <span>{formData.category}</span>
                                </div>
                                <div className="review-item">
                                    <span>Amount:</span>
                                    <span>{formData.amount} {formData.token}</span>
                                </div>
                            </div>

                            <div className="review-section">
                                <h4>Cross-Chain Route</h4>
                                <div className="chain-route">
                                    <div className="chain-box">
                                        <span className="chain-icon">{currentChain?.icon}</span>
                                        <span>{currentChain?.name}</span>
                                    </div>
                                    <div className="arrow-large">→</div>
                                    <div className="chain-box">
                                        <span className="chain-icon">
                                            {chains.find(c => c.id === Number(formData.destinationChain))?.icon}
                                        </span>
                                        <span>
                                            {chains.find(c => c.id === Number(formData.destinationChain))?.name}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {formData.milestones.length > 0 && (
                                <div className="review-section">
                                    <h4>Milestones ({formData.milestones.length})</h4>
                                    {formData.milestones.map((m, i) => (
                                        <div key={i} className="review-item">
                                            <span>{m.description}</span>
                                            <span>{m.amount} {formData.token} {m.isUpfront && '(Upfront)'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="button-group">
                                <button type="button" className="btn-secondary" onClick={() => setStep(3)}>
                                    ← Back
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary btn-large"
                                    disabled={loading}
                                >
                                    {loading ? 'Creating...' : '🚀 Create Cross-Chain Job'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            <style jsx>{`
        .cross-chain-modal {
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .step-indicator {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding: 0 1rem;
        }

        .step {
          flex: 1;
          text-align: center;
          padding: 0.5rem;
          border-bottom: 3px solid #333;
          color: #666;
          font-size: 0.9rem;
        }

        .step.active {
          border-bottom-color: var(--primary-color, #8b5cf6);
          color: var(--primary-color, #8b5cf6);
          font-weight: 600;
        }

        .form-step {
          padding: 1rem 0;
        }

        .chain-selector-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1rem;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .chain-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 8px;
          border: 2px solid rgba(139, 92, 246, 0.3);
        }

        .chain-icon {
          font-size: 1.5rem;
        }

        .arrow {
          font-size: 2rem;
          color: var(--primary-color, #8b5cf6);
        }

        .fee-estimate {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
        }

        .fee-estimate h4 {
          margin: 0 0 0.75rem 0;
          color: #3b82f6;
        }

        .fee-details {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fee-details:last-child {
          border-bottom: none;
        }

        .milestone-item {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .milestone-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .milestone-header h4 {
          margin: 0;
        }

        .review-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .review-section h4 {
          margin: 0 0 1rem 0;
          color: var(--primary-color, #8b5cf6);
        }

        .review-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .review-item:last-child {
          border-bottom: none;
        }

        .chain-route {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          padding: 1rem 0;
        }

        .chain-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 12px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          min-width: 120px;
        }

        .arrow-large {
          font-size: 3rem;
          color: var(--primary-color, #8b5cf6);
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .button-group button {
          flex: 1;
        }

        .btn-large {
          padding: 1rem 2rem;
          font-size: 1.1rem;
        }

        .help-text {
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .chain-selector-grid {
            grid-template-columns: 1fr;
          }

          .arrow {
            transform: rotate(90deg);
          }

          .step-indicator {
            flex-wrap: wrap;
          }

          .step {
            font-size: 0.75rem;
            padding: 0.25rem;
          }
        }
      `}</style>
        </div>
    );
};

export default CreateCrossChainJob;
