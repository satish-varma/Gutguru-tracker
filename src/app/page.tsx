'use client';

import { useState, useEffect } from 'react';
import { Invoice } from '@/types';
import { DashboardCharts } from '@/components/DashboardCharts';
import { Download } from 'lucide-react';

// Mock data for initial visualization (fallback)
const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-001', date: '2023-11-28', location: 'Bangalore - HQ', stall: 'Spice Route', amount: 12500.50, status: 'Processed' },
  { id: 'INV-002', date: '2023-11-29', location: 'Bangalore - HQ', stall: 'Juice Junction', amount: 3400.00, status: 'Processed' },
  { id: 'INV-003', date: '2023-11-29', location: 'Mumbai - Andheri', stall: 'Curry Point', amount: 8900.75, status: 'Pending' },
  { id: 'INV-004', date: '2023-11-30', location: 'Delhi - CyberHub', stall: 'Burger King', amount: 15200.00, status: 'Processed' },
];

import { MultiSelect } from '@/components/MultiSelect';
import { InvoiceDrawer } from '@/components/InvoiceDrawer';


import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStalls, setSelectedStalls] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Date Filter State
  // Filters & Search
  const [dateFilter, setDateFilter] = useState<string>('All Time');
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Custom Date Range
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [specificMonth, setSpecificMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [specificYear, setSpecificYear] = useState<string>(new Date().getFullYear().toString());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Sorting
  const [sortBy, setSortBy] = useState<string>('date-desc');

  useEffect(() => {
    fetchInvoices();
  }, []);


  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices');
      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        return;
      }

      if (result.success && result.data && result.data.length > 0) {
        // Sort by date descending (newest first)
        const sorted = result.data
          .map((inv: Invoice) => ({
            ...inv,
            location: inv.location === 'CGI Information Systems' ? 'CGI' :
              inv.location === 'DSM Shared Services' ? 'DSM' : inv.location
          }))
          .sort((a: Invoice, b: Invoice) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        setInvoices(sorted);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    // 1. Location Filter
    if (selectedLocations.length > 0 && !selectedLocations.includes(inv.location)) return false;

    // 2. Stall Filter
    if (selectedStalls.length > 0 && !selectedStalls.includes(inv.stall)) return false;

    // 3. Date Filter
    let matchesDate = true;
    if (dateFilter !== 'All Time') {
      const invDate = new Date(inv.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // normalize today

      if (dateFilter === 'Last 7 Days') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        matchesDate = invDate >= sevenDaysAgo && invDate <= new Date(new Date().setHours(23, 59, 59, 999));
      } else if (dateFilter === 'Last Month') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        matchesDate = invDate >= lastMonth && invDate <= new Date(new Date().setHours(23, 59, 59, 999));
      } else if (dateFilter === 'Last 3 Months') {
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        matchesDate = invDate >= threeMonthsAgo && invDate <= new Date(new Date().setHours(23, 59, 59, 999));
      } else if (dateFilter === 'Custom Range') {
        if (customStart && customEnd) {
          matchesDate = inv.date >= customStart && inv.date <= customEnd;
        }
      } else if (dateFilter === 'Specific Month') {
        const d = new Date(inv.date);
        const m = d.getMonth() + 1; // 1-12
        const y = d.getFullYear();
        matchesDate = m.toString() === specificMonth && y.toString() === specificYear;
      }
    }

    if (!matchesDate) return false;

    // 4. Status Filter
    if (statusFilter !== 'All Status' && inv.status !== statusFilter) return false;

    // 5. Search Term (ID, Stall, Amount)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      const matchesId = inv.id.toLowerCase().includes(lowerTerm);
      const matchesStall = inv.stall.toLowerCase().includes(lowerTerm);
      const matchesAmount = inv.amount.toString().includes(lowerTerm);
      if (!matchesId && !matchesStall && !matchesAmount) return false;
    }

    return true;
  });

  // Calculate unique years from data for the dropdown
  const uniqueYears = Array.from(new Set(invoices.map(inv => new Date(inv.date).getFullYear()))).sort((a, b) => b - a);
  const uniqueLocations = Array.from(new Set(invoices.map(inv => inv.location))).sort();
  // Ensure we at least have current year if no data
  if (uniqueYears.length === 0) uniqueYears.push(new Date().getFullYear());

  // Sorting Logic
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'amount-desc') return b.amount - a.amount;
    if (sortBy === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(sortedInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = sortedInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocations, selectedStalls, dateFilter, customStart, customEnd, specificMonth, specificYear, statusFilter, searchTerm]);

  const totalAmount = filteredInvoices.reduce((acc, inv) => acc + inv.amount, 0);
  const processedAmount = filteredInvoices
    .filter(inv => inv.status === 'Processed')
    .reduce((acc, inv) => acc + inv.amount, 0);
  const pendingAmount = filteredInvoices
    .filter(inv => inv.status === 'Pending')
    .reduce((acc, inv) => acc + inv.amount, 0);

  const locationStats = filteredInvoices.reduce((acc, inv) => {
    acc[inv.location] = (acc[inv.location] || 0) + inv.amount;
    return acc;
  }, {} as Record<string, number>);

  // Get unique stalls for the current selected location (BEFORE filtering by stall/date to keep dropdown populated)
  // Actually we should filter by location only for the dropdowns
  // Get unique stalls for the current selected locations
  const availableStalls = selectedLocations.length === 0
    ? invoices
    : invoices.filter(inv => selectedLocations.includes(inv.location));

  const uniqueStalls = Array.from(new Set(availableStalls.map(inv => inv.stall))).sort();

  const handleSync = async (fullSync = false) => {
    setIsSyncing(true);
    let totalSynced = 0;
    let batchCount = 0;
    const MAX_BATCHES = 20; // Safety limit to prevent infinite loops

    try {
      while (batchCount < MAX_BATCHES) {
        batchCount++;
        console.log(`[Sync] Starting batch ${batchCount}...`);

        const url = fullSync ? '/api/sync?full=true' : '/api/sync';
        const response = await fetch(url, { method: 'POST' });

        // Handle non-JSON responses (like 504 timeouts)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error('Server returned non-JSON response');
          if (response.status === 504 && totalSynced > 0) {
            // Got some invoices before timeout, report partial success
            await fetchInvoices();
            alert(`Synced ${totalSynced} invoices before timeout. Click sync again for more.`);
            return;
          }
          alert('Sync timed out. Please try again.');
          return;
        }

        let result;
        try {
          result = await response.json();
        } catch (e) {
          console.error('Failed to parse JSON:', e);
          if (totalSynced > 0) {
            await fetchInvoices();
            alert(`Synced ${totalSynced} invoices. Click sync again for more.`);
          } else {
            alert('Sync failed. Please try again.');
          }
          return;
        }

        if (!result.success) {
          alert(result.error || 'Sync failed. Check credentials.');
          return;
        }

        if (result.count > 0) {
          totalSynced += result.count;
          console.log(`[Sync] Batch ${batchCount}: Found ${result.count} new invoices. Total: ${totalSynced}`);
          // Continue to next batch
        } else {
          // No new invoices found - we're done!
          console.log(`[Sync] Batch ${batchCount}: No new invoices. Sync complete.`);
          break;
        }
      }

      // Refresh invoices list
      await fetchInvoices();

      if (totalSynced > 0) {
        alert(`✓ Sync complete! Found ${totalSynced} new invoices.`);
      } else {
        alert('Sync complete. No new invoices found.');
      }

    } catch (error: any) {
      console.error('Frontend Sync Error:', error);
      if (totalSynced > 0) {
        await fetchInvoices();
        alert(`Synced ${totalSynced} invoices before error. Try again for more.`);
      } else {
        alert('Failed to sync: ' + (error.message || 'Unknown network error'));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return;

    const headers = ['Invoice ID', 'Date', 'Location', 'Stall', 'Service Period', 'Amount', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredInvoices.map(inv => [
        inv.id,
        inv.date,
        `"${inv.location}"`,
        `"${inv.stall}"`,
        `"${inv.serviceDateRange || ''}"`,
        inv.amount,
        inv.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'hungerbox_invoices.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1>TheGutGuru Tracker</h1>
          <p style={{ color: '#94a3b8' }}>Payment Advice & Invoice Analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn glass-panel"
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSync(false)}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync Recent'}
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-panel stat-card">
          <span className="stat-label">Total Revenue</span>
          <span className="stat-value">₹{totalAmount.toLocaleString()}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label" style={{ color: '#10b981' }}>Processed</span>
          <span className="stat-value" style={{ fontSize: '1.5rem' }}>₹{processedAmount.toLocaleString()}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label" style={{ color: '#f59e0b' }}>Pending</span>
          <span className="stat-value" style={{ fontSize: '1.5rem' }}>₹{pendingAmount.toLocaleString()}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="stat-label">Active Stalls</span>
          <span className="stat-value">{new Set(filteredInvoices.map(i => i.stall)).size}</span>
        </div>
      </div>

      {/* Data Visualization Charts */}
      {!isLoading && filteredInvoices.length > 0 && (
        <DashboardCharts invoices={filteredInvoices} />
      )}

      {/* Main Content Area */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2>Recent Invoices</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search ID, Stall..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '180px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', padding: '0.6rem 1rem', borderRadius: '0.5rem', color: 'var(--foreground)' }}
            />

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--foreground)' }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
            {/* Multi-Select Locations */}
            <MultiSelect
              label="Location"
              options={uniqueLocations}
              value={selectedLocations}
              onChange={(vals) => {
                setSelectedLocations(vals);
                // Optional: Clear selected stalls if they are no longer valid? 
                // For now, let's keep it simple. If a stall is selected but not in the new location set, 
                // the filter logic (stall filter) handles it, or the stall filter logic might need to be smart.
                // However, usually it's better to clear stalls or filter them out.
                // Let's reset stalls if locations change to avoid invalid combinations?
                // Actually, standard behavior: keep selections if possible.
                // But simplified: reset stalls on location change is often safer.
                // Let's NOT reset for now (user might want to select generic stall names across locations if names matched).
                // Actually, names are unique per location now (e.g. Stall X Location Y).
                // So old selections will naturally result in 0 results unless user clears them.
              }}
            />

            {/* Multi-Select Stalls */}
            <MultiSelect
              label="Stall"
              options={uniqueStalls}
              value={selectedStalls}
              onChange={setSelectedStalls}
            />

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--foreground)' }}
            >
              <option value="All Time">All Time</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last Month">Last Month</option>
              <option value="Last 3 Months">Last 3 Months</option>
              <option value="Specific Month">Specific Month</option>
              <option value="Custom Range">Custom Range</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--foreground)' }}
            >
              <option value="All Status">All Status</option>
              <option value="Processed">Processed</option>
              <option value="Pending">Pending</option>
            </select>

            {dateFilter === 'Specific Month' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={specificMonth}
                  onChange={(e) => setSpecificMonth(e.target.value)}
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--foreground)' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>
                  ))}
                </select>
                <select
                  value={specificYear}
                  onChange={(e) => setSpecificYear(e.target.value)}
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--foreground)' }}
                >
                  {uniqueYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {dateFilter === 'Custom Range' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', padding: '0.4rem', borderRadius: '0.5rem', color: 'var(--foreground)' }}
                />
                <span style={{ color: '#94a3b8' }}>-</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', padding: '0.4rem', borderRadius: '0.5rem', color: 'var(--foreground)' }}
                />
              </div>
            )}

          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Service Period</th>
                <th>Date</th>
                <th>Location</th>
                <th>Stall Name</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No invoices found. Sync to fetch new data.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv, index) => (
                  <tr
                    key={`${inv.id}-${index}`}
                    onClick={() => setSelectedInvoice(inv)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td
                      title={`Invoice ID: ${inv.id}`}
                      style={{ fontSize: '0.85rem', color: '#475569', cursor: 'help' }}
                    >
                      {inv.serviceDateRange || 'N/A'}
                    </td>
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredInvoices.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 0.5rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Showing <span style={{ fontWeight: 600, color: '#0f172a' }}>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)}</span> of <span style={{ fontWeight: 600, color: '#0f172a' }}>{filteredInvoices.length}</span> results
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn glass-panel"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '0.5rem 1rem' }}
              >
                Previous
              </button>
              <button
                className="btn glass-panel"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '0.5rem 1rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <InvoiceDrawer
        isOpen={!!selectedInvoice}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

    </main>
  );
}
