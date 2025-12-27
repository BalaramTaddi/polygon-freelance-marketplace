import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { Send, Loader2 } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS } from '../constants';


function CreateJob({ onJobCreated }) {
    const [freelancer, setFreelancer] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const { data: hash, writeContract, isPending, error } = useWriteContract();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!freelancer || !amount) return;

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: FreelanceEscrowABI.abi,
            functionName: 'createJob',
            args: [freelancer, description],
            value: parseEther(amount),
        });
    };

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    React.useEffect(() => {
        if (isSuccess) {
            alert('Job created successfully!');
            onJobCreated();
        }
    }, [isSuccess]);

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '30px' }}>Post a New Job</h1>
            <form onSubmit={handleSubmit} className="glass-card">
                <div style={{ marginBottom: '20px' }}>
                    <label>Freelancer Address</label>
                    <input
                        type="text"
                        placeholder="0x..."
                        className="input-field"
                        value={freelancer}
                        onChange={(e) => setFreelancer(e.target.value)}
                        required
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label>Budget (MATIC)</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="0.5"
                        className="input-field"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label>Initial Metadata URI (Description/Requirements)</label>
                    <textarea
                        placeholder="https://ipfs.io/ipfs/..."
                        className="input-field"
                        style={{ minHeight: '100px' }}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {error && (
                    <p style={{ color: '#ef4444', marginBottom: '20px', fontSize: '0.9rem' }}>
                        Error: {error.shortMessage || error.message}
                    </p>
                )}

                <button
                    type="submit"
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                    disabled={isPending || isConfirming}
                >
                    {isPending || isConfirming ? (
                        <><Loader2 className="animate-spin" size={20} /> Processing...</>
                    ) : (
                        <><Send size={20} /> Create Job & Escrow Funds</>
                    )}
                </button>
            </form>
        </div>
    );
}

export default CreateJob;
