import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import logo from './assets/logo.png';
import { Briefcase, PlusCircle, LayoutDashboard, Ticket, MessageSquare, Trophy, User, Gavel, Cpu, Activity, Globe, BarChart3, Menu, X, Award, Zap, CreditCard } from 'lucide-react';
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
import ArbitrationDashboard from './components/ArbitrationDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import CrossChainDashboard from './components/CrossChainDashboard';
import CreateCrossChainJob from './components/CreateCrossChainJob';
import PrivacyCenter from './components/PrivacyCenter';
import SBTGallery from './components/SBTGallery';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AnimationShowcase from './components/AnimationShowcase';
import { NotificationManager } from './components/NotificationManager';
import AuthPortal from './components/AuthPortal';
import FiatOnramp from './components/FiatOnramp';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAccount, useBalance, useWalletClient } from 'wagmi';
import { initSocialLogin, createBiconomySmartAccount } from './utils/biconomy';
import { createWalletClient, custom } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { Mail, LogOut, ShieldCheck, Shield } from 'lucide-react';
import { SiweMessage } from 'siwe';

function App() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCrossChainCreateOpen, setIsCrossChainCreateOpen] = useState(false);
  const [portfolioAddress, setPortfolioAddress] = useState(null);
  const [chatPeerAddress, setChatPeerAddress] = useState(null);
  const [isGasless, setIsGasless] = useState(true); // Default to true for SUPREME experience
  const [smartAccount, setSmartAccount] = useState(null);
  const [socialProvider, setSocialProvider] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitializingGasless, setIsInitializingGasless] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-init Smart Account for EOA if Gasless is enabled
  React.useEffect(() => {
    const initGaslessForEOA = async () => {
      if (isConnected && walletClient && isGasless && !smartAccount && !isLoggingIn && !isInitializingGasless) {
        setIsInitializingGasless(true);
        try {
          console.log("[BICONOMY] Initializing Smart Account for EOA...");
          const sa = await createBiconomySmartAccount(walletClient);
          if (sa) {
            setSmartAccount(sa);
            toast.success("Quantum Gas Relay Active");
          }
        } catch (error) {
          console.error("[BICONOMY] EOA Smart Account init failed:", error);
        } finally {
          setIsInitializingGasless(false);
        }
      }
    };
    initGaslessForEOA();
  }, [isConnected, walletClient, isGasless, smartAccount, isLoggingIn]);

  const handleSocialLogin = async () => {
    setIsLoggingIn(true);
    try {
      const particle = await initSocialLogin();
      if (!particle) throw new Error("Failed to init social login");

      const userInfo = await particle.auth.login();
      console.log("[SOCIAL] Logged in user:", userInfo);

      const { ParticleProvider } = await import("@biconomy/particle-auth");
      const provider = new ParticleProvider(particle.auth);

      const walletClientSa = createWalletClient({
        chain: polygonAmoy,
        transport: custom(provider)
      });

      const sa = await createBiconomySmartAccount(walletClientSa);

      // Perform SIWE verification for the smart account
      const saAddress = sa.accountAddress;
      const { nonce } = await api.getNonce(saAddress);

      const message = new SiweMessage({
        domain: window.location.host,
        address: saAddress,
        statement: 'Sign in to PolyLance with Smart Account',
        uri: window.location.origin,
        version: '1',
        chainId: 80002,
        nonce,
      });

      const signature = await sa.signMessage(message.prepareMessage());
      const verifyData = await api.verifySIWE(message.prepareMessage(), signature);

      if (!verifyData.ok) throw new Error("Backend verification failed");

      setSmartAccount(sa);
      setSocialProvider(particle);
      toast.success("Welcome, Supreme Member!");
    } catch (err) {
      console.error("[SOCIAL] Login error:", err);
      toast.error("Social login/verification failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (socialProvider) {
      await socialProvider.auth.logout();
    }
    setSmartAccount(null);
    setSocialProvider(null);
    toast.info("Logged out successfully");
  };

  const effectiveAddress = smartAccount ? smartAccount.accountAddress : address;

  const renderContent = () => {
    if (portfolioAddress) {
      return <Portfolio address={portfolioAddress} onBack={() => setPortfolioAddress(null)} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard address={effectiveAddress} />;
      case 'jobs': return <JobsList onUserClick={setPortfolioAddress} onSelectChat={onSelectChat} gasless={isGasless} smartAccount={smartAccount} />;
      case 'create': return <CreateJob smartAccount={smartAccount} gasless={isGasless} address={effectiveAddress} onJobCreated={() => setActiveTab('jobs')} />;
      case 'nfts': return <NFTGallery address={effectiveAddress} />;
      case 'chat': return <Chat peerAddress={chatPeerAddress} address={effectiveAddress} />;
      case 'leaderboard': return <Leaderboard onUserClick={setPortfolioAddress} />;
      case 'governance': return <DaoDashboard address={effectiveAddress} />;
      case 'justice': return <ArbitrationDashboard address={effectiveAddress} />;
      case 'manager': return <ManagerDashboard address={effectiveAddress} />;
      case 'cross-chain': return <CrossChainDashboard address={effectiveAddress} />;
      case 'analytics': return <AnalyticsDashboard />;
      case 'sbt': return <SBTGallery address={effectiveAddress} />;
      case 'terms': return <TermsOfService />;
      case 'privacy': return <PrivacyCenter address={effectiveAddress} />;
      case 'showcase': return <AnimationShowcase />;
      case 'onramp': return <FiatOnramp address={effectiveAddress} />;
      default: return <Dashboard address={effectiveAddress} />;
    }
  };

  const onSelectChat = (addr) => {
    setChatPeerAddress(addr);
    setActiveTab('chat');
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

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter text-white">POLY<span className="text-primary">LANCE</span></span>
            <span className="text-[10px] uppercase tracking-widest font-black text-primary opacity-80 leading-none">Zenith Protocol</span>
          </div>
          <button
            className="lg:hidden p-2 text-text-muted hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="px-4 py-2 text-[10px] font-black tracking-widest text-text-muted uppercase opacity-50 mb-2">Core Access</div>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'analytics', icon: BarChart3, label: 'Neural Stats' },
            { id: 'jobs', icon: Briefcase, label: 'Explorer' },
            { id: 'create', icon: PlusCircle, label: 'Create Gig' },
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}

          <div className="px-4 py-2 mt-4 text-[10px] font-black tracking-widest text-text-muted uppercase opacity-50 mb-2">Social & Justice</div>
          {[
            { id: 'chat', icon: MessageSquare, label: 'Neural Chat' },
            { id: 'leaderboard', icon: Trophy, label: 'Hall of Fame' },
            { id: 'governance', icon: Cpu, label: 'Governance' },
            { id: 'manager', icon: Activity, label: 'Escrow Manager' },
            { id: 'justice', icon: Gavel, label: 'Justice' },
            { id: 'cross-chain', icon: Globe, label: 'Global Edge' },
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}

          <div className="px-4 py-2 mt-4 text-[10px] font-black tracking-widest text-text-muted uppercase opacity-50 mb-2">Vault & UI</div>
          {[
            { id: 'nfts', icon: Ticket, label: 'Asset Vault' },
            { id: 'sbt', icon: Award, label: 'Identity Vault' },
            { id: 'privacy', icon: Shield, label: 'Privacy Center' },
            { id: 'showcase', icon: Zap, label: 'Animations' },
            { id: 'onramp', icon: CreditCard, label: 'Buy Crypto' },
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
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
        <header className="header flex items-center justify-between px-4 lg:px-8 h-[80px] border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-[500]">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 text-text-muted hover:text-white bg-white/5 rounded-xl transition-all"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none mb-1">
                {activeTab.replace('-', ' ')}
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Neural Link Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div
              className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 group hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => setIsGasless(!isGasless)}
            >
              {isGasless ? <ShieldCheck size={16} className="text-primary animate-pulse" /> : <Shield size={16} className="text-text-dim" />}
              <span className={`text-[10px] font-black uppercase tracking-widest ${isGasless ? 'text-primary' : 'text-text-dim'}`}>
                {isGasless ? 'Quantum Relay' : 'Standard'}
              </span>
            </div>

            {smartAccount && (
              <div className="hidden md:flex items-center gap-3 p-1.5 pl-4 bg-primary/10 rounded-2xl border border-primary/20">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-primary tracking-widest uppercase">Smart Wallet</span>
                  <span className="text-[11px] font-bold text-text-dim font-mono">
                    {smartAccount.accountAddress.slice(0, 4)}...{smartAccount.accountAddress.slice(-4)}
                  </span>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            )}

            {!smartAccount && (
              <button
                onClick={handleSocialLogin}
                disabled={isLoggingIn}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-all shadow-lg shadow-primary/20 border border-white/10"
              >
                {isLoggingIn ? <div className="loading-spinner h-4 w-4" /> : <Mail size={16} />}
                <span>{isLoggingIn ? "Verifying Identity..." : "Social Gateway"}</span>
              </button>
            )}

            <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />
          </div>
        </header>

        <div className="content-area pt-10">
          <AnimatePresence mode="wait">
            {!effectiveAddress && activeTab !== 'terms' && activeTab !== 'privacy' ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
              >
                <AuthPortal onSocialLogin={handleSocialLogin} isLoggingIn={isLoggingIn} />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab + (portfolioAddress || '')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {renderContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="footer hidden lg:flex">
          <div className="flex gap-6">
            <button onClick={() => setActiveTab('terms')} className="text-xs text-text-muted hover:text-white transition-colors">Terms</button>
            <button onClick={() => setActiveTab('privacy')} className="text-xs text-text-muted hover:text-white transition-colors">Privacy</button>
          </div>
          <p className="text-xs text-text-dim font-medium tracking-tight">
            Designed for the <span className="text-primary font-bold italic">Supreme Zenith</span> Era. &copy; 2026 PolyLance.
          </p>
        </footer>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[2500]"
          />
        )}
      </AnimatePresence>

      <div className="mobile-nav">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'jobs', icon: Briefcase, label: 'Jobs' },
          { id: 'create', icon: PlusCircle, label: 'Post' },
          { id: 'chat', icon: MessageSquare, label: 'Chat' },
        ].map(item => (
          <button
            key={item.id}
            className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          className="mobile-nav-item"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu />
          <span>More</span>
        </button>
      </div>
    </div>
  );
}

export default App;
