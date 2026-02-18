import React, { useEffect, useRef, useState } from 'react';
import { loadStripeOnramp } from '@stripe/crypto';
import { api } from '../services/api'; // Ensure this path is correct based on folder structure
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

const FiatOnramp = ({ address }) => {
    const onrampElementRef = useRef(null);
    const [status, setStatus] = useState('idle'); // idle, loading, ready, error
    const [onrampInstance, setOnrampInstance] = useState(null);
    const [clientSecret, setClientSecret] = useState('');
    const [stripeError, setStripeError] = useState(null);

    useEffect(() => {
        // 1. Initialize Stripe Onramp SDK
        const initStripe = async () => {
            if (onrampInstance) return;

            try {
                // Use public key from env or fallback (should be in .env)
                const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

                if (!publishableKey) {
                    console.warn("Stripe Publishable Key not found in env, onramp might fail.");
                }

                const onramp = await loadStripeOnramp(publishableKey || 'pk_test_51...'); // Fallback for dev only
                if (!onramp) {
                    throw new Error("Failed to load Stripe Onramp SDK");
                }
                setOnrampInstance(onramp);
            } catch (err) {
                console.error("[ONRAMP] Init failed:", err);
                setStatus('error');
                setStripeError("Could not initialize Stripe Onramp.");
            }
        };

        initStripe();
    }, [onrampInstance]);

    useEffect(() => {
        // 2. Fetch Session & Mount
        const createSessionAndMount = async () => {
            if (!onrampInstance || !address || clientSecret) return;

            setStatus('loading');
            try {
                console.log("[ONRAMP] Creating session for:", address);
                const response = await api.createStripeOnrampSession(address); // Use updated API method

                if (response.error) throw new Error(response.error);

                const { client_secret } = response;
                setClientSecret(client_secret);

                // Mount the Onramp UI
                const session = onrampInstance.createSession({
                    clientSecret: client_secret,
                    appearance: {
                        theme: 'dark', // Match app theme
                    }
                });

                if (onrampElementRef.current) {
                    session.mount(onrampElementRef.current);
                    setStatus('ready');
                } else {
                    console.error("[ONRAMP] Ref not found");
                }
            } catch (err) {
                console.error("[ONRAMP] Session creation failed:", err);
                setStatus('error');
                setStripeError(err.message || "Failed to start onramp session.");
                toast.error("Fiat Onramp unreachable: " + err.message);
            }
        };

        createSessionAndMount();
    }, [onrampInstance, address, clientSecret]);

    return (
        <div className="flex flex-col h-full w-full p-6 md:p-8 animate-in fade-in zoom-in duration-300">
            <header className="mb-8">
                <h1 className="text-3xl font-black tracking-tighter text-white mb-2 uppercase italic">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Fiat</span> To Crypto
                </h1>
                <p className="text-text-muted font-medium text-sm max-w-2xl">
                    Seamlessly convert your fiat currency into Polygon assets using Stripe's secure onramp.
                    Power up your wallet instantly.
                </p>
            </header>

            <div className="flex-1 min-h-[500px] flex justify-center">
                <div className="w-full max-w-[480px] bg-[#1a1b26] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">

                    {/* Status Overlays */}
                    {status === 'loading' && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                            <span className="text-white font-bold tracking-widest text-xs uppercase">Initializing Secure Link...</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-8 text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                            <h3 className="text-white font-bold text-lg mb-2">Connection Failed</h3>
                            <p className="text-text-muted text-sm mb-6">{stripeError}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-xs font-bold transition-all"
                            >
                                <RefreshCw size={14} /> Retry
                            </button>
                        </div>
                    )}

                    {/* The Stripe Container */}
                    <div
                        id="onramp-element"
                        ref={onrampElementRef}
                        className="w-full h-full min-h-[600px]" // Stripe needs height
                    />
                </div>
            </div>
        </div>
    );
};

export default FiatOnramp;
