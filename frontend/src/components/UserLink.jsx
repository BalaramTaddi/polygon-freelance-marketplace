import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';

export function UserLink({ address, style }) {
    const { data: ensName } = useEnsName({ address: address?.toLowerCase(), chainId: mainnet.id });
    const { data: ensAvatar } = useEnsAvatar({ name: ensName || undefined, chainId: mainnet.id });

    const [name, setName] = useState(null);

    useEffect(() => {
        if (!address) return;
        const fetchProfile = async () => {
            try {
                const profile = await api.getProfile(address.toLowerCase());
                if (profile && profile.name) {
                    setName(profile.name);
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }
        };
        fetchProfile();
    }, [address]);

    const display = name || ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown');

    return (
        <span
            title={address}
            className="inline-flex items-center gap-2"
            style={{
                fontWeight: (name || ensName) ? '600' : '400',
                color: (name || ensName) ? 'var(--primary)' : 'inherit',
                cursor: 'pointer',
                ...style
            }}
        >
            {ensAvatar && (
                <img src={ensAvatar} alt="avatar" className="w-5 h-5 rounded-full border border-white/10" />
            )}
            {display}
        </span>
    );
}

export default UserLink;
