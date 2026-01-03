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
        }
    }, [status, router]);

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
        } else if (dateFilter === 'Last 7 Days') {
            const d = new Date(inv.date);
            const limit = new Date();
            limit.setDate(limit.getDate() - 7);
            if (d < limit) return false;
        } else if (dateFilter === 'Last 30 Days') {
            const d = new Date(inv.date);
            const limit = new Date();
            limit.setDate(limit.getDate() - 30);
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

        return true;
    });

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
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1>Invoices</h1>
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

                    {/* View Mode Toggle */}
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grouped')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${viewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            title="Group by Service Period"
                        >
                            <Layers size={16} />
                            Grouped
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            title="List View"
                        >
                            <List size={16} />
                            List
                        </button>
                    </div>

                    <button onClick={handleExportCSV} className="btn glass-panel flex items-center gap-2 px-4 py-2">
                        <Download size={16} /> Export
                    </button>
                    {session?.user?.role !== 'user' && (
                        <button onClick={handleSync} className={`btn ${isSyncing ? 'bg-red-600 text-white hover:bg-red-700 font-bold shadow-sm' : 'btn-primary'}`}>
                            {isSyncing ? 'Stop Sync' : 'Sync Now'}
                        </button>
                    )}
                </div>
            </header >

            <div className="glass-panel p-6">
                {/* Filter Section - 2 Rows */}
                <div className="space-y-4 mb-6">

                    {/* Row 1: Search, Location, Stall, Status */}
                    <div className="filter-row flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div style={{ position: 'relative' }}>
                                <Search
                                    size={16}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#94a3b8',
                                        pointerEvents: 'none',
                                        zIndex: 1
                                    }}
                                />
                                <input
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                                    placeholder="Search invoices..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ height: '38px', paddingLeft: '16px', paddingRight: '40px' }}
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="w-[180px]">
                            <MultiSelect
                                label="Location"
                                options={uniqueLocations}
                                value={selectedLocations}
                                onChange={setSelectedLocations}
                            />
                        </div>

                        {/* Stall */}
                        <div className="w-[180px]">
                            <MultiSelect
                                label="Stall"
                                options={uniqueStalls}
                                value={selectedStalls}
                                onChange={setSelectedStalls}
                            />
                        </div>

                        {/* Status - styled like MultiSelect */}
                        <div className="w-[160px]">
                            <select
                                className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                style={{ height: '38px' }}
                            >
                                <option value="All Status">Status: All</option>
                                <option value="Pending">Status: Pending</option>
                                <option value="Processed">Status: Processed</option>
                                <option value="Paid">Status: Paid</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Date Filters + Saved Filters + Actions */}
                    <div className="filter-row flex flex-wrap items-end gap-4 pt-3 border-t border-slate-100">
                        {/* Date Filters */}
                        <div className="flex items-end gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Quick Range</label>
                                <select
                                    className="py-2 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500"
                                    value={dateFilter}
                                    onChange={e => {
                                        setDateFilter(e.target.value);
                                        if (e.target.value === 'Custom') {
                                            setShowDatePicker(true);
                                        }
                                    }}
                                >
                                    <option>All Time</option>
                                    <option>Last 7 Days</option>
                                    <option>Last 30 Days</option>
                                    <option>Custom</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Month</label>
                                <select
                                    className="py-2 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500"
                                    value={monthFilter}
                                    onChange={e => setMonthFilter(e.target.value)}
                                >
                                    <option>All</option>
                                    <option>Jan</option>
                                    <option>Feb</option>
                                    <option>Mar</option>
                                    <option>Apr</option>
                                    <option>May</option>
                                    <option>Jun</option>
                                    <option>Jul</option>
                                    <option>Aug</option>
                                    <option>Sep</option>
                                    <option>Oct</option>
                                    <option>Nov</option>
                                    <option>Dec</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Year</label>
                                <select
                                    className="py-2 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500"
                                    value={yearFilter}
                                    onChange={e => setYearFilter(e.target.value)}
                                >
                                    <option>All</option>
                                    <option>2025</option>
                                    <option>2024</option>
                                    <option>2023</option>
                                </select>
                            </div>

                            {/* Custom Date Range - only shows when Custom is selected */}
                            {dateFilter === 'Custom' && (
                                <>
                                    <div className="h-6 w-px bg-slate-300" />
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">From</label>
                                        <input
                                            type="date"
                                            value={customDateFrom}
                                            onChange={e => setCustomDateFrom(e.target.value)}
                                            className="py-2 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">To</label>
                                        <input
                                            type="date"
                                            value={customDateTo}
                                            onChange={e => setCustomDateTo(e.target.value)}
                                            className="py-2 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={clearAllFilters}
                                className="btn py-2 px-4 text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <X size={14} />
                                Clear
                            </button>
                            <button
                                onClick={() => setShowSaveFilter(!showSaveFilter)}
                                className="btn py-2 px-4 text-sm bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Save size={14} />
                                Save
                            </button>
                        </div>
                    </div>

                    {/* Save Filter Dialog */}
                    {showSaveFilter && (
                        <div className="flex gap-3 items-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <Bookmark size={16} className="text-indigo-500" />
                            <input
                                type="text"
                                placeholder="Filter name..."
                                value={filterName}
                                onChange={e => setFilterName(e.target.value)}
                                className="flex-1 py-2 px-3 rounded-lg border border-indigo-200 bg-white text-sm focus:outline-none focus:border-indigo-500"
                                onKeyDown={e => e.key === 'Enter' && saveCurrentFilter()}
                                autoFocus
                            />
                            <button
                                onClick={saveCurrentFilter}
                                className="btn py-2 px-4 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowSaveFilter(false)}
                                className="btn py-2 px-3 text-sm bg-white text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Saved Filters - Clean Separate Row */}
                    {savedFilters.length > 0 && (
                        <div className="flex items-center gap-4 py-2">
                            <span className="text-xs text-slate-500 font-medium">Quick Access:</span>
                            <div className="flex items-center gap-2 flex-wrap">
                                {savedFilters.map(filter => (
                                    <button
                                        key={filter.id}
                                        onClick={() => loadFilter(filter)}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                    >
                                        <span>{filter.name}</span>
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteFilter(filter.id);
                                            }}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={12} />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Grouped View */}
                {viewMode === 'grouped' ? (
                    <GroupedInvoiceView
                        invoices={filteredInvoices}
                        onInvoiceClick={(inv) => setSelectedInvoice(inv)}
                        onDownload={handleDownloadInvoice}
                        onPay={handlePayInvoice}
                        userRole={session?.user?.role}
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
                )}
            </div>

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
            `}</style>
        </div>
    );
}
