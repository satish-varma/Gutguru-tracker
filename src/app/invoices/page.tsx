'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Invoice } from '@/types';
import { MultiSelect } from '@/components/MultiSelect';
import { InvoiceDrawer } from '@/components/InvoiceDrawer';
import { GroupedInvoiceView } from '@/components/GroupedInvoiceView';
import { Download, Filter, Search, CreditCard, CheckSquare, Save, Bookmark, Calendar, X, List, Layers } from 'lucide-react';

// Saved filter type
interface SavedFilter {
    id: string;
    name: string;
    searchTerm: string;
    locations: string[];
    stalls: string[];
    dateFilter: string;
    statusFilter: string;
    minAmount: string;
    maxAmount: string;
    monthFilter: string;
    yearFilter: string;
    customDateFrom: string;
    customDateTo: string;
    selectedUser?: string;
}

export default function InvoicesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [selectedStalls, setSelectedStalls] = useState<string[]>([]);
    const [dateFilter, setDateFilter] = useState('All Time');
    const [statusFilter, setStatusFilter] = useState('All Status');

    // Amount Range Filter
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    // Month/Year Filter
    const [monthFilter, setMonthFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');

    // Custom Date Range
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Saved Filters
    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
    const [filterName, setFilterName] = useState('');
    const [showSaveFilter, setShowSaveFilter] = useState(false);

    // Team Users (for manager/admin filter)
    const [teamUsers, setTeamUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('All Users');

    // View Mode: 'list' or 'grouped'
    const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15; // Show more per page on full view

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    // Load saved filters from localStorage (user-specific)
    useEffect(() => {
        if (!session?.user?.email) return;
        const storageKey = `hungerbox-saved-filters-${session.user.email}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setSavedFilters(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to load saved filters:', e);
            }
        }
    }, [session?.user?.email]);

    useEffect(() => {
        // @ts-ignore
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (status === 'authenticated') {
            fetchInvoices();
            if (session?.user?.role === 'manager' || session?.user?.role === 'admin') {
                fetchTeamUsers();
            }
        }
    }, [status, router]);

    const fetchTeamUsers = async () => {
        try {
            const res = await fetch('/api/team/users');
            const data = await res.json();
            if (data.success) {
                setTeamUsers(data.users);
            }
        } catch (error) {
            console.error('Failed to fetch team users:', error);
        }
    };

    const fetchInvoices = async () => {
        try {
            const response = await fetch('/api/invoices');
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                // Sort by date descending
                const sorted = result.data.sort((a: Invoice, b: Invoice) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                setInvoices(sorted);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const [abortController, setAbortController] = useState<AbortController | null>(null);

    const handleSync = async () => {
        if (isSyncing) {
            abortController?.abort();
            setAbortController(null);
            setIsSyncing(false);
            return;
        }

        const controller = new AbortController();
        setAbortController(controller);
        setIsSyncing(true);

        let totalSynced = 0;
        let batchCount = 0;
        const MAX_BATCHES = 20; // Safety limit

        try {
            while (batchCount < MAX_BATCHES && !controller.signal.aborted) {
                batchCount++;
                console.log(`[Sync] Starting batch ${batchCount}...`);

                const res = await fetch('/api/sync', {
                    method: 'POST',
                    signal: controller.signal
                });

                // Handle non-JSON responses (504 timeout)
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    console.error('Server returned non-JSON response');
                    if (res.status === 504 && totalSynced > 0) {
                        await fetchInvoices();
                        alert(`Synced ${totalSynced} invoices before timeout. Click sync again for more.`);
                        return;
                    }
                    alert('Sync timed out. Please try again.');
                    return;
                }

                let result;
                try {
                    result = await res.json();
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

        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.log('Sync aborted by user');
                if (totalSynced > 0) {
                    await fetchInvoices();
                    alert(`Sync cancelled. Synced ${totalSynced} invoices before cancellation.`);
                }
            } else {
                console.error('Sync error:', e);
                if (totalSynced > 0) {
                    await fetchInvoices();
                    alert(`Synced ${totalSynced} invoices before error. Try again for more.`);
                } else {
                    alert('Error syncing: ' + (e.message || 'Unknown error'));
                }
            }
        } finally {
            setIsSyncing(false);
            setAbortController(null);
        }
    };

    // Derived Data
    const uniqueLocations = Array.from(new Set(invoices.map(i => i.location))).sort();
    const uniqueStalls = Array.from(new Set(
        (selectedLocations.length > 0 ? invoices.filter(i => selectedLocations.includes(i.location)) : invoices)
            .map(i => i.stall)
    )).sort();

    const filteredInvoices = invoices.filter(inv => {
        if (selectedLocations.length && !selectedLocations.includes(inv.location)) return false;
        if (selectedStalls.length && !selectedStalls.includes(inv.stall)) return false;
        if (statusFilter !== 'All Status' && inv.status !== statusFilter) return false;

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            if (!inv.id.toLowerCase().includes(lower) &&
                !inv.stall.toLowerCase().includes(lower) &&
                !inv.amount.toString().includes(lower)) return false;
        }

        // Amount Range Filter
        if (minAmount && inv.amount < parseFloat(minAmount)) return false;
        if (maxAmount && inv.amount > parseFloat(maxAmount)) return false;

        // Date filtering
        if (dateFilter === 'Custom' && (customDateFrom || customDateTo)) {
            const d = new Date(inv.date);
            if (customDateFrom && d < new Date(customDateFrom)) return false;
            if (customDateTo && d > new Date(customDateTo)) return false;
        } else if (dateFilter === 'Last Month') {
            const d = new Date(inv.date);
            const limit = new Date();
            limit.setMonth(limit.getMonth() - 1);
            if (d < limit) return false;
        } else if (dateFilter === 'Last 2 Months') {
            const d = new Date(inv.date);
            const limit = new Date();
            limit.setMonth(limit.getMonth() - 2);
            if (d < limit) return false;
        } else if (dateFilter === 'Last 3 Months') {
            const d = new Date(inv.date);
            const limit = new Date();
            limit.setMonth(limit.getMonth() - 3);
            if (d < limit) return false;
        }

        // Month/Year filtering (separate dropdowns)
        if (monthFilter !== 'All' || yearFilter !== 'All') {
            const d = new Date(inv.date);
            const monthMap: { [key: string]: number } = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            if (monthFilter !== 'All' && d.getMonth() !== monthMap[monthFilter]) return false;
            if (yearFilter !== 'All' && d.getFullYear() !== parseInt(yearFilter)) return false;
        }

        // User Filter (for admins/managers)
        if (selectedUser !== 'All Users') {
            const user = teamUsers.find(u => u.id === selectedUser);
            if (user && user.permissions) {
                const { locations, stalls, validFrom } = user.permissions;

                // Location check
                if (locations && locations.length > 0 && !locations.includes(inv.location)) return false;

                // Stall check
                if (stalls && stalls.length > 0 && !stalls.includes(inv.stall)) return false;

                // Valid From check
                if (validFrom) {
                    const invoiceDate = new Date(inv.date);
                    const validFromDate = new Date(validFrom);
                    if (invoiceDate < validFromDate) return false;
                }
            }
        }

        return true;
    });

    // Totals Calculation
    const activeInvoicesForSummary = selectedIds.size > 0
        ? invoices.filter(inv => selectedIds.has(inv.id))
        : filteredInvoices;

    const summaryTotals = activeInvoicesForSummary.reduce((acc, inv) => {
        acc.total += inv.amount;
        if (inv.status === 'Paid') acc.paid += inv.amount;
        if (inv.status === 'Processed') acc.processed += inv.amount;
        return acc;
    }, { total: 0, paid: 0, processed: 0 });

    // Pagination
    const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleExportCSV = () => {
        if (!filteredInvoices.length) return;
        const headers = ['Invoice ID', 'Date', 'Location', 'Stall', 'Amount', 'Status'];
        const csv = [
            headers.join(','),
            ...filteredInvoices.map(i => [i.id, i.date, `"${i.location}"`, `"${i.stall}"`, i.amount, i.status].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoices.csv';
        a.click();
    };

    // Saved Filters Functions
    const saveCurrentFilter = () => {
        if (!filterName.trim()) {
            alert('Please enter a filter name');
            return;
        }

        const newFilter: SavedFilter = {
            id: Date.now().toString(),
            name: filterName.trim(),
            searchTerm,
            locations: selectedLocations,
            stalls: selectedStalls,
            dateFilter,
            statusFilter,
            minAmount,
            maxAmount,
            monthFilter,
            yearFilter,
            customDateFrom,
            customDateTo,
            selectedUser,
        };

        const updatedFilters = [...savedFilters, newFilter];
        setSavedFilters(updatedFilters);
        const storageKey = `hungerbox-saved-filters-${session?.user?.email}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedFilters));
        setFilterName('');
        setShowSaveFilter(false);
        alert(`Filter "${newFilter.name}" saved successfully!`);
    };

    const loadFilter = (filter: SavedFilter) => {
        setSearchTerm(filter.searchTerm);
        setSelectedLocations(filter.locations);
        setSelectedStalls(filter.stalls);
        setDateFilter(filter.dateFilter);
        setStatusFilter(filter.statusFilter);
        setMinAmount(filter.minAmount);
        setMaxAmount(filter.maxAmount);
        setMonthFilter(filter.monthFilter || 'All');
        setYearFilter(filter.yearFilter || 'All');
        setCustomDateFrom(filter.customDateFrom);
        setCustomDateTo(filter.customDateTo);
        setSelectedUser(filter.selectedUser || 'All Users');
        setCurrentPage(1);
    };

    const deleteFilter = (filterId: string) => {
        const updatedFilters = savedFilters.filter(f => f.id !== filterId);
        setSavedFilters(updatedFilters);
        const storageKey = `hungerbox-saved-filters-${session?.user?.email}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedFilters));
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setSelectedLocations([]);
        setSelectedStalls([]);
        setDateFilter('All Time');
        setStatusFilter('All Status');
        setMinAmount('');
        setMaxAmount('');
        setMonthFilter('All');
        setYearFilter('All');
        setCustomDateFrom('');
        setCustomDateTo('');
        setSelectedUser('All Users');
        setCurrentPage(1);
    };

    const handlePay = async (e: React.MouseEvent, invoice: Invoice) => {
        e.stopPropagation();

        // Optimistic UI update or loading state could go here, but for now we just process it.
        try {
            const res = await fetch(`/api/invoices/${encodeURIComponent(invoice.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Paid' })
            });
            const data = await res.json();
            if (data.success) {
                // Update local state
                setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'Paid' } : i));
                // alert('Invoice updated successfully!');
            } else {
                console.error('Update failed:', data);
                // Show detailed error for debugging
                const debugInfo = data.debug ? `\nReceived: ${data.debug.receivedId}\nAvailable: ${data.debug.availableIdsLength}` : '';
                console.error(`Failed to update status: ${data.error}${debugInfo}`);
            }
        } catch (err) {
            console.error(err);
            // alert('Error updating status: Network or Server Error');
        }
    };

    // Wrapper for GroupedInvoiceView (doesn't need event)
    const handlePayInvoice = async (invoice: Invoice) => {
        try {
            const res = await fetch(`/api/invoices/${encodeURIComponent(invoice.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Paid' })
            });
            const data = await res.json();
            if (data.success) {
                setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'Paid' } : i));
            } else {
                console.error('Update failed:', data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Multi-select functions
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedInvoices.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedInvoices.map(inv => inv.id)));
        }
    };

    const toggleGroupSelection = (ids: string[], selected: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => {
                if (selected) next.add(id);
                else next.delete(id);
            });
            return next;
        });
    };

    const handleDownloadSelected = async () => {
        const selectedInvoices = invoices.filter(inv => selectedIds.has(inv.id));
        for (let i = 0; i < selectedInvoices.length; i++) {
            const inv = selectedInvoices[i];
            try {
                const apiUrl = `/api/download-invoice?id=${encodeURIComponent(inv.id)}&pdfPath=${encodeURIComponent(inv.pdfPath || '')}`;
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    console.error(`Failed to download ${inv.id}`);
                    continue;
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Invoice-${inv.id}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                // Stagger downloads
                if (i < selectedInvoices.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (e) {
                console.error(`Error downloading ${inv.id}:`, e);
            }
        }
        // Clear selection after download
        setSelectedIds(new Set());
    };

    // Helper function for single invoice download (used by GroupedInvoiceView)
    const handleDownloadInvoice = async (inv: Invoice) => {
        try {
            const apiUrl = `/api/download-invoice?id=${encodeURIComponent(inv.id)}&pdfPath=${encodeURIComponent(inv.pdfPath || '')}`;
            const response = await fetch(apiUrl);

            if (!response.ok) {
                console.error(`Failed to download ${inv.id}`);
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice-${inv.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(`Error downloading ${inv.id}:`, e);
        }
    };

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const handleBulkStatusUpdate = async (newStatus: 'Paid' | 'Processed' | 'Pending') => {
        if (selectedIds.size === 0) return;

        setIsUpdatingStatus(true);
        const selectedInvoiceIds = Array.from(selectedIds);
        let successCount = 0;
        let failCount = 0;

        // Process updates sequentially to avoid overwhelming the server
        for (const id of selectedInvoiceIds) {
            try {
                const response = await fetch(`/api/invoices/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        // Update local state
        setInvoices(prev => prev.map(inv =>
            selectedIds.has(inv.id) ? { ...inv, status: newStatus } : inv
        ));

        // Clear selection
        setSelectedIds(new Set());
        setIsUpdatingStatus(false);

        // Show result
        if (failCount === 0) {
            alert(`Successfully updated ${successCount} invoice(s) to "${newStatus}"`);
        } else {
            alert(`Updated ${successCount} invoice(s). ${failCount} failed.`);
        }
    };

    return (
        <div className="container">
            {/* Header Row 1: Title + Actions */}
            <header className="flex justify-between items-center mb-4">
                <div>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                        <h1>Invoices</h1>
                        <div className="flex items-center gap-2 ml-2">
                            <span
                                className={`text-sm font-bold px-3 py-1 rounded-full border shadow-sm transition-all duration-300 ${selectedIds.size > 0
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 ring-2 ring-amber-100'
                                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                    }`}
                                title={selectedIds.size > 0 ? "Sum of selected invoices" : "Total of filtered invoices"}
                            >
                                {selectedIds.size > 0 ? 'Selected: ' : 'Total: '}₹{summaryTotals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                            <span
                                className="text-sm font-bold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                                title="Total amount paid"
                            >
                                Paid: ₹{summaryTotals.paid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                            <span
                                className="text-sm font-bold px-3 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                                title="Total amount processed"
                            >
                                Processed: ₹{summaryTotals.processed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                    <p style={{ color: '#64748b' }}>Manage and view all payment advices.</p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    {selectedIds.size > 0 && (
                        <>
                            <button
                                onClick={handleDownloadSelected}
                                className="btn btn-primary flex items-center gap-2 px-4 py-2"
                            >
                                <CheckSquare size={16} />
                                Download ({selectedIds.size})
                            </button>
                            {session?.user?.role !== 'user' && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleBulkStatusUpdate('Paid')}
                                        disabled={isUpdatingStatus}
                                        className="btn flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        <CreditCard size={16} />
                                        {isUpdatingStatus ? 'Updating...' : `Mark Paid (${selectedIds.size})`}
                                    </button>
                                    <button
                                        onClick={() => handleBulkStatusUpdate('Processed')}
                                        disabled={isUpdatingStatus}
                                        className="btn flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                        title="Mark as Processed"
                                    >
                                        Processed
                                    </button>
                                    <button
                                        onClick={() => handleBulkStatusUpdate('Pending')}
                                        disabled={isUpdatingStatus}
                                        className="btn flex items-center gap-2 px-3 py-2 bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                                        title="Mark as Pending"
                                    >
                                        Pending
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    <button onClick={handleExportCSV} className="btn glass-panel flex items-center gap-2 px-4 py-2">
                        <Download size={16} /> Export
                    </button>
                    {session?.user?.role !== 'user' && (
                        <button onClick={handleSync} className={`btn ${isSyncing ? 'bg-red-600 text-white hover:bg-red-700 font-bold shadow-sm' : 'btn-primary'}`}>
                            {isSyncing ? 'Stop Sync' : 'Sync Now'}
                        </button>
                    )}
                </div>
            </header>

            {/* Filter Bar - Compact colorful row */}
            <div className="filter-bar">
                <div className="filter-bar-header">
                    {/* Search */}
                    <div className="filter-item search-filter" style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="search-input"
                            style={{ paddingRight: '2.5rem' }}
                        />
                        <Search
                            size={16}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#0ea5e9',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>

                    {/* Additional Primary Filters */}
                    {(session?.user?.role === 'manager' || session?.user?.role === 'admin') && (
                        <div className="filter-item">
                            <label>Filter by User</label>
                            <select
                                className="filter-select"
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                            >
                                <option value="All Users">All Users</option>
                                {teamUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Location */}
                    <div className="filter-item">
                        <MultiSelect
                            label="📍 Location"
                            options={uniqueLocations}
                            value={selectedLocations}
                            onChange={setSelectedLocations}
                        />
                    </div>

                    {/* Stall */}
                    <div className="filter-item">
                        <MultiSelect
                            label="🏪 Stall"
                            options={uniqueStalls}
                            value={selectedStalls}
                            onChange={setSelectedStalls}
                        />
                    </div>

                    {/* Status Dropdown */}
                    <select
                        className="filter-select status-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="All Status">📊 All Status</option>
                        <option value="Pending">🟡 Pending</option>
                        <option value="Processed">🟢 Processed</option>
                        <option value="Paid">🔵 Paid</option>
                    </select>

                    {/* Date Range Filter */}
                    <select
                        className="filter-select date-select"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                    >
                        <option value="All Time">📅 All Time</option>
                        <option value="Last Month">Last Month</option>
                        <option value="Last 2 Months">Last 2 Months</option>
                        <option value="Last 3 Months">Last 3 Months</option>
                        <option value="Custom">Custom Range</option>
                    </select>

                    {/* Month Filter */}
                    <select
                        className="filter-select month-select"
                        value={monthFilter}
                        onChange={e => setMonthFilter(e.target.value)}
                    >
                        <option value="All">📆 Month</option>
                        <option value="Jan">Jan</option>
                        <option value="Feb">Feb</option>
                        <option value="Mar">Mar</option>
                        <option value="Apr">Apr</option>
                        <option value="May">May</option>
                        <option value="Jun">Jun</option>
                        <option value="Jul">Jul</option>
                        <option value="Aug">Aug</option>
                        <option value="Sep">Sep</option>
                        <option value="Oct">Oct</option>
                        <option value="Nov">Nov</option>
                        <option value="Dec">Dec</option>
                    </select>

                    {/* Year Filter */}
                    <select
                        className="filter-select year-select"
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value)}
                    >
                        <option value="All">🗓️ Year</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>

                    {/* Custom Date Range - inline */}
                    {dateFilter === 'Custom' && (
                        <>
                            <input
                                type="date"
                                value={customDateFrom}
                                onChange={e => setCustomDateFrom(e.target.value)}
                                className="filter-date-input"
                                title="From date"
                            />
                            <span style={{ color: '#64748b' }}>→</span>
                            <input
                                type="date"
                                value={customDateTo}
                                onChange={e => setCustomDateTo(e.target.value)}
                                className="filter-date-input"
                                title="To date"
                            />
                        </>
                    )}

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* View Mode Toggle moved here */}
                    <div className="view-toggle">
                        <button
                            onClick={() => setViewMode('grouped')}
                            className={`toggle-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                            title="Group by Service Period"
                        >
                            <Layers size={16} />
                            Grouped
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            title="List View"
                        >
                            <List size={16} />
                            List
                        </button>
                    </div>
                </div>

                {/* Second Row: Quick Access + Action Buttons/Save Dialog */}
                <div className="filter-bar-footer">
                    {savedFilters.length > 0 && (
                        <div className="quick-access">
                            <span className="quick-access-label">Quick Access:</span>
                            <div className="filter-chips">
                                {savedFilters.map(filter => (
                                    <button
                                        key={filter.id}
                                        onClick={() => loadFilter(filter)}
                                        className="filter-chip"
                                    >
                                        <span>{filter.name}</span>
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteFilter(filter.id);
                                            }}
                                            className="delete-chip"
                                        >
                                            <X size={12} />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1 }} />

                    {showSaveFilter ? (
                        <div className="save-filter-dialog-inline">
                            <Bookmark size={16} className="text-indigo-500" />
                            <input
                                type="text"
                                placeholder="Filter name..."
                                value={filterName}
                                onChange={e => setFilterName(e.target.value)}
                                className="save-filter-input"
                                onKeyDown={e => e.key === 'Enter' && saveCurrentFilter()}
                                autoFocus
                            />
                            <button
                                onClick={saveCurrentFilter}
                                className="btn-save-confirm"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowSaveFilter(false)}
                                className="btn-save-cancel"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="action-buttons">
                            <button
                                onClick={clearAllFilters}
                                className="filter-action-btn clear-btn"
                            >
                                <X size={14} />
                                Clear Filters
                            </button>
                            <button
                                onClick={() => setShowSaveFilter(true)}
                                className="filter-action-btn save-btn"
                            >
                                <Save size={14} />
                                Save Filter
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-panel p-6">
                {/* Grouped View */}
                {viewMode === 'grouped' ? (
                    <GroupedInvoiceView
                        invoices={filteredInvoices}
                        onInvoiceClick={(inv) => setSelectedInvoice(inv)}
                        onDownload={handleDownloadInvoice}
                        onPay={handlePayInvoice}
                        userRole={session?.user?.role}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelection}
                        onToggleAll={toggleGroupSelection}
                    />
                ) : (
                    <>
                        {/* Table */}
                        <div className="table-container">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                                        <th className="pb-3 pl-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedInvoices.length > 0 && selectedIds.size === paginatedInvoices.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </th>
                                        <th className="pb-3">Service Period</th>
                                        <th className="pb-3 hide-mobile">Date</th>
                                        <th className="pb-3 hide-mobile">Location</th>
                                        <th className="pb-3">Stall Name</th>
                                        <th className="pb-3 text-right">Amount</th>
                                        <th className="pb-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={6} className="text-center p-8 text-slate-400">Loading...</td></tr>
                                    ) : paginatedInvoices.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center p-8 text-slate-400">No invoices match your filters.</td></tr>
                                    ) : (
                                        paginatedInvoices.map((inv) => (
                                            <tr
                                                key={inv.id}
                                                className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group ${selectedIds.has(inv.id) ? 'bg-indigo-50/50' : ''}`}
                                                onClick={() => setSelectedInvoice(inv)}
                                            >
                                                <td className="py-3 pl-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(inv.id)}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            toggleSelection(inv.id);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td
                                                    className="py-3 text-sm font-medium text-slate-700 group-hover:text-blue-600"
                                                    title={`Invoice ID: ${inv.id}`}
                                                >
                                                    {inv.serviceDateRange || 'N/A'}
                                                </td>
                                                <td className="py-3 text-sm text-slate-600 hide-mobile">{inv.date}</td>
                                                <td className="py-3 text-sm text-slate-600 hide-mobile">{inv.location}</td>
                                                <td className="py-3 text-sm text-slate-600">{inv.stall}</td>
                                                <td className="py-3 text-sm font-semibold text-slate-700 text-right">₹{inv.amount.toLocaleString()}</td>
                                                <td className="py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {inv.status === 'Paid' ? (
                                                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                                Paid
                                                            </span>
                                                        ) : inv.status === 'Processed' ? (
                                                            session?.user?.role !== 'user' && (
                                                                <button
                                                                    onClick={(e) => handlePay(e, inv)}
                                                                    className="btn-premium text-[10px] py-1 px-3 shrink-0 w-max"
                                                                    style={{ whiteSpace: 'nowrap' }}
                                                                >
                                                                    Pay Now
                                                                </button>
                                                            )
                                                        ) : (
                                                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                                {inv.status}
                                                            </span>
                                                        )}

                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    const apiUrl = `/api/download-invoice?id=${encodeURIComponent(inv.id)}&pdfPath=${encodeURIComponent(inv.pdfPath || '')}`;
                                                                    const response = await fetch(apiUrl);

                                                                    if (!response.ok) {
                                                                        const error = await response.json();
                                                                        alert(error.error || 'Failed to download PDF');
                                                                        return;
                                                                    }

                                                                    const blob = await response.blob();
                                                                    const url = window.URL.createObjectURL(blob);
                                                                    const link = document.createElement('a');
                                                                    link.href = url;
                                                                    link.download = `Invoice-${inv.id}.pdf`;
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    document.body.removeChild(link);
                                                                    window.URL.revokeObjectURL(url);
                                                                } catch (err) {
                                                                    console.error('Download error:', err);
                                                                    alert('Failed to download PDF');
                                                                }
                                                            }}
                                                            className="p-1.5 bg-indigo-50 text-indigo-500 rounded-full hover:bg-indigo-100 hover:text-indigo-700 hover:shadow-md border border-indigo-100 transition-all duration-200 inline-flex items-center justify-center group-hover:bg-indigo-100 group-hover:shadow-sm"
                                                            title="Download Invoice"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {
                            filteredInvoices.length > 0 && (
                                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                                    <div className="text-sm text-slate-500">
                                        Page {currentPage} of {totalPages} ({filteredInvoices.length} items)
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 rounded border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 rounded border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )
                        }
                    </>
                )
                }
            </div >

            <InvoiceDrawer
                isOpen={!!selectedInvoice}
                invoice={selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
            />

            <style jsx>{`
                .flex { display: flex; }
                .flex-col { flex-direction: column; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .gap-1 { gap: 0.25rem; }
                .gap-2 { gap: 0.5rem; }
                .gap-4 { gap: 1rem; }
                .flex-wrap { flex-wrap: wrap; }
                .flex-1 { flex: 1; }
                .w-full { width: 100%; }
                .relative { position: relative; }
                .absolute { position: absolute; }
                .top-1\\/2 { top: 50%; }
                .left-3 { left: 0.75rem; }
                .-translate-y-1\\/2 { transform: translateY(-50%); }
                .p-6 { padding: 1.5rem; }
                .mb-8 { margin-bottom: 2rem; }
                .mb-6 { margin-bottom: 1.5rem; }
                .text-xs { font-size: 0.75rem; }
                .text-sm { font-size: 0.875rem; }
                .font-medium { font-weight: 500; }
                .font-semibold { font-weight: 600; }
                .text-slate-500 { color: #64748b; }
                .text-slate-400 { color: #94a3b8; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .border-b { border-bottom-width: 1px; }
                .border-t { border-top-width: 1px; }
                .border-slate-100 { border-color: #f1f5f9; }
                .border-slate-200 { border-color: #e2e8f0; }
                .bg-slate-50 { background-color: #f8fafc; }
                .rounded-lg { border-radius: 0.5rem; }
                .rounded { border-radius: 0.25rem; }
                .cursor-pointer { cursor: pointer; }
                .hover\\:bg-slate-50:hover { background-color: #f8fafc; }
                .hover\\:bg-slate-50\\/50:hover { background-color: rgba(248, 250, 252, 0.5); }
                .bg-emerald-100 { background-color: #d1fae5; }
                .text-emerald-700 { color: #047857; }
                .bg-amber-100 { background-color: #fef3c7; }
                .text-amber-700 { color: #b45309; }
                input:focus { outline: 2px solid #3b82f6; border-color: transparent; }

                /* Filter Bar Styles */
                .filter-bar {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    padding: 1rem;
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%);
                    border-radius: 1rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid #bae6fd;
                }

                .filter-bar-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }

                .filter-bar-footer {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px dashed #bae6fd;
                    flex-wrap: wrap;
                }

                .filter-item {
                    min-width: 140px;
                }

                .search-filter {
                    position: relative;
                    flex: 1;
                    min-width: 200px;
                    max-width: 300px;
                }

                .search-filter .search-icon {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #0ea5e9;
                    z-index: 1;
                    pointer-events: none;
                }

                .search-filter .search-input {
                    width: 100%;
                    padding: 0.5rem 2.5rem 0.5rem 0.75rem;
                    border-radius: 0.5rem;
                    border: 2px solid #7dd3fc;
                    background: white;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }

                .search-filter .search-input:focus {
                    outline: none;
                    border-color: #0ea5e9;
                    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
                }

                .filter-select {
                    padding: 0.5rem 0.75rem;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .filter-select.status-select {
                    border: 2px solid #a78bfa;
                    background: linear-gradient(135deg, #faf5ff, #f5f3ff);
                    color: #7c3aed;
                    font-weight: 500;
                }

                .filter-select.status-select:focus {
                    outline: none;
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
                }

                .filter-select.date-select {
                    border: 2px solid #fbbf24;
                    background: linear-gradient(135deg, #fffbeb, #fef3c7);
                    color: #d97706;
                    font-weight: 500;
                }

                .filter-select.date-select:focus {
                    outline: none;
                    border-color: #f59e0b;
                    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
                }

                .filter-select.month-select {
                    border: 2px solid #34d399;
                    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
                    color: #059669;
                    font-weight: 500;
                }

                .filter-select.month-select:focus {
                    outline: none;
                    border-color: #10b981;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                .filter-select.year-select {
                    border: 2px solid #fb923c;
                    background: linear-gradient(135deg, #fff7ed, #ffedd5);
                    color: #ea580c;
                    font-weight: 500;
                }

                .filter-select.year-select:focus {
                    outline: none;
                    border-color: #f97316;
                    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
                }

                .filter-date-input {
                    padding: 0.5rem 0.75rem;
                    border-radius: 0.5rem;
                    border: 2px solid #94a3b8;
                    background: white;
                    font-size: 0.875rem;
                    color: #475569;
                    transition: all 0.2s;
                }

                .filter-date-input:focus {
                    outline: none;
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
                }

                .view-toggle {
                    display: flex;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    border: 2px solid #6366f1;
                }

                .toggle-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: white;
                    color: #6366f1;
                }

                .toggle-btn:hover {
                    background: #eef2ff;
                }

                .toggle-btn.active {
                    background: linear-gradient(135deg, #6366f1, #4f46e5);
                    color: white;
                }

                /* New Compact Elements Styles */
                .quick-access {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .quick-access-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }

                .filter-chips {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .filter-chip {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.375rem 0.75rem;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 2rem;
                    font-size: 0.8125rem;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .filter-chip:hover {
                    border-color: #6366f1;
                    background: #f5f3ff;
                    color: #6366f1;
                }

                .delete-chip {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    transition: color 0.2s;
                }

                .delete-chip:hover {
                    color: #ef4444;
                }

                .action-buttons {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .filter-action-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.875rem;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }

                .clear-btn {
                    background: #f1f5f9;
                    color: #64748b;
                }

                .clear-btn:hover {
                    background: #e2e8f0;
                    color: #475569;
                }

                .save-btn {
                    background: #eef2ff;
                    color: #6366f1;
                }

                .save-btn:hover {
                    background: #e0e7ff;
                    color: #4f46e5;
                }

                .save-filter-dialog-inline {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.375rem 1rem;
                    background: #f5f3ff;
                    border: 1px solid #c7d2fe;
                    border-radius: 0.75rem;
                    animation: slideDown 0.2s ease-out;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .save-filter-input {
                    flex: 1;
                    padding: 0.375rem 0.75rem;
                    border-radius: 0.375rem;
                    border: 1px solid #c7d2fe;
                    font-size: 0.875rem;
                    outline: none;
                }

                .save-filter-input:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
                }

                .btn-save-confirm {
                    padding: 0.375rem 1rem;
                    background: #6366f1;
                    color: white;
                    border: none;
                    border-radius: 0.375rem;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    cursor: pointer;
                }

                .btn-save-confirm:hover {
                    background: #4f46e5;
                }

                .btn-save-cancel {
                    padding: 0.375rem 0.75rem;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.375rem;
                    font-size: 0.8125rem;
                    color: #64748b;
                    cursor: pointer;
                }

                .btn-save-cancel:hover {
                    background: #f8fafc;
                }
            `}</style>
        </div >
    );
}
