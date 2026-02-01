import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import logo from './assets/logo.png';
import { Briefcase, PlusCircle, LayoutDashboard, Ticket, MessageSquare, Trophy, User, Gavel } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import CreateJob from './components/CreateJob';
import JobsList from './components/JobsList';
import NFTGallery from './components/NFTGallery';
import Chat from './components/Chat';
import Leaderboard from './components/Leaderboard';
import Portfolio from './components/Portfolio';
import DaoDashboard from './components/DaoDashboard';
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
      case 'jobs': return <JobsList onUserClick={setPortfolioAddress} onSelectChat={onSelectChat} gasless={isGasless} />;
      case 'create': return <CreateJob />;
      case 'nfts': return <NFTGallery />;
      case 'chat': return <Chat peerAddress={chatPeerAddress} />;
      case 'leaderboard': return <Leaderboard onUserClick={setPortfolioAddress} />;
      case 'governance': return <DaoDashboard />;
      case 'terms': return <TermsOfService />;
      case 'privacy': return <PrivacyPolicy />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <NotificationManager />
      <ToastContainer theme="dark" position="bottom-right" />

      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-[#02040a]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="PolyLance Zenith" className="w-10 h-10 object-contain hover:scale-110 transition-transform cursor-pointer" onClick={() => setActiveTab('dashboard')} />
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter text-white">POLY<span className="text-primary">LANCE</span></span>
            <span className="text-[10px] uppercase tracking-widest font-black text-primary opacity-80 leading-none">Zenith Protocol</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>
            <Briefcase size={20} /> Explorer
          </button>
          <button className={`nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
            <PlusCircle size={20} /> Create Gig
          </button>
          <button className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            <MessageSquare size={20} /> Neural Chat
          </button>
          <button className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            <Trophy size={20} /> Hall of Fame
          </button>
          <button className={`nav-item ${activeTab === 'governance' ? 'active' : ''}`} onClick={() => setActiveTab('governance')}>
            <Gavel size={20} /> Governance
          </button>
          <button className={`nav-item ${activeTab === 'nfts' ? 'active' : ''}`} onClick={() => setActiveTab('nfts')}>
            <Ticket size={20} /> Legacy Vault
          </button>
        </nav>

        <div className="mt-auto p-4">
          <div className="glass-card !p-4 !bg-white/5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-text-dim uppercase tracking-widest">Network Edge</span>
              <div className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 shadow-lg shadow-primary/20" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-text-muted">Protocol Node</span>
                <span className="text-[12px] font-black text-white">v1.2.0-SUPREME</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted">Gasless Mode</span>
              <button
                onClick={() => setIsGasless(!isGasless)}
                className={`w-8 h-4 rounded-full relative transition-colors ${isGasless ? 'bg-primary' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isGasless ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-text-dim uppercase tracking-[0.2em]">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold tracking-widest uppercase opacity-80">Mainnet Synced</span>
            </div>
            <ConnectButton />
          </div>
        </header>

        <div className="content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (portfolioAddress || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="footer">
          <div className="flex gap-6">
            <button onClick={() => setActiveTab('terms')} className="text-xs text-text-muted hover:text-white transition-colors">Terms of Service</button>
            <button onClick={() => setActiveTab('privacy')} className="text-xs text-text-muted hover:text-white transition-colors">Privacy Policy</button>
          </div>
          <p className="text-xs text-text-dim font-medium tracking-tight">
            Designed for the <span className="text-primary font-bold italic">Supreme Zenith</span> Era. &copy; 2026 PolyLance.
          </p>
        </footer>
      </main>

      <div className="mobile-nav">
        <button className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </button>
        <button className={`mobile-nav-item ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>
          <Briefcase size={20} />
          <span>Jobs</span>
        </button>
        <button className={`mobile-nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
          <PlusCircle size={20} />
          <span>Post</span>
        </button>
        <button className={`mobile-nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>
        <button className={`mobile-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
          <Trophy size={20} />
          <span>Elite</span>
        </button>
      </div>
    </div>
  );
}

export default App;
