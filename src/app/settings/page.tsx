'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
    const [searchTerm, setSearchTerm] = useState('HungerBox');
    const [lookbackDays, setLookbackDays] = useState(30);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                setSearchTerm(data.emailSearchTerm);
                setLookbackDays(data.syncLookbackDays);
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
                    syncLookbackDays: Number(lookbackDays) // Ensure it's a number
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

    if (isLoading) return <div className="p-8">Loading Settings...</div>;

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <header className="mb-8">
                <h1>System Settings</h1>
                <p style={{ color: '#64748b' }}>Configure how the application retrieves and processes data.</p>
            </header>

            <form onSubmit={handleSave}>

                {/* Sync Configuration Section */}
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5' }}>
                            <RefreshCw size={20} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Sync Configuration</h2>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>

                        {/* Field 1: Search Term */}
                        <div className="form-group">
                            <label>Email Subject Search Term</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="e.g. HungerBox"
                                className="full-width-input"
                            />
                            <p className="help-text">
                                The application will search for emails containing this keyword in the subject or body to identify invoices.
                            </p>
                        </div>

                        {/* Field 2: Lookback Window */}
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
                                <br /><strong>Note:</strong> Larger windows may increase sync time significantly.
                            </p>
                        </div>

                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                            color: statusMsg.includes('Error') ? '#ef4444' : '#10b981',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            {statusMsg}
                        </span>
                    )}
                </div>

            </form>

            <style jsx>{`
        .mb-8 { margin-bottom: 2rem; }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
        }

        .help-text {
          font-size: 0.8rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .full-width-input {
          width: 100%;
        }

        .number-input {
          width: 120px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
