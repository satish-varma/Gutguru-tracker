'use client';

import { useMemo } from 'react';
import { Invoice } from '@/types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

interface DashboardChartsProps {
    invoices: Invoice[];
}

const COLORS = ['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

export function DashboardCharts({ invoices }: DashboardChartsProps) {

    // Aggregate data for Trend Chart (Revenue by Date)
    const trendData = useMemo(() => {
        const grouped: Record<string, number> = {};
        invoices.forEach(inv => {
            // Use just the date part YYYY-MM-DD
            const dateKey = inv.date;
            grouped[dateKey] = (grouped[dateKey] || 0) + inv.amount;
        });

        // Convert to array and sort by date
        return Object.entries(grouped)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-14); // valid for "last 14 active days" to keep chart clean
    }, [invoices]);

    // Aggregate data for Pie Chart (Revenue by Location)
    const locationData = useMemo(() => {
        const grouped: Record<string, number> = {};
        invoices.forEach(inv => {
            // Normalize location names if needed, but they are usually consistent
            grouped[inv.location] = (grouped[inv.location] || 0) + inv.amount;
        });

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Sort desc
    }, [invoices]);

    if (invoices.length === 0) return null;

    return (
        <div className="charts-grid" style={{ marginBottom: '3rem' }}>
            <style jsx>{`
                .charts-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }
                @media (max-width: 1024px) {
                    .charts-grid {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                    }
                }
            `}</style>

            {/* Revenue Trend Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Daily Revenue Trend</h3>
                <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer>
                        <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                fontSize={12}
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return `${d.getDate()}/${d.getMonth() + 1}`;
                                }}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={12}
                                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                itemStyle={{ color: '#4f46e5' }}
                                cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}
                                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            />
                            <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Location Distribution Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Revenue by Location</h3>
                <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={locationData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {locationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                wrapperStyle={{ color: '#64748b', paddingTop: '20px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
