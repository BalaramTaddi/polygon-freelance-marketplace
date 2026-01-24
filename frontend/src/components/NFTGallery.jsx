import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { Award, ExternalLink } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS } from '../constants';


function NFTGallery() {
    const { address, isConnected } = useAccount();

    const { data: balance } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'balanceOf',
        args: [address],
    });

    const nftCount = balance ? Number(balance) : 0;

    return (
        <div className="animate-fade">
            <header className="mb-12 flex justify-between items-center bg-white/5 p-8 rounded-3xl border border-white/5">
                <div>
                    <h1 className="text-5xl font-black mb-2 tracking-tighter shimmer-text">Proof-of-Work</h1>
                    <p className="text-text-muted font-medium opacity-70">Your on-chain career achievements and certificates.</p>
                </div>
                <div className="badge badge-info shadow-xl shadow-primary/5 border-primary/20 !px-6 !py-3">
                    Polygon Powered
                </div>
            </header>

            {!isConnected ? (
                <div className="glass-card text-center py-20">
                    <p className="text-text-muted text-lg">Please connect your wallet to view your certificates.</p>
                </div>
            ) : (
                <div className="grid-marketplace">
                    {nftCount === 0 ? (
                        <div className="glass-card text-center py-20 lg:col-span-3">
                            <p className="text-text-muted text-lg">You haven't earned any proof-of-work NFTs yet. Complete a job to receive one!</p>
                        </div>
                    ) : (
                        Array.from({ length: nftCount }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <NFTCard balanceIndex={i} owner={address} />
                            </motion.div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function NFTCard({ balanceIndex, owner }) {
    const { data: tokenId } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'tokenOfOwnerByIndex',
        args: [owner, BigInt(balanceIndex)],
    });

    const { data: uri } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: FreelanceEscrowABI.abi,
        functionName: 'tokenURI',
        args: tokenId ? [tokenId] : undefined,
    });

    const image = "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80"; // Placeholder for actual NFT image

    return (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <img
                src={image}
                alt="Completion Certificate"
                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
            />
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '10px' }}>
                    <Award size={18} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Completion Certificate</span>
                </div>
                <h3 style={{ marginBottom: '5px' }}>Job #{tokenId ? tokenId.toString() : '...'}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '15px' }}>
                    Verified on Polygon • {uri ? 'Metadata Synced' : 'Loading...'}
                </p>
                <button
                    onClick={() => window.open(`https://amoy.polygonscan.com/token/${CONTRACT_ADDRESS}?a=${tokenId}`, '_blank')}
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                >
                    View on PolygonScan <ExternalLink size={16} />
                </button>
            </div>
        </div>
    );
}

export default NFTGallery;
