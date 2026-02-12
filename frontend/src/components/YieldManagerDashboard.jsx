import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { TrendingUp, ArrowDownRight, ArrowUpRight, Cpu, Info, Loader2, DollarSign, Wallet } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS, SUPPORTED_TOKENS, YIELD_MANAGER_ADDRESS } from '../constants';
import { useTransactionToast } from '../hooks/useTransactionToast';

const STRATEGIES = [
    { id: 1, name: 'Aave V3', description: 'Instant liquidity & competitive rates', color: 'blue' },
    { id: 2, name: 'Compound V3', description: 'Institutional grade security', color: 'green' },
    { id: 3, name: 'Morpho Blue', description: 'Peer-to-peer efficiency & high APY', color: 'purple' }
];

function YieldManagerDashboard({ address }) {
    const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[1]); // USDC
    const [amount, setAmount] = useState('');
    const [selectedStrategy, setSelectedStrategy] = useState(1);

    const { data: balance } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'balances',
        args: [address, selectedToken.address],
    });

    const { data: stakedBalance } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'userStakes',
        args: [address, selectedToken.address, selectedStrategy],
    });

    const { data: hash, writeContract, writeContractAsync, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
    useTransactionToast(hash, isPending, isConfirming, isSuccess, error);

    const handleStake = async () => {
        if (!amount) return;
        try {
            await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: FreelanceEscrowABI.abi,
                functionName: 'stakeBalance',
                args: [selectedToken.address, parseUnits(amount, selectedToken.decimals), selectedStrategy],
            });
        } catch (err) { console.error(err); }
    };

    const handleUnstake = async () => {
        if (!amount) return;
        try {
            await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: FreelanceEscrowABI.abi,
                functionName: 'unstakeBalance',
                args: [selectedToken.address, parseUnits(amount, selectedToken.decimals), selectedStrategy],
            });
        } catch (err) { console.error(err); }
    };

    return (
        <div className="glass-card p-12 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[120px] -mr-32 -mt-32" />

            <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <TrendingUp size={32} className="text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-1">DeFi Yield Center</div>
                        <h3 className="text-3xl font-black tracking-tighter">Earnings Optimizer</h3>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim mb-1">Staked Value</div>
                    <div className="text-2xl font-black shimmer-text">
                        {stakedBalance ? Number(formatUnits(stakedBalance, selectedToken.decimals)).toFixed(2) : '0.00'} {selectedToken.symbol}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {STRATEGIES.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelectedStrategy(s.id)}
                        className={`p-6 rounded-[2.5rem] border transition-all text-left relative overflow-hidden group/btn ${selectedStrategy === s.id
                                ? 'bg-white/10 border-emerald-500/40 shadow-xl'
                                : 'bg-white/5 border-white/5 hover:border-white/10'
                            }`}
                    >
                        {selectedStrategy === s.id && (
                            <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-sm" />
                        )}
                        <div className="relative z-10">
                            <h4 className="font-black text-sm mb-2">{s.name}</h4>
                            <p className="text-[10px] text-text-muted font-medium leading-relaxed">{s.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="glass-panel p-8 bg-white/[0.02]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="md:col-span-2">
                        <label className="input-label">Asset to Optimize</label>
                        <select
                            className="input-field"
                            value={selectedToken.symbol}
                            onChange={(e) => setSelectedToken(SUPPORTED_TOKENS.find(t => t.symbol === e.target.value))}
                        >
                            {SUPPORTED_TOKENS.filter(t => t.symbol !== 'MATIC').map(t => (
                                <option key={t.symbol}>{t.symbol}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-end mb-2">
                            <label className="input-label !mb-0">Amount</label>
                            <span className="text-[10px] font-black uppercase text-text-dim">
                                Available: {balance ? Number(formatUnits(balance, selectedToken.decimals)).toFixed(2) : 0} {selectedToken.symbol}
                            </span>
                        </div>
                        <div className="relative">
                            <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="input-field pl-12"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleStake}
                        disabled={isPending || isConfirming || !amount}
                        className="btn-primary !bg-emerald-500 !text-black !py-4 flex-1 justify-center gap-3 disabled:opacity-50"
                    >
                        {isPending || isConfirming ? <Loader2 size={18} className="animate-spin" /> : <ArrowUpRight size={18} />}
                        Stake for Yield
                    </button>
                    <button
                        onClick={handleUnstake}
                        disabled={isPending || isConfirming || !amount}
                        className="btn-ghost !border-white/10 !py-4 flex-1 justify-center gap-3 disabled:opacity-50"
                    >
                        {isPending || isConfirming ? <Loader2 size={18} className="animate-spin" /> : <ArrowDownRight size={18} />}
                        Unstake Funds
                    </button>
                </div>
            </div>

            <div className="mt-8 flex items-center gap-3 text-[10px] text-text-muted font-bold opacity-60">
                <Info size={14} />
                <span>Smart Routing: Yield is accrued directly to your contract balance. Withdrawal fees may apply.</span>
            </div>
        </div>
    );
}

export default YieldManagerDashboard;
