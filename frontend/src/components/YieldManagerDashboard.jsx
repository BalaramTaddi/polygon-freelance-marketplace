import React, { useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { TrendingUp, ArrowDownRight, ArrowUpRight, Info, Loader2, DollarSign } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS, SUPPORTED_TOKENS } from '../constants';
import { useTransactionToast } from '../hooks/useTransactionToast';

const STRATEGIES = [
    { id: 1, name: 'Aave V3', description: 'Instant liquidity & competitive rates' },
    { id: 2, name: 'Compound V3', description: 'Institutional grade security' },
    { id: 3, name: 'Morpho Blue', description: 'Peer-to-peer efficiency & high APY' }
];

function YieldManagerDashboard({ address }) {
    const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[1]);
    const [amount, setAmount] = useState('');
    const [selectedStrategy, setSelectedStrategy] = useState(1);

    const { data: balance } = useReadContract({
        address: CONTRACT_ADDRESS, abi: FreelanceEscrowABI.abi,
        functionName: 'balances', args: [address, selectedToken.address],
    });

    const { data: stakedBalance } = useReadContract({
        address: CONTRACT_ADDRESS, abi: FreelanceEscrowABI.abi,
        functionName: 'userStakes', args: [address, selectedToken.address, selectedStrategy],
    });

    const { data: hash, writeContractAsync, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
    useTransactionToast(hash, isPending, isConfirming, isSuccess, error);

    const handleStake = async () => {
        if (!amount) return;
        try {
            await writeContractAsync({
                address: CONTRACT_ADDRESS, abi: FreelanceEscrowABI.abi,
                functionName: 'stakeBalance',
                args: [selectedToken.address, parseUnits(amount, selectedToken.decimals), selectedStrategy],
            });
        } catch (err) { console.error(err); }
    };

    const handleUnstake = async () => {
        if (!amount) return;
        try {
            await writeContractAsync({
                address: CONTRACT_ADDRESS, abi: FreelanceEscrowABI.abi,
                functionName: 'unstakeBalance',
                args: [selectedToken.address, parseUnits(amount, selectedToken.decimals), selectedStrategy],
            });
        } catch (err) { console.error(err); }
    };

    const busy = isPending || isConfirming;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.03))',
                        border: '1px solid rgba(52,211,153,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <TrendingUp size={18} style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>DeFi Yield</div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Earnings Optimizer</h3>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 2 }}>Staked</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                        {stakedBalance ? Number(formatUnits(stakedBalance, selectedToken.decimals)).toFixed(2) : '0.00'} {selectedToken.symbol}
                    </div>
                </div>
            </div>

            {/* Strategies */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
                {STRATEGIES.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelectedStrategy(s.id)}
                        style={{
                            padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                            background: selectedStrategy === s.id ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${selectedStrategy === s.id ? 'rgba(52,211,153,0.25)' : 'var(--border)'}`,
                            cursor: 'pointer', transition: 'all 0.15s ease', color: '#fff',
                        }}
                    >
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 3 }}>{s.name}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{s.description}</div>
                    </button>
                ))}
            </div>

            {/* Input row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                    <label className="form-label">Asset</label>
                    <select className="form-input" value={selectedToken.symbol}
                        onChange={(e) => setSelectedToken(SUPPORTED_TOKENS.find(t => t.symbol === e.target.value))}>
                        {SUPPORTED_TOKENS.filter(t => t.symbol !== 'MATIC').map(t => (
                            <option key={t.symbol}>{t.symbol}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Amount</label>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>
                            Avail: {balance ? Number(formatUnits(balance, selectedToken.decimals)).toFixed(2) : 0}
                        </span>
                    </div>
                    <input type="number" step="0.01" placeholder="0.00" className="form-input"
                        value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleStake} disabled={busy || !amount}
                    className="btn btn-primary" style={{ flex: 1, borderRadius: 10, justifyContent: 'center', opacity: (busy || !amount) ? 0.5 : 1 }}>
                    {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowUpRight size={14} />}
                    Stake
                </button>
                <button onClick={handleUnstake} disabled={busy || !amount}
                    className="btn btn-secondary" style={{ flex: 1, borderRadius: 10, justifyContent: 'center', opacity: (busy || !amount) ? 0.5 : 1 }}>
                    {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowDownRight size={14} />}
                    Unstake
                </button>
            </div>

            {/* Info */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.65rem', color: 'var(--text-tertiary)', opacity: 0.6 }}>
                <Info size={12} />
                <span>Yield accrues directly to your contract balance.</span>
            </div>
        </div>
    );
}

export default YieldManagerDashboard;
