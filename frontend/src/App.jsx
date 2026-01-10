import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Briefcase, PlusCircle, LayoutDashboard, Ticket, MessageSquare, Trophy, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import CreateJob from './components/CreateJob';
import JobsList from './components/JobsList';
import NFTGallery from './components/NFTGallery';
import Chat from './components/Chat';
import Leaderboard from './components/Leaderboard';
import Portfolio from './components/Portfolio';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import { NotificationManager } from './components/NotificationManager';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAccount, useBalance } from 'wagmi';

function App() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolioAddress, setPortfolioAddress] = useState(null);
  const [chatPeerAddress, setChatPeerAddress] = useState(null);
  const [isGasless, setIsGasless] = useState(false);

  const onSelectChat = (peer) => {
    setChatPeerAddress(peer);
    setActiveTab('chat');
  };

  const renderContent = () => {
    if (portfolioAddress) {
      return <Portfolio address={portfolioAddress} onBack={() => setPortfolioAddress(null)} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'jobs': return <JobsList gasless={isGasless} onUserClick={(addr) => setPortfolioAddress(addr)} onSelectChat={onSelectChat} />;
      case 'create': return <CreateJob gasless={isGasless} onJobCreated={() => setActiveTab('jobs')} />;
      case 'nfts': return <NFTGallery />;
      case 'chat': return <Chat initialPeerAddress={chatPeerAddress} onClearedAddress={() => setChatPeerAddress(null)} />;
      case 'leaderboard': return <Leaderboard />;
      case 'tos': return <TermsOfService onBack={() => setActiveTab('dashboard')} />;
      case 'privacy': return <PrivacyPolicy onBack={() => setActiveTab('dashboard')} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ToastContainer position="top-right" autoClose={5000} theme="dark" hideProgressBar={false} />
      <NotificationManager />
      <ConnectionBanner />

      <nav>
        <div className="brand">
          <Briefcase size={28} color="var(--primary)" />
          <span>PolyLance</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`nav-link ${activeTab === 'jobs' ? 'active' : ''}`}
            >
              <Briefcase size={18} /> Markets
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`nav-link ${activeTab === 'create' ? 'active' : ''}`}
            >
              <PlusCircle size={18} /> Post Job
            </button>
            <button
              onClick={() => setActiveTab('nfts')}
              className={`nav-link ${activeTab === 'nfts' ? 'active' : ''}`}
            >
              <Ticket size={18} /> Gallery
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`nav-link ${activeTab === 'leaderboard' ? 'active' : ''}`}
            >
              <Trophy size={18} /> Leaders
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
            >
              <MessageSquare size={18} /> Messenger
            </button>
          </div>

          <div className="h-8 w-px bg-white/10 mx-2" />

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase opacity-40 mb-1">Gasless</span>
              <button
                onClick={() => setIsGasless(!isGasless)}
                className={`relative w-9 h-5 rounded-full transition-all duration-300 ${isGasless ? 'bg-primary' : 'bg-white/10 border border-white/10'}`}
              >
                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-300 ${isGasless ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>

            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                return (
                  <div {...(!ready && { 'aria-hidden': true, 'className': 'opacity-0 pointer-events-none' })}>
                    {(() => {
                      if (!connected) {
                        return (
                          <button onClick={openConnectModal} className="btn-primary">
                            Connect Wallet
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button onClick={openChainModal} className="btn-ghost !text-danger !border-danger/30">
                            Wrong Network
                          </button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-primary">{account.displayBalance}</span>
                            <span className="text-xs opacity-50 font-medium">{account.displayName}</span>
                          </div>
                          <button onClick={openAccountModal} className="p-1 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                            <img
                              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${account.address}`}
                              alt="avatar"
                              className="w-8 h-8 rounded-lg"
                            />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </nav>

      <main className="container flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (portfolioAddress || '')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="px-12 py-8 border-t border-white/5 flex justify-between items-center text-sm">
        <div className="opacity-40 italic">© 2026 PolyLance Protocol. The future of decentralized work.</div>
        <div className="flex gap-6 opacity-60">
          <button onClick={() => setActiveTab('tos')} className="hover:text-primary transition-colors">Terms of Service</button>
          <button onClick={() => setActiveTab('privacy')} className="hover:text-primary transition-colors">Privacy Policy</button>
          <a href="https://polygon.technology" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Built on Polygon</a>
        </div>
      </footer>
    </div>
  );
}

function ConnectionBanner() {
  const { isConnected, chain } = useAccount();
  const isWrongChain = isConnected && chain?.id !== 80002;

  if (!isConnected) {
    return (
      <div className="bg-primary/10 text-primary py-2 px-12 text-center text-sm border-b border-primary/20">
        ✨ Welcome to PolyLance! Please <strong>connect your wallet</strong> to get started.
      </div>
    );
  }

  if (isWrongChain) {
    return (
      <div className="bg-danger/10 text-danger py-2 px-12 text-center text-sm border-b border-danger/20">
        🚨 Attention! You're on the wrong network. Please switch to <strong>Polygon Amoy</strong>.
      </div>
    );
  }

  return null;
}

export default App;
