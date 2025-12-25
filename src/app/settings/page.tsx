'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Settings as SettingsIcon, AlertTriangle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (status === 'authenticated' && session?.user?.role !== 'manager' && session?.user?.role !== 'admin') {
            router.push('/');
        }
    }, [status, session, router]);

    const [searchTerm, setSearchTerm] = useState('TheGutGuru');
    const [lookbackDays, setLookbackDays] = useState(30);
    const [emailUser, setEmailUser] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [syncInterval, setSyncInterval] = useState(6);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    // Modal State
    const [showResetModal, setShowResetModal] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                setSearchTerm(data.emailSearchTerm);
                setLookbackDays(data.syncLookbackDays);
                setEmailUser(data.emailUser || '');
                setEmailPassword(data.emailPassword || '');
                setSyncInterval(data.syncIntervalHours || 6);
            } catch (e) {
                console.error('Failed to load settings', e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setStatusMsg('');

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emailSearchTerm: searchTerm,
                    syncLookbackDays: Number(lookbackDays),
                    emailUser,
                    emailPassword,
                    syncIntervalHours: Number(syncInterval)
                }),
            });

            if (res.ok) {
                setStatusMsg('Settings saved successfully!');
                setTimeout(() => setStatusMsg(''), 3000);
            } else {
                setStatusMsg('Error saving settings.');
            }
        } catch (e) {
            setStatusMsg('Network error.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSync = async (fullSync = false) => {
        setIsSyncing(true);
        setStatusMsg('');
        try {
            const url = fullSync ? '/api/sync?full=true' : '/api/sync';
            const response = await fetch(url, { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                setStatusMsg(result.count > 0 ? `Synced ${result.count} new invoices!` : 'Sync completed. No new invoices.');
            } else {
                setStatusMsg('Error: ' + (result.error || 'Sync failed'));
            }
        } catch (error) {
            console.error(error);
            setStatusMsg('Sync failed due to network error.');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setStatusMsg(''), 5000);
        }
    };

    const performReset = async () => {
        setIsResetting(true);
        try {
            const res = await fetch('/api/invoices', { method: 'DELETE' });
            const result = await res.json();

            if (res.ok) {
                // Success
                setShowResetModal(false);
                alert(result.message || 'All data has been wiped.');
                router.push('/');
                router.refresh();
            } else {
                alert(`Failed to reset data: ${result.error || 'Unknown error'}`);
                setShowResetModal(false);
            }
        } catch (error) {
            alert('Network error during reset.');
            setShowResetModal(false);
        } finally {
            setIsResetting(false);
        }
    };

    if (isLoading) return <div className="p-8">Loading Settings...</div>;

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <header className="mb-8">
                <h1>System Settings</h1>
                <p style={{ color: '#64748b' }}>Configure how the application retrieves and processes data.</p>
            </header>

            <form onSubmit={handleSave}>
                {/* Sync Config Section */}
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5' }}>
                            <RefreshCw size={20} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Sync Configuration</h2>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label>Email Subject Search Term</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="e.g. TheGutGuru"
                                className="full-width-input"
                            />
                            <p className="help-text">
                                The application will search for emails containing this keyword in the subject or body to identify invoices.
                            </p>
                        </div>

                        <div className="form-group">
                            <label>Sync Lookback Window (Days)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input
                                    type="number"
                                    value={lookbackDays}
                                    onChange={(e) => setLookbackDays(Number(e.target.value))}
                                    min="1"
                                    max="3650"
                                    className="number-input"
                                />
                                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>days into the past</span>
                            </div>
                            <p className="help-text">
                                When "Full Sync" is triggered, the system will check emails from this many days ago.
                            </p>
                        </div>

                        {session?.user?.role === 'admin' && (
                            <div className="form-group">
                                <label>Auto-Sync Interval (Hours)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <select
                                        value={syncInterval}
                                        onChange={(e) => setSyncInterval(Number(e.target.value))}
                                        className="full-width-input"
                                        style={{ maxWidth: '200px' }}
                                    >
                                        <option value={1}>Every 1 Hour</option>
                                        <option value={3}>Every 3 Hours</option>
                                        <option value={6}>Every 6 Hours (Recommended)</option>
                                        <option value={12}>Every 12 Hours</option>
                                        <option value={24}>Every 24 Hours</option>
                                    </select>
                                </div>
                                <p className="help-text">
                                    Determines how frequently the system checks for new invoices. Note: System-wide changes take effect on next deployment.
                                </p>
                            </div>
                        )}

                        <div style={{ paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            <button
                                type="button"
                                onClick={() => handleSync(true)}
                                disabled={isSyncing}
                                className="btn"
                                style={{
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    border: '1px solid #bfdbfe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    width: '100%',
                                    justifyContent: 'center'
                                }}
                            >
                                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                                {isSyncing ? 'Running Full Sync...' : 'Trigger Full Sync Now'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Email Credentials Section */}
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', background: '#ecfdf5', borderRadius: '8px', color: '#059669' }}>
                            <SettingsIcon size={20} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>IMAP Credentials</h2>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={emailUser}
                                onChange={(e) => setEmailUser(e.target.value)}
                                placeholder="name@company.com"
                                className="full-width-input"
                            />
                        </div>

                        <div className="form-group">
                            <label>App Password</label>
                            <input
                                type="password"
                                value={emailPassword}
                                onChange={(e) => setEmailPassword(e.target.value)}
                                placeholder="Enter your App Password"
                                className="full-width-input"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSaving}
                        style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', height: '44px' }}
                    >
                        {isSaving ? 'Saving...' : (
                            <>
                                <Save size={18} style={{ marginRight: '0.5rem' }} />
                                Save Changes
                            </>
                        )}
                    </button>
                    {statusMsg && (
                        <span style={{
                            color: statusMsg.includes('Error') || statusMsg.includes('Failed') ? '#ef4444' : '#10b981',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            {statusMsg}
                        </span>
                    )}
                </div>
            </form>

            {/* Danger Zone */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid #fee2e2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.5rem', background: '#fee2e2', borderRadius: '8px', color: '#ef4444' }}>
                        <AlertTriangle size={20} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#b91c1c' }}>Danger Zone</h2>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Reset All Data</h3>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                            This will permanently delete all your synced invoices. Cannot be undone.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="btn"
                        style={{
                            background: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fda4af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Trash2 size={16} />
                        Reset Data
                    </button>
                </div>
            </div>

            {/* Custom Modal */}
            {showResetModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div className="bg-white rounded-xl shadow-2xl p-6" style={{ maxWidth: '400px', width: '90%' }}>
                        <h3 className="text-lg font-bold text-red-600 mb-2">Confirm Data Reset</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete ALL synced invoices? This action cannot be undone. You will need to perform a full sync to recover data.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="btn"
                                style={{ border: '1px solid #e2e8f0' }}
                                disabled={isResetting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={performReset}
                                className="btn bg-red-600 text-white hover:bg-red-700"
                                disabled={isResetting}
                            >
                                {isResetting ? 'Resetting...' : 'Yes, Delete Everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
        .mb-8 { margin-bottom: 2rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        label { font-size: 0.875rem; font-weight: 600; color: #334155; }
        .help-text { font-size: 0.8rem; color: #94a3b8; line-height: 1.4; }
        .full-width-input { width: 100%; }
        .number-input { width: 120px; }
      `}</style>
        </div>
    );
}
