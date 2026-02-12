import React, { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite } from 'wagmi';
import { formatUnits } from 'viem';
import InvoiceNFTABI from '../abis/InvoiceNFT.json';

const INVOICE_STATUS = {
    0: { label: 'Pending', color: '#f59e0b', icon: '⏳' },
    1: { label: 'Verified', color: '#3b82f6', icon: '✓' },
    2: { label: 'Financed', color: '#8b5cf6', icon: '💰' },
    3: { label: 'Paid', color: '#22c55e', icon: '✅' },
    4: { label: 'Defaulted', color: '#ef4444', icon: '❌' },
    5: { label: 'Disputed', color: '#f97316', icon: '⚠️' }
};

export default function InvoiceMarketplace({ contractAddress }) {
    const { address } = useAccount();
    const [invoices, setInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [offerAmount, setOfferAmount] = useState('');

    // Fetch user's invoices (as issuer)
    const { data: issuerInvoices } = useContractRead({
        address: contractAddress,
        abi: InvoiceNFTABI,
        functionName: 'getIssuerInvoices',
        args: [address],
        enabled: !!address
    });

    // Finance invoice
    const { write: financeInvoice, isLoading: isFinancing } = useContractWrite({
        address: contractAddress,
        abi: InvoiceNFTABI,
        functionName: 'financeInvoice'
    });

    const handleFinance = (invoiceId) => {
        if (!offerAmount) return;

        financeInvoice({
            args: [BigInt(invoiceId), parseUnits(offerAmount, 6)],
            value: 0n // Assuming USDC payment
        });
    };

    const calculateDiscount = (faceValue, offerAmount) => {
        const discount = ((faceValue - offerAmount) / faceValue) * 100;
        return discount.toFixed(2);
    };

    const calculateAPR = (faceValue, offerAmount, daysUntilDue) => {
        const profit = faceValue - offerAmount;
        const apr = (profit / offerAmount) * (365 / daysUntilDue) * 100;
        return apr.toFixed(2);
    };

    return (
        <div className="invoice-marketplace">
            <div className="marketplace-header">
                <h1>📄 Invoice Marketplace</h1>
                <p>Finance invoices at a discount and earn yield</p>
            </div>

            <div className="marketplace-stats">
                <div className="stat-card">
                    <div className="stat-icon">💼</div>
                    <div className="stat-content">
                        <div className="stat-value">24</div>
                        <div className="stat-label">Active Invoices</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <div className="stat-value">$1.2M</div>
                        <div className="stat-label">Total Volume</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                        <div className="stat-value">12.5%</div>
                        <div className="stat-label">Avg APR</div>
                    </div>
                </div>
            </div>

            <div className="invoice-grid">
                {/* Example invoices - in production, fetch from contract */}
                {[
                    {
                        id: 1,
                        issuer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                        debtor: 'Acme Corp',
                        faceValue: 10000,
                        dueDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
                        status: 1,
                        isVerified: true
                    },
                    {
                        id: 2,
                        issuer: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
                        debtor: 'TechStart Inc',
                        faceValue: 25000,
                        dueDate: Date.now() + 45 * 24 * 60 * 60 * 1000,
                        status: 1,
                        isVerified: true
                    },
                    {
                        id: 3,
                        issuer: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
                        debtor: 'Global Services LLC',
                        faceValue: 50000,
                        dueDate: Date.now() + 90 * 24 * 60 * 60 * 1000,
                        status: 1,
                        isVerified: true
                    }
                ].map((invoice) => {
                    const daysUntilDue = Math.floor((invoice.dueDate - Date.now()) / (24 * 60 * 60 * 1000));
                    const suggestedOffer = invoice.faceValue * 0.95; // 5% discount
                    const apr = calculateAPR(invoice.faceValue, suggestedOffer, daysUntilDue);

                    return (
                        <div key={invoice.id} className="invoice-card">
                            <div className="invoice-header">
                                <div className="invoice-id">Invoice #{invoice.id}</div>
                                <div
                                    className="invoice-status"
                                    style={{ color: INVOICE_STATUS[invoice.status].color }}
                                >
                                    {INVOICE_STATUS[invoice.status].icon} {INVOICE_STATUS[invoice.status].label}
                                </div>
                            </div>

                            <div className="invoice-details">
                                <div className="detail-row">
                                    <span className="detail-label">Debtor:</span>
                                    <span className="detail-value">{invoice.debtor}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Face Value:</span>
                                    <span className="detail-value face-value">${invoice.faceValue.toLocaleString()}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Due In:</span>
                                    <span className="detail-value">{daysUntilDue} days</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Suggested Offer:</span>
                                    <span className="detail-value suggested-offer">${suggestedOffer.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="invoice-metrics">
                                <div className="metric">
                                    <div className="metric-label">Discount</div>
                                    <div className="metric-value discount">5%</div>
                                </div>
                                <div className="metric">
                                    <div className="metric-label">Est. APR</div>
                                    <div className="metric-value apr">{apr}%</div>
                                </div>
                                {invoice.isVerified && (
                                    <div className="verified-badge">
                                        ✓ AI Verified
                                    </div>
                                )}
                            </div>

                            <div className="finance-section">
                                <input
                                    type="number"
                                    placeholder="Your offer (USDC)"
                                    className="offer-input"
                                    onChange={(e) => setOfferAmount(e.target.value)}
                                />
                                <button
                                    className="btn-finance"
                                    onClick={() => handleFinance(invoice.id)}
                                    disabled={isFinancing}
                                >
                                    {isFinancing ? '⏳ Processing...' : '💰 Finance Invoice'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
        .invoice-marketplace {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .marketplace-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .marketplace-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .marketplace-header p {
          color: #94a3b8;
          font-size: 1.125rem;
        }

        .marketplace-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(99, 102, 241, 0.2);
        }

        .stat-icon {
          font-size: 2.5rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #e2e8f0;
        }

        .stat-label {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .invoice-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .invoice-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.8));
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .invoice-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(99, 102, 241, 0.3);
          border-color: rgba(99, 102, 241, 0.4);
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
        }

        .invoice-id {
          font-weight: 700;
          font-size: 1.125rem;
          color: #e2e8f0;
        }

        .invoice-status {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .invoice-details {
          margin-bottom: 1.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .detail-label {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .detail-value {
          color: #e2e8f0;
          font-weight: 600;
        }

        .face-value {
          color: #6366f1;
          font-size: 1.125rem;
        }

        .suggested-offer {
          color: #22c55e;
        }

        .invoice-metrics {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .metric {
          flex: 1;
          min-width: 80px;
          text-align: center;
          padding: 0.75rem;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 8px;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 0.25rem;
        }

        .metric-value {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .discount {
          color: #f59e0b;
        }

        .apr {
          color: #22c55e;
        }

        .verified-badge {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          color: #22c55e;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .finance-section {
          display: flex;
          gap: 0.75rem;
        }

        .offer-input {
          flex: 1;
          padding: 0.75rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 1rem;
        }

        .offer-input:focus {
          outline: none;
          border-color: #6366f1;
        }

        .btn-finance {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .btn-finance:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.4);
        }

        .btn-finance:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
        </div>
    );
}
