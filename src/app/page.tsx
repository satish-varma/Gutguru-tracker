'use client';

import { useState } from 'react';

// Mock data for initial visualization
const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-001', date: '2023-11-28', location: 'Bangalore - HQ', stall: 'Spice Route', amount: 12500.50, status: 'Processed' },
  { id: 'INV-002', date: '2023-11-29', location: 'Bangalore - HQ', stall: 'Juice Junction', amount: 3400.00, status: 'Processed' },
  { id: 'INV-003', date: '2023-11-29', location: 'Mumbai - Andheri', stall: 'Curry Point', amount: 8900.75, status: 'Pending' },
  { id: 'INV-004', date: '2023-11-30', location: 'Delhi - CyberHub', stall: 'Burger King', amount: 15200.00, status: 'Processed' },
];


interface Invoice {
  id: string;
  date: string;
  location: string;
  stall: string;
  amount: number;
  status: 'Processed' | 'Pending';
}

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [isSyncing, setIsSyncing] = useState(false);

  const totalAmount = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const locationStats = invoices.reduce((acc, inv) => {
    acc[inv.location] = (acc[inv.location] || 0) + inv.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        // cast result.data to Invoice[] assuming API returns correct shape
        const newInvoices = result.data as Invoice[];
        setInvoices(prev => [...newInvoices, ...prev]);
        alert(`Synced ${result.count} new invoices!`);
      } else {
        alert(result.message || 'No new invoices found.');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to sync. Check console for details.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1>HungerBox Tracker</h1>
          <p style={{ color: '#94a3b8' }}>Payment Advice & Invoice Analytics</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Sync Invoices'}
        </button>
      </header>

      {/* Stats Row */}
      <div className="grid-cols-3" style={{ marginBottom: '3rem' }}>
        <div className="glass-panel stat-card">
          <span className="stat-label">Total Revenue</span>
          <span className="stat-value">₹{totalAmount.toLocaleString()}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">Top Location</span>
          <span className="stat-value">
            {Object.entries(locationStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
          </span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">Active Stalls</span>
          <span className="stat-value">{new Set(invoices.map(i => i.stall)).size}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2>Recent Invoices</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #334155', padding: '0.5rem', borderRadius: '0.5rem', color: '#fff' }}>
              <option>All Locations</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>Location</th>
                <th>Stall Name</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{inv.date}</td>
                  <td>{inv.location}</td>
                  <td>{inv.stall}</td>
                  <td style={{ fontWeight: 600 }}>₹{inv.amount.toLocaleString()}</td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      background: inv.status === 'Processed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: inv.status === 'Processed' ? '#34d399' : '#fbbf24'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
