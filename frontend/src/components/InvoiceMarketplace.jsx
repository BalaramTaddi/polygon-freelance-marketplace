import React, { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import {
  FileText, CheckCircle2, CircleDollarSign, BarChart3,
  ShieldCheck, Clock, TrendingUp, Info, ArrowUpRight
} from 'lucide-react';
import InvoiceNFTABI from '../abis/InvoiceNFT.json';

const INVOICE_STATUS = {
  0: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: <Clock size={16} /> },
  1: { label: 'Verified', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: <CheckCircle2 size={16} /> },
  2: { label: 'Financed', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', icon: <CircleDollarSign size={16} /> },
  3: { label: 'Paid', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', icon: <CheckCircle2 size={16} /> },
  4: { label: 'Defaulted', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: <Info size={16} /> },
  5: { label: 'Disputed', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', icon: <Info size={16} /> }
};

export default function InvoiceMarketplace({ contractAddress }) {
  const [offerAmount, setOfferAmount] = useState('');

  const { writeContract, isPending: isFinancing } = useWriteContract();

  const handleFinance = (invoiceId) => {
    if (!offerAmount) return;
    writeContract({
      address: contractAddress,
      abi: InvoiceNFTABI.abi,
      functionName: 'financeInvoice',
      args: [BigInt(invoiceId), parseUnits(offerAmount, 6)]
    });
  };

  const calculateAPR = (faceValue, offerAmount, daysUntilDue) => {
    const profit = faceValue - offerAmount;
    const apr = (profit / offerAmount) * (365 / daysUntilDue) * 100;
    return apr.toFixed(1);
  };

  // Mock data for UI
  const invoices = [
    { id: 1, issuer: '0x742...bEb', debtor: 'Acme Corp', faceValue: 10000, dueDate: Date.now() + 60 * 24 * 60 * 60 * 1000, status: 1, isVerified: true },
    { id: 2, issuer: '0x862...119', debtor: 'TechStart Inc', faceValue: 25000, dueDate: Date.now() + 45 * 24 * 60 * 60 * 1000, status: 1, isVerified: true },
    { id: 3, issuer: '0xdD2...44C0', debtor: 'Global Services LLC', faceValue: 50000, dueDate: Date.now() + 90 * 24 * 60 * 60 * 1000, status: 1, isVerified: true }
  ];

  return (
    <div style={{ padding: '24px 0' }}>
      <header style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 12, background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Invoice Liquidity
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 650, margin: '0 auto' }}>
          Finance verified corporate invoices for immediate liquidity and earn high-yield returns as an institutional funder.
        </p>
      </header>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 48 }}>
        {[
          { label: 'Market Depth', value: '$1.4M', icon: <CircleDollarSign size={24} />, color: 'var(--accent-light)' },
          { label: 'Active Notes', value: '38', icon: <FileText size={24} />, color: 'var(--info)' },
          { label: 'Avg Yield', value: '14.2%', icon: <TrendingUp size={24} />, color: 'var(--success)' }
        ].map((stat, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: `${stat.color}10`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
        {invoices.map((invoice) => {
          const daysLeft = Math.floor((invoice.dueDate - Date.now()) / (24 * 60 * 60 * 1000));
          const suggested = invoice.faceValue * 0.94;
          const apr = calculateAPR(invoice.faceValue, suggested, daysLeft);
          const status = INVOICE_STATUS[invoice.status];

          return (
            <div key={invoice.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-tertiary)' }}>INV-{invoice.id.toString().padStart(6, '0')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: status.bg, color: status.color, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  {status.icon} {status.label}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Debtor Entity</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{invoice.debtor}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Face Value</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>${invoice.faceValue.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Due In</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-light)' }}>{daysLeft} Days</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(124, 92, 252, 0.05)', border: '1px solid rgba(124, 92, 252, 0.1)' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: 4 }}>DISCOUNT</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>6.0%</div>
                </div>
                <div style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.1)' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: 4 }}>EST. APR</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>{apr}%</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="form-input"
                  type="number"
                  placeholder="Offer (USDC)"
                  style={{ flex: 1, height: 44 }}
                  onChange={(e) => setOfferAmount(e.target.value)}
                />
                <button className="btn-primary" style={{ flex: 1.2, height: 44, gap: 8 }} onClick={() => handleFinance(invoice.id)} disabled={isFinancing}>
                  {isFinancing ? 'Financing...' : <><CircleDollarSign size={16} /> Finance</>}
                </button>
              </div>

              {invoice.isVerified && (
                <div style={{ position: 'absolute', top: 50, right: -25, transform: 'rotate(45deg)', background: 'var(--success)', color: '#000', fontSize: '0.55rem', fontWeight: 900, padding: '4px 30px', boxShadow: '0 0 10px rgba(52, 211, 153, 0.4)' }}>
                  AI VERIFIED
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
