import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@xmtp/browser-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useAccount } from 'wagmi';
import { MessageSquare, Send, User, Loader2, FileText, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { hexToBytes } from 'viem';

export default function Chat({ initialPeerAddress, onClearedAddress }) {
    const { address } = useAccount();
    const signer = useEthersSigner();

    const [client, setClient] = useState(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [peerAddress, setPeerAddress] = useState(initialPeerAddress || '');
    const [contractContext, setContractContext] = useState(null);
    const [loadingContext, setLoadingContext] = useState(false);

    useEffect(() => {
        if (initialPeerAddress) {
            setPeerAddress(initialPeerAddress);
            // Optionally auto-select if already in list or auto-start
        }
    }, [initialPeerAddress]);

    // Fetch contract context from subgraph when peer address changes
    useEffect(() => {
        if (selectedConversation?.peerAddress && address) {
            fetchContractContext(selectedConversation.peerAddress, address);
        }
    }, [selectedConversation, address]);

    const fetchContractContext = async (peerAddr, myAddr) => {
        setLoadingContext(true);
        try {
            const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL || 'http://localhost:8000/subgraphs/name/polylance';

            const query = `
                query GetJobContext($client: String!, $freelancer: String!) {
                    jobs(
                        where: {
                            or: [
                                { client: $client, freelancer: $freelancer },
                                { client: $freelancer, freelancer: $client }
                            ]
                        }
                        orderBy: createdAt
                        orderDirection: desc
                        first: 1
                    ) {
                        id
                        jobId
                        amount
                        status
                        deadline
                        category
                        client
                        freelancer
                    }
                }
            `;

            const response = await fetch(SUBGRAPH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    variables: {
                        client: myAddr.toLowerCase(),
                        freelancer: peerAddr.toLowerCase()
                    }
                })
            });

            const { data } = await response.json();
            if (data?.jobs?.length > 0) {
                setContractContext(data.jobs[0]);
            } else {
                setContractContext(null);
            }
        } catch (err) {
            console.error('[CONTEXT] Failed to fetch contract context:', err);
            setContractContext(null);
        } finally {
            setLoadingContext(false);
        }
    };

    const handleInitialize = async () => {
        if (!signer) return;
        setIsInitializing(true);
        setError(null);
        try {
            console.log('[XMTP] Initializing client for address:', address);

            // In V3 browser-sdk, the client.create takes (signer, options) or (address, signer, options)
            // Depending on the version. For 5.3.0, it's (signer, options)
            // But sometimes wrapping the signer is safer to ensure all methods exist.
            const xmtp = await Client.create(signer, {
                env: 'production', // Use 'production' even for testnets as per XMTP's modern approach
                dbPath: `xmtp-${address.toLowerCase()}`
            });

            console.log('[XMTP] Client initialized successfully:', xmtp.address);
            setClient(xmtp);

            // Initial fetch of conversations
            const convs = await xmtp.conversations.list();
            console.log('[XMTP] Found conversations:', convs.length);
            setConversations(convs);
        } catch (err) {
            console.error('[XMTP] Initialization error:', err);
            // Check for specific common errors
            if (err.message?.includes('secure context')) {
                setError(new Error('XMTP requires a secure context (HTTPS) or localhost.'));
            } else if (err.message?.includes('user rejected')) {
                setError(new Error('Signature request was rejected. Please try again.'));
            } else {
                setError(err);
            }
        } finally {
            setIsInitializing(false);
        }
    };

    // Stream new conversations
    useEffect(() => {
        if (!client) return;

        let isCancelled = false;
        const streamConvs = async () => {
            const stream = await client.conversations.stream();
            for await (const conv of stream) {
                if (isCancelled) break;
                setConversations(prev => {
                    const exists = prev.some(p => p.id === conv.id);
                    if (exists) return prev;
                    return [conv, ...prev];
                });
            }
        };

        streamConvs();
        return () => { isCancelled = true; };
    }, [client]);

    if (!client) {
        return (
            <div className="glass-card" style={{ textAlign: 'center', padding: '50px' }}>
                <MessageSquare size={48} style={{ marginBottom: '20px', color: 'var(--primary)' }} />
                <h3>Enable Decentralized Messaging (XMTP V3)</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                    PolyLance uses XMTP V3 for secure, end-to-end encrypted messaging.
                </p>
                <button
                    onClick={handleInitialize}
                    className="btn-primary"
                    disabled={isInitializing || !signer}
                >
                    {isInitializing ? <Loader2 className="animate-spin" /> : signer ? 'Connect to XMTP V3' : 'Connect Wallet First'}
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
                <form
                    style={{ display: 'flex', gap: '5px' }}
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (peerAddress && client) {
                            try {
                                // In V3, creating a peer-to-peer conversation
                                // We check if they can receive messages first if possible
                                const conversation = await client.conversations.newConversation(peerAddress);
                                setSelectedConversation(conversation);
                                setPeerAddress('');
                            } catch (err) {
                                console.error('[XMTP] Error starting conversation:', err);
                                if (err.message?.includes('not registered') || err.message?.includes('not found')) {
                                    alert('This user has not enabled XMTP messaging yet. They need to connect their wallet and enable messaging for you to talk to them.');
                                } else {
                                    alert('Error starting conversation: ' + err.message);
                                }
                            }
                        }
                    }}
                >
                    <input
                        type="text"
                        placeholder="Wallet Address"
                        value={peerAddress}
                        onChange={(e) => setPeerAddress(e.target.value)}
                        style={{ flex: 1, padding: '8px' }}
                    />
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '8px 12px' }}
                    >
                        +
                    </button>
                </form>
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                    {conversations.map((conv, i) => (
                        <motion.div
                            key={conv.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedConversation(conv)}
                            style={{
                                padding: '12px 16px',
                                marginBottom: '8px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: selectedConversation?.id === conv.id ? 'rgba(138, 43, 226, 0.15)' : 'rgba(255,255,255,0.03)',
                                border: '1px solid',
                                borderColor: selectedConversation?.id === conv.id ? 'var(--primary)' : 'transparent',
                                color: selectedConversation?.id === conv.id ? 'var(--primary)' : 'inherit',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                {conv.peerAddress?.slice(0, 8) || 'Group'}...{conv.peerAddress?.slice(-6) || ''}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                {selectedConversation ? (
                    <MessageContainer
                        conversation={selectedConversation}
                        address={address}
                        contractContext={contractContext}
                        loadingContext={loadingContext}
                    />
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

function MessageContainer({ conversation, address, contractContext, loadingContext }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getStatusColor = (status) => {
        const colors = {
            'Created': '#6366f1',
            'Accepted': '#8b5cf6',
            'Ongoing': '#f59e0b',
            'Completed': '#10b981',
            'Disputed': '#ef4444',
            'Cancelled': '#6b7280'
        };
        return colors[status] || '#6b72 80';
    };

    const formatDeadline = (timestamp) => {
        if (!timestamp) return 'No deadline';
        const date = new Date(parseInt(timestamp) * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Fetch initial messages
    useEffect(() => {
        const fetchMessages = async () => {
            setIsLoading(true);
            try {
                const msgs = await conversation.messages();
                setMessages(msgs);
            } catch (err) {
                console.error('[XMTP] Error fetching messages:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMessages();
    }, [conversation]);

    // Stream new messages
    useEffect(() => {
        let isCancelled = false;
        const streamMessages = async () => {
            const stream = await conversation.streamMessages();
            for await (const msg of stream) {
                if (isCancelled) break;
                setMessages(prev => {
                    const exists = prev.some(p => p.id === msg.id);
                    if (exists) return prev;
                    return [...prev, msg];
                });
            }
        };
        streamMessages();
        return () => { isCancelled = true; };
    }, [conversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            try {
                await conversation.send(inputValue);
                setInputValue('');
            } catch (err) {
                console.error('[XMTP] Send error:', err);
                alert('Failed to send message: ' + err.message);
            }
        }
    };

    return (
        <>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="activity-icon" style={{ width: '32px', height: '32px' }}>
                        <User size={16} />
                    </div>
                    <strong>{conversation.peerAddress?.slice(0, 8) || 'Group Chat'}...{conversation.peerAddress?.slice(-6) || ''}</strong>
                </div>
            </div>

            {/* Contract Context Bar - Subgraph Integration */}
            <AnimatePresence>
                {contractContext && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            margin: '12px 20px',
                            padding: '16px 24px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '20px',
                            border: '1px solid var(--glass-border)',
                            display: 'flex',
                            gap: '24px',
                            alignItems: 'center',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)' }}>
                                <FileText size={18} className="text-primary" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Project</span>
                                <span style={{ fontWeight: '700' }}>#{contractContext.jobId}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)' }}>
                                <DollarSign size={18} style={{ color: '#10b981' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase' }}>Budget</span>
                                <span style={{ fontWeight: '700' }}>{(parseFloat(contractContext.amount) / 1e18).toFixed(2)} MATIC</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', background: `${getStatusColor(contractContext.status)}15` }}>
                                <CheckCircle2 size={18} style={{ color: getStatusColor(contractContext.status) }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase' }}>Status</span>
                                <span style={{ color: getStatusColor(contractContext.status), fontWeight: '700' }}>{contractContext.status}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)' }}>
                                <Clock size={18} style={{ color: '#f59e0b' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase' }}>Deadline</span>
                                <span style={{ fontWeight: '700' }}>{formatDeadline(contractContext.deadline)}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
                {loadingContext && (
                    <div style={{ padding: '12px 20px', textAlign: 'center', borderBottom: '1px solid var(--glass-border)' }}>
                        <Loader2 size={16} className="animate-spin" style={{ display: 'inline-block' }} />
                        <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Loading contract context...
                        </span>
                    </div>
                )}
            </AnimatePresence>

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
                                background: isMe ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255, 255, 255, 0.03)',
                                padding: '12px 20px',
                                borderRadius: isMe ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                                border: isMe ? 'none' : '1px solid var(--glass-border)',
                                maxWidth: '70%',
                                fontSize: '0.95rem',
                                color: isMe ? 'white' : 'var(--text-main)',
                                boxShadow: isMe ? '0 10px 20px -5px var(--primary-glow)' : 'none',
                                position: 'relative'
                            }}
                        >
                            <div style={{ wordBreak: 'break-word', lineHeight: '1.5', fontWeight: '500' }}>
                                {msg.content}
                            </div>
                            <div style={{
                                fontSize: '0.65rem',
                                opacity: 0.6,
                                marginTop: '6px',
                                textAlign: isMe ? 'right' : 'left',
                                fontWeight: '700'
                            }}>
                                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {isMe && ' · Sent'}
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={messagesEndRef} />
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
