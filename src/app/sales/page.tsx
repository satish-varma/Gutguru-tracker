'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    DollarSign,
    RefreshCcw,
    Calendar,
    MapPin,
    Store,
    Tag,
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    ChevronRight,
    Search
} from 'lucide-react';
import { format } from 'date-fns';

export default function SalesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sales, setSales] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (status === 'authenticated') {
            fetchSales();
        }
    }, [status, router]);

    const fetchSales = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/sales?limit=50');
            const result = await res.json();
            if (result.success) {
                setSales(result.data || []);
                setLastSynced(result.lastSynced);
            }
        } catch (error) {
            console.error('Failed to fetch sales', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/sync/hungerbox-sales', { method: 'POST' });
            const result = await res.json();

            if (result.success) {
                alert('Sync trigger sent! The worker will update data in a few minutes.');
                // Refresh data after a short delay or just let the user know
                setTimeout(fetchSales, 5000);
            } else {
                const errorMsg = result.error || 'Unknown error';
                const details = result.details ? `\n\nDetails: ${result.details}` : '';
                alert(`Sync failed: ${errorMsg}${details}`);
            }
        } catch (error) {
            alert('Fatal error triggering sync');
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredSales = sales.filter(sale =>
        sale.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.cafeteriaName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.orderId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalSalesAmount = filteredSales.reduce((sum, s) => sum + (s.amount || 0), 0);

    if (isLoading && sales.length === 0) {
        return (
            <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <RefreshCcw size={48} className="animate-spin" style={{ color: '#0284c7', margin: '0 auto 1rem' }} />
                    <p style={{ color: '#64748b' }}>Loading sales data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '1200px' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', padding: '0.5rem', borderRadius: '10px', color: 'white' }}>
                            <TrendingUp size={24} />
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 700 }}>Sales Management</h1>
                    </div>
                    <p style={{ color: '#64748b', margin: 0 }}>
                        Real-time order tracking and sales performance from HungerBox.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {lastSynced && (
                        <div className="last-synced-desktop" style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Synced</div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                                {format(new Date(lastSynced), 'MMM d, h:mm a')}
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="btn btn-primary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.25rem',
                            boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.2)'
                        }}
                    >
                        <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Starting Sync...' : 'Sync HungerBox Now'}
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Sales (Visible)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                        ₹{totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Order Count</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
                        {filteredSales.length}
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Worker Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Connected</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Recent Orders</h3>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                width: '240px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Order Details</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Items</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Location</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map((sale) => (
                                <tr key={sale.id} className="table-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{sale.orderId}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Calendar size={12} />
                                            {format(new Date(sale.orderDate), 'MMM d, yyyy h:mm a')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Tag size={14} style={{ color: '#0ea5e9' }} />
                                            <span style={{ fontSize: '0.875rem' }}>{sale.itemName || 'Multiple Items'}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{sale.vendorName}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                                            <MapPin size={14} style={{ color: '#64748b' }} />
                                            {sale.cafeteriaName}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.625rem',
                                            borderRadius: '99px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: sale.status === 'Completed' ? '#f0fdf4' : '#fff7ed',
                                            color: sale.status === 'Completed' ? '#166534' : '#9a3412',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            {sale.status === 'Completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                            {sale.status || 'Pending'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>₹{sale.amount.toFixed(2)}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredSales.length === 0 && (
                        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                            <div style={{ background: '#f8fafc', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <AlertCircle size={32} style={{ color: '#94a3b8' }} />
                            </div>
                            <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>No orders found</h3>
                            <p style={{ color: '#64748b', maxWidth: '320px', margin: '0 auto 1.5rem' }}>
                                Try adjusting your search or trigger a new sync to fetch the latest sales data.
                            </p>
                            {['admin', 'manager'].includes(session?.user?.role?.toLowerCase() || '') && (
                                <button
                                    onClick={() => router.push('/settings')}
                                    className="btn"
                                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0284c7' }}
                                >
                                    Check Worker Configuration
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ padding: '1rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
                    <button style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        View Full Sales History <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <style jsx>{`
                .container {
                    padding: 2rem;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .table-row:hover {
                    background-color: #f8fafc !important;
                }
                .last-synced-desktop {
                    display: none;
                }
                @media (min-width: 768px) {
                    .last-synced-desktop {
                        display: block;
                    }
                }
            `}</style>
        </div>
    );
}
