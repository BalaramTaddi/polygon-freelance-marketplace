import React, { useState, useEffect } from 'react';
import { useClient, useConversations, useMessages, useSendMessage, useStreamMessages } from '@xmtp/react-sdk';
import { motion } from 'framer-motion';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useAccount } from 'wagmi';
import { MessageSquare, Send, User, Loader2 } from 'lucide-react';

export default function Chat() {
    const { address } = useAccount();
    const signer = useEthersSigner();
    const { client, initialize, error, isLoading: isInitializing } = useClient();
    const { conversations } = useConversations();
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [peerAddress, setPeerAddress] = useState('');

    const handleInitialize = async () => {
        if (signer) {
            await initialize({ signer });
        }
    };

    if (!client) {
        return (
            <div className="glass-card" style={{ textAlign: 'center', padding: '50px' }}>
                <MessageSquare size={48} style={{ marginBottom: '20px', color: 'var(--primary)' }} />
                <h3>Enable Decentralized Messaging</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Messages are encrypted and stored off-chain using the XMTP protocol.
                </p>
                <button
                    onClick={handleInitialize}
                    className="btn-primary"
                    disabled={isInitializing || !signer}
                >
                    {isInitializing ? <Loader2 className="animate-spin" /> : signer ? 'Connect to XMTP' : 'Connect Wallet First'}
                </button>
                {!signer && (
                    <p style={{ color: '#f59e0b', marginTop: '10px', fontSize: '0.9rem' }}>
                        Please connect your wallet in the dashboard to enable messaging.
                    </p>
                )}
                {error && <p style={{ color: '#ef4444', marginTop: '10px' }}>{error.message}</p>}
            </div>
        );
    }

    return (
        <div className="grid" style={{ gridTemplateColumns: '300px 1fr', height: '70vh', gap: '20px' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3>Conversations</h3>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <input
                        type="text"
                        placeholder="Wallet Address"
                        value={peerAddress}
                        onChange={(e) => setPeerAddress(e.target.value)}
                        style={{ flex: 1, padding: '8px' }}
                    />
                    <button
                        className="btn-primary"
                        style={{ padding: '8px 12px' }}
                        onClick={() => {
                            if (peerAddress) {
                                setSelectedConversation({ peerAddress });
                                setPeerAddress('');
                            }
                        }}
                    >
                        +
                    </button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                    {conversations.map((conv, i) => (
                        <motion.div
                            key={conv.peerAddress}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedConversation(conv)}
                            style={{
                                padding: '12px 16px',
                                marginBottom: '8px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: selectedConversation?.peerAddress === conv.peerAddress ? 'rgba(138, 43, 226, 0.15)' : 'rgba(255,255,255,0.03)',
                                border: '1px solid',
                                borderColor: selectedConversation?.peerAddress === conv.peerAddress ? 'var(--primary)' : 'transparent',
                                color: selectedConversation?.peerAddress === conv.peerAddress ? 'var(--primary)' : 'inherit',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                {conv.peerAddress.slice(0, 8)}...{conv.peerAddress.slice(-6)}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                {selectedConversation ? (
                    <MessageContainer conversation={selectedConversation} />
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <MessageSquare size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function MessageContainer({ conversation }) {
    const { messages } = useMessages(conversation);
    const { sendMessage } = useSendMessage();
    const [inputValue, setInputValue] = useState('');
    const { address } = useAccount();

    useStreamMessages(conversation);

    const handleSend = async (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            await sendMessage(conversation, inputValue);
            setInputValue('');
        }
    };

    return (
        <>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="activity-icon" style={{ width: '32px', height: '32px' }}>
                        <User size={16} />
                    </div>
                    <strong>{conversation.peerAddress.slice(0, 8)}...{conversation.peerAddress.slice(-6)}</strong>
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, i) => {
                    const isMe = msg.senderAddress.toLowerCase() === address.toLowerCase();
                    return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                background: isMe ? 'linear-gradient(135deg, var(--primary), #4d0099)' : 'var(--glass-bg)',
                                padding: '12px 18px',
                                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                border: isMe ? 'none' : '1px solid var(--glass-border)',
                                maxWidth: '75%',
                                fontSize: '0.95rem',
                                boxShadow: isMe ? '0 4px 15px rgba(138, 43, 226, 0.2)' : 'none'
                            }}
                        >
                            {msg.content}
                        </motion.div>
                    );
                })}
            </div>
            <form onSubmit={handleSend} style={{ padding: '15px', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    style={{ flex: 1, padding: '10px 15px', borderRadius: '20px' }}
                />
                <button
                    type="submit"
                    className="btn-primary"
                    style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Send size={18} />
                </button>
            </form>
        </>
    );
}
