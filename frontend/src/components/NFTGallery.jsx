import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Award, ExternalLink } from 'lucide-react';
import FreelanceEscrowABI from '../contracts/FreelanceEscrow.json';
import { CONTRACT_ADDRESS } from '../constants';


function NFTGallery() {
    const { address, isConnected } = useAccount();

    // In a real app, we'd use an NFT API like Alchemy or Moralis to fetch NFTs by owner.
    // For this demo, we can show a placeholder or try to read the balance and iterate.

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>My Proof-of-Work NFTs</h1>
                <div className="badge" style={{ padding: '8px 16px' }}>Polygon Network</div>
            </div>

            {!isConnected ? (
                <p style={{ color: 'var(--text-muted)' }}>Please connect your wallet to view your certificates.</p>
            ) : (
                <div className="grid">
                    <NFTCard
                        title="UI Design - Mobile App"
                        jobId="1"
                        date="Dec 24, 2025"
                        image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
                    />
                    <NFTCard
                        title="Smart Contract Audit"
                        jobId="2"
                        date="Dec 20, 2025"
                        image="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80"
                    />
                </div>
            )}
        </div>
    );
}

function NFTCard({ title, jobId, date, image }) {
    return (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <img
                src={image}
                alt={title}
                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
            />
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '10px' }}>
                    <Award size={18} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Completion Certificate</span>
                </div>
                <h3 style={{ marginBottom: '5px' }}>{title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '15px' }}>
                    Verified Job #{jobId} • {date}
                </p>
                <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
                    View on PolygonScan <ExternalLink size={16} />
                </button>
            </div>
        </div>
    );
}

export default NFTGallery;
