import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import './ComplianceCenter.css';

/**
 * Compliance Center Component
 * Manages KYC verification, GDPR data rights, and tax reporting
 */
const ComplianceCenter = () => {
    const { address } = useAccount();
    const [activeTab, setActiveTab] = useState('kyc');
    const [kycStatus, setKycStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (address) {
            fetchComplianceStatus();
        }
    }, [address]);

    const fetchComplianceStatus = async () => {
        try {
            const response = await fetch(`/api/compliance/status/${address}`);
            const data = await response.json();
            setKycStatus(data);
        } catch (error) {
            console.error('Error fetching compliance status:', error);
        }
    };

    const initiateKYC = async (provider) => {
        setLoading(true);
        try {
            const response = await fetch('/api/kyc/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet_address: address,
                    provider: provider
                })
            });

            const data = await response.json();

            if (data.inquiry_url) {
                // Open KYC verification in new window
                window.open(data.inquiry_url, '_blank');
            }
        } catch (error) {
            console.error('Error initiating KYC:', error);
        } finally {
            setLoading(false);
        }
    };

    const requestDataExport = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/gdpr/export/${address}`, {
                method: 'POST'
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `polylance-data-${address}.json`;
            a.click();
        } catch (error) {
            console.error('Error exporting data:', error);
        } finally {
            setLoading(false);
        }
    };

    const requestDataDeletion = async () => {
        if (!confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        try {
            await fetch(`/api/gdpr/delete/${address}`, {
                method: 'DELETE'
            });

            alert('Your data deletion request has been submitted. You will receive confirmation within 30 days.');
        } catch (error) {
            console.error('Error deleting data:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadTaxReport = async (year, reportType) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/tax/report/${address}/${year}/${reportType}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tax-report-${year}-${reportType}.csv`;
            a.click();
        } catch (error) {
            console.error('Error downloading tax report:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderKYCTab = () => (
        <div className="tab-content">
            <h2>🔐 Identity Verification (KYC/AML)</h2>

            {kycStatus ? (
                <div className="kyc-status-card">
                    <div className="status-badge" data-level={kycStatus.kyc_level}>
                        {getKYCLevelName(kycStatus.kyc_level)}
                    </div>

                    <div className="status-details">
                        <p><strong>Status:</strong> {kycStatus.status}</p>
                        <p><strong>Provider:</strong> {kycStatus.provider}</p>
                        <p><strong>Verified:</strong> {new Date(kycStatus.verified_at * 1000).toLocaleDateString()}</p>
                        <p><strong>Expires:</strong> {new Date(kycStatus.expires_at * 1000).toLocaleDateString()}</p>
                        <p><strong>Jurisdiction:</strong> {kycStatus.jurisdiction}</p>
                    </div>

                    <div className="transaction-limits">
                        <h3>Transaction Limits</h3>
                        <div className="limits-grid">
                            <div className="limit-item">
                                <span className="limit-label">Daily Limit:</span>
                                <span className="limit-value">${kycStatus.limits?.daily_limit?.toLocaleString()}</span>
                            </div>
                            <div className="limit-item">
                                <span className="limit-label">Monthly Limit:</span>
                                <span className="limit-value">${kycStatus.limits?.monthly_limit?.toLocaleString()}</span>
                            </div>
                            <div className="limit-item">
                                <span className="limit-label">Per Transaction:</span>
                                <span className="limit-value">${kycStatus.limits?.transaction_limit?.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="kyc-onboarding">
                    <p className="info-text">
                        Complete identity verification to unlock higher transaction limits and access premium features.
                    </p>

                    <div className="kyc-levels">
                        <div className="level-card">
                            <h3>📧 Basic</h3>
                            <p>Email + Phone Verification</p>
                            <ul>
                                <li>$500 per transaction</li>
                                <li>$1,000 daily limit</li>
                                <li>$5,000 monthly limit</li>
                            </ul>
                            <button onClick={() => initiateKYC('persona')} disabled={loading}>
                                Start Basic KYC
                            </button>
                        </div>

                        <div className="level-card featured">
                            <h3>🆔 Intermediate</h3>
                            <p>Government ID Verification</p>
                            <ul>
                                <li>$5,000 per transaction</li>
                                <li>$10,000 daily limit</li>
                                <li>$50,000 monthly limit</li>
                            </ul>
                            <button onClick={() => initiateKYC('persona')} disabled={loading}>
                                Start Intermediate KYC
                            </button>
                        </div>

                        <div className="level-card">
                            <h3>✅ Advanced</h3>
                            <p>Full KYC + Proof of Address</p>
                            <ul>
                                <li>$50,000 per transaction</li>
                                <li>$100,000 daily limit</li>
                                <li>$500,000 monthly limit</li>
                            </ul>
                            <button onClick={() => initiateKYC('sumsub')} disabled={loading}>
                                Start Advanced KYC
                            </button>
                        </div>

                        <div className="level-card">
                            <h3>🏢 Institutional</h3>
                            <p>Business Verification</p>
                            <ul>
                                <li>$500,000 per transaction</li>
                                <li>$1,000,000 daily limit</li>
                                <li>$10,000,000 monthly limit</li>
                            </ul>
                            <button onClick={() => initiateKYC('sumsub')} disabled={loading}>
                                Contact Sales
                            </button>
                        </div>
                    </div>

                    <div className="provider-logos">
                        <p>Powered by:</p>
                        <img src="/assets/persona-logo.png" alt="Persona" />
                        <img src="/assets/sumsub-logo.png" alt="Sumsub" />
                    </div>
                </div>
            )}
        </div>
    );

    const renderGDPRTab = () => (
        <div className="tab-content">
            <h2>🛡️ Data Privacy (GDPR)</h2>

            <div className="gdpr-rights">
                <div className="right-card">
                    <h3>📥 Right to Access</h3>
                    <p>Download all your personal data in machine-readable format.</p>
                    <button onClick={requestDataExport} disabled={loading}>
                        Export My Data
                    </button>
                </div>

                <div className="right-card">
                    <h3>✏️ Right to Rectification</h3>
                    <p>Update or correct your personal information.</p>
                    <button onClick={() => setActiveTab('profile')}>
                        Update Profile
                    </button>
                </div>

                <div className="right-card">
                    <h3>🗑️ Right to Erasure</h3>
                    <p>Request permanent deletion of your personal data.</p>
                    <button onClick={requestDataDeletion} disabled={loading} className="danger">
                        Delete My Data
                    </button>
                </div>

                <div className="right-card">
                    <h3>📤 Right to Portability</h3>
                    <p>Transfer your data to another service provider.</p>
                    <button onClick={requestDataExport} disabled={loading}>
                        Export for Transfer
                    </button>
                </div>
            </div>

            <div className="consent-management">
                <h3>Consent Management</h3>
                <div className="consent-list">
                    <ConsentItem
                        category="Marketing Communications"
                        description="Receive updates about new features and promotions"
                        defaultValue={true}
                    />
                    <ConsentItem
                        category="Analytics"
                        description="Help us improve the platform with usage analytics"
                        defaultValue={true}
                    />
                    <ConsentItem
                        category="Third-Party Sharing"
                        description="Share data with KYC providers for verification"
                        defaultValue={true}
                        required={true}
                    />
                </div>
            </div>

            <div className="privacy-info">
                <p>
                    <strong>Data Controller:</strong> PolyLance Ltd.<br />
                    <strong>DPO Contact:</strong> privacy@polylance.io<br />
                    <strong>Supervisory Authority:</strong> ICO (UK)
                </p>
            </div>
        </div>
    );

    const renderTaxTab = () => (
        <div className="tab-content">
            <h2>💰 Tax Reporting</h2>

            <div className="tax-summary">
                <h3>2025 Tax Year Summary</h3>
                <div className="summary-grid">
                    <div className="summary-item">
                        <span className="label">Total Earnings:</span>
                        <span className="value">$45,230.00</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Platform Fees Paid:</span>
                        <span className="value">$1,130.75</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Gas Fees:</span>
                        <span className="value">$234.50</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Net Income:</span>
                        <span className="value">$43,864.75</span>
                    </div>
                </div>
            </div>

            <div className="tax-reports">
                <h3>Available Reports</h3>

                <div className="report-card">
                    <h4>📄 Annual Transaction Report</h4>
                    <p>Complete list of all transactions for tax filing</p>
                    <button onClick={() => downloadTaxReport(2025, 'transactions')}>
                        Download CSV
                    </button>
                </div>

                <div className="report-card">
                    <h4>📊 1099-NEC Forms</h4>
                    <p>Non-employee compensation forms (US only)</p>
                    <button onClick={() => downloadTaxReport(2025, '1099-nec')}>
                        Download PDF
                    </button>
                </div>

                <div className="report-card">
                    <h4>🌍 W-8BEN Form</h4>
                    <p>Certificate of foreign status (Non-US freelancers)</p>
                    <button onClick={() => downloadTaxReport(2025, 'w8ben')}>
                        Download PDF
                    </button>
                </div>

                <div className="report-card">
                    <h4>📈 Quarterly Estimates</h4>
                    <p>Estimated tax payments for self-employed</p>
                    <button onClick={() => downloadTaxReport(2025, 'quarterly')}>
                        Download All Quarters
                    </button>
                </div>

                <div className="report-card">
                    <h4>💸 Expense Report</h4>
                    <p>Deductible business expenses</p>
                    <button onClick={() => downloadTaxReport(2025, 'expenses')}>
                        Download CSV
                    </button>
                </div>

                <div className="report-card">
                    <h4>₿ Crypto Tax Report</h4>
                    <p>Capital gains/losses for cryptocurrency</p>
                    <button onClick={() => downloadTaxReport(2025, 'crypto')}>
                        Download CSV
                    </button>
                </div>
            </div>

            <div className="tax-disclaimer">
                <p>
                    ⚠️ <strong>Disclaimer:</strong> These reports are provided for informational purposes only.
                    Please consult with a qualified tax professional for advice specific to your situation.
                </p>
            </div>
        </div>
    );

    return (
        <div className="compliance-center">
            <div className="compliance-header">
                <h1>Compliance Center</h1>
                <p>Manage your identity verification, data privacy, and tax reporting</p>
            </div>

            <div className="compliance-tabs">
                <button
                    className={activeTab === 'kyc' ? 'active' : ''}
                    onClick={() => setActiveTab('kyc')}
                >
                    🔐 KYC/AML
                </button>
                <button
                    className={activeTab === 'gdpr' ? 'active' : ''}
                    onClick={() => setActiveTab('gdpr')}
                >
                    🛡️ Data Privacy
                </button>
                <button
                    className={activeTab === 'tax' ? 'active' : ''}
                    onClick={() => setActiveTab('tax')}
                >
                    💰 Tax Reports
                </button>
            </div>

            <div className="compliance-content">
                {activeTab === 'kyc' && renderKYCTab()}
                {activeTab === 'gdpr' && renderGDPRTab()}
                {activeTab === 'tax' && renderTaxTab()}
            </div>
        </div>
    );
};

const ConsentItem = ({ category, description, defaultValue, required }) => {
    const [consented, setConsented] = useState(defaultValue);

    const handleToggle = async () => {
        if (required) return;

        setConsented(!consented);

        // Update consent in backend
        await fetch('/api/gdpr/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category,
                consented: !consented
            })
        });
    };

    return (
        <div className="consent-item">
            <div className="consent-info">
                <h4>{category}</h4>
                <p>{description}</p>
                {required && <span className="required-badge">Required</span>}
            </div>
            <label className="toggle-switch">
                <input
                    type="checkbox"
                    checked={consented}
                    onChange={handleToggle}
                    disabled={required}
                />
                <span className="slider"></span>
            </label>
        </div>
    );
};

const getKYCLevelName = (level) => {
    const levels = ['None', 'Basic', 'Intermediate', 'Advanced', 'Institutional'];
    return levels[level] || 'Unknown';
};

export default ComplianceCenter;
