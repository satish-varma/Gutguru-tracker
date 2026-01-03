'use client';

import { useState, useMemo } from 'react';
import { Invoice } from '@/types';
import { ChevronDown, ChevronRight, Download, Calendar } from 'lucide-react';

interface GroupedInvoiceViewProps {
    invoices: Invoice[];
    onInvoiceClick: (invoice: Invoice) => void;
    onDownload: (invoice: Invoice) => void;
}

interface ServicePeriodGroup {
    period: string;
    startDate: string;
    endDate: string;
    invoices: Invoice[];
    totalAmount: number;
    stallCount: number;
    locationCount: number;
}

export function GroupedInvoiceView({ invoices, onInvoiceClick, onDownload }: GroupedInvoiceViewProps) {
    const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

    // Group invoices by service period
    const groupedInvoices = useMemo(() => {
        const groups: Map<string, Invoice[]> = new Map();

        invoices.forEach(inv => {
            const period = inv.serviceDateRange || 'No Service Period';
            if (!groups.has(period)) {
                groups.set(period, []);
            }
            groups.get(period)!.push(inv);
        });

        // Convert to array and calculate totals
        const result: ServicePeriodGroup[] = [];
        groups.forEach((groupInvoices, period) => {
            // Parse the period to get dates for sorting
            const dates = period.match(/(\d{4}-\d{2}-\d{2})/g) || [];
            const startDate = dates[0] || '1970-01-01';
            const endDate = dates[1] || dates[0] || '1970-01-01';

            result.push({
                period,
                startDate,
                endDate,
                invoices: groupInvoices.sort((a, b) => a.stall.localeCompare(b.stall)),
                totalAmount: groupInvoices.reduce((sum, inv) => sum + inv.amount, 0),
                stallCount: new Set(groupInvoices.map(inv => inv.stall)).size,
                locationCount: new Set(groupInvoices.map(inv => inv.location)).size,
            });
        });

        // Sort by start date (newest first)
        return result.sort((a, b) => b.startDate.localeCompare(a.startDate));
    }, [invoices]);

    const togglePeriod = (period: string) => {
        setExpandedPeriods(prev => {
            const next = new Set(prev);
            if (next.has(period)) {
                next.delete(period);
            } else {
                next.add(period);
            }
            return next;
        });
    };

    const formatPeriodDisplay = (period: string) => {
        if (period === 'No Service Period') return period;

        // Parse dates and format nicely
        const dates = period.match(/(\d{4}-\d{2}-\d{2})/g) || [];
        if (dates.length === 2) {
            const start = new Date(dates[0]);
            const end = new Date(dates[1]);
            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
            return `${start.toLocaleDateString('en-IN', options)} → ${end.toLocaleDateString('en-IN', options)}`;
        }
        return period;
    };

    const handleDownloadAll = async (group: ServicePeriodGroup) => {
        for (const inv of group.invoices) {
            await onDownload(inv);
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    };

    return (
        <div className="grouped-invoice-container">
            {groupedInvoices.length === 0 ? (
                <div className="empty-state">
                    <p>No invoices found for the selected filters.</p>
                </div>
            ) : (
                groupedInvoices.map(group => (
                    <div key={group.period} className="period-group">
                        {/* Period Header - Clickable */}
                        <div
                            className="period-header"
                            onClick={() => togglePeriod(group.period)}
                        >
                            <div className="period-toggle">
                                {expandedPeriods.has(group.period) ? (
                                    <ChevronDown size={20} />
                                ) : (
                                    <ChevronRight size={20} />
                                )}
                            </div>

                            <div className="period-info">
                                <div className="period-date">
                                    <Calendar size={16} />
                                    <span>{formatPeriodDisplay(group.period)}</span>
                                </div>
                                <div className="period-stats">
                                    <span className="stat">{group.invoices.length} invoices</span>
                                    <span className="stat">{group.stallCount} stalls</span>
                                    {group.locationCount > 1 && (
                                        <span className="stat">{group.locationCount} locations</span>
                                    )}
                                </div>
                            </div>

                            <div className="period-amount">
                                ₹{group.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>

                            <button
                                className="download-all-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadAll(group);
                                }}
                                title="Download all invoices in this period"
                            >
                                <Download size={16} />
                            </button>
                        </div>

                        {/* Expanded Content - Invoice List */}
                        {expandedPeriods.has(group.period) && (
                            <div className="period-invoices">
                                <table className="invoice-table">
                                    <thead>
                                        <tr>
                                            <th>Stall</th>
                                            <th>Location</th>
                                            <th>Invoice ID</th>
                                            <th className="text-right">Amount</th>
                                            <th>Status</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.invoices.map(inv => (
                                            <tr
                                                key={inv.id}
                                                onClick={() => onInvoiceClick(inv)}
                                                className="invoice-row"
                                            >
                                                <td className="stall-name">{inv.stall}</td>
                                                <td className="location">{inv.location}</td>
                                                <td className="invoice-id">{inv.id.split('_')[0]}</td>
                                                <td className="amount text-right">
                                                    ₹{inv.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${inv.status.toLowerCase()}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDownload(inv);
                                                        }}
                                                        className="action-btn"
                                                        title="Download"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))
            )}

            <style jsx>{`
                .grouped-invoice-container {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: #64748b;
                }

                .period-group {
                    background: white;
                    border-radius: 0.75rem;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    transition: box-shadow 0.2s;
                }

                .period-group:hover {
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .period-header {
                    display: flex;
                    align-items: center;
                    padding: 1rem 1.25rem;
                    cursor: pointer;
                    background: linear-gradient(to right, #f8fafc, #ffffff);
                    gap: 1rem;
                    transition: background 0.2s;
                }

                .period-header:hover {
                    background: linear-gradient(to right, #f1f5f9, #f8fafc);
                }

                .period-toggle {
                    color: #64748b;
                    display: flex;
                    align-items: center;
                }

                .period-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .period-date {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    color: #1e293b;
                    font-size: 0.95rem;
                }

                .period-stats {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.8rem;
                    color: #64748b;
                }

                .stat {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .period-amount {
                    font-weight: 700;
                    font-size: 1.1rem;
                    color: #0f172a;
                    min-width: 120px;
                    text-align: right;
                }

                .download-all-btn {
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .download-all-btn:hover {
                    background: #f1f5f9;
                    color: #4f46e5;
                    border-color: #c7d2fe;
                }

                .period-invoices {
                    border-top: 1px solid #e2e8f0;
                    background: #fafbfc;
                    animation: slideDown 0.2s ease-out;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .invoice-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .invoice-table th {
                    padding: 0.75rem 1rem;
                    text-align: left;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: #64748b;
                    background: #f1f5f9;
                    border-bottom: 1px solid #e2e8f0;
                }

                .invoice-table th.text-right {
                    text-align: right;
                }

                .invoice-row {
                    cursor: pointer;
                    transition: background 0.15s;
                }

                .invoice-row:hover {
                    background: #f8fafc;
                }

                .invoice-row td {
                    padding: 0.75rem 1rem;
                    font-size: 0.875rem;
                    border-bottom: 1px solid #f1f5f9;
                }

                .stall-name {
                    font-weight: 600;
                    color: #1e293b;
                }

                .location {
                    color: #64748b;
                }

                .invoice-id {
                    font-family: monospace;
                    font-size: 0.8rem;
                    color: #94a3b8;
                }

                .amount {
                    font-weight: 600;
                    color: #0f172a;
                }

                .amount.text-right {
                    text-align: right;
                }

                .status-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: 9999px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .status-badge.processed {
                    background: #dcfce7;
                    color: #166534;
                }

                .status-badge.paid {
                    background: #dbeafe;
                    color: #1e40af;
                }

                .status-badge.pending {
                    background: #fef3c7;
                    color: #92400e;
                }

                .action-btn {
                    padding: 0.375rem;
                    border-radius: 0.375rem;
                    border: none;
                    background: #f1f5f9;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .action-btn:hover {
                    background: #e0e7ff;
                    color: #4f46e5;
                }
            `}</style>
        </div>
    );
}
