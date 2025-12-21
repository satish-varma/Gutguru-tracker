'use client';

import { useState, useEffect } from 'react';
import { Invoice } from '@/types';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

// Color Palette for Charts
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/invoices');
                const json = await res.json();
                if (json.success) {
                    setInvoices(json.data);
                }
            } catch (e) {
                console.error("Failed to load analytics data", e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    if (isLoading) return <div className="p-8">Loading Analytics...</div>;

    // --- Data Transformation for Charts ---

    // 1. Monthly Trends (Line Chart)
    const monthlyData = invoices.reduce((acc, inv) => {
        const date = new Date(inv.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[key]) acc[key] = { name: key, total: 0, count: 0 };
        acc[key].total += inv.amount;
        acc[key].count += 1;
        return acc;
    }, {} as Record<string, any>);

    const lineChartData = Object.values(monthlyData).sort((a: any, b: any) => a.name.localeCompare(b.name));

    // 2. Spending by Location (Pie Chart)
    const locationData = invoices.reduce((acc, inv) => {
        acc[inv.location] = (acc[inv.location] || 0) + inv.amount;
        return acc;
    }, {} as Record<string, number>);

    const pieChartData = Object.keys(locationData).map(key => ({
        name: key,
        value: locationData[key]
    }));

    // 3. Top Stalls by Expenditure (Bar Chart)
    const stallData = invoices.reduce((acc, inv) => {
        acc[inv.stall] = (acc[inv.stall] || 0) + inv.amount;
        return acc;
    }, {} as Record<string, number>);

    const barChartData = Object.keys(stallData)
        .map(key => ({ name: key, amount: stallData[key] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8); // Top 8 stalls Only

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <header className="mb-8">
                <h1>Analytics Dashboard</h1>
                <p style={{ color: '#64748b' }}>Deep dive into your HungerBox spending trends.</p>
            </header>

            {/* KPI Cards */}
            <div className="grid-cols-3 mb-8">
                <div className="glass-panel stat-card">
                    <span className="stat-label">Total Spend (All Time)</span>
                    <span className="stat-value">₹{invoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
                </div>
                <div className="glass-panel stat-card">
                    <span className="stat-label">Average Invoice</span>
                    <span className="stat-value">
                        ₹{Math.round(invoices.reduce((s, i) => s + i.amount, 0) / (invoices.length || 1)).toLocaleString()}
                    </span>
                </div>
                <div className="glass-panel stat-card">
                    <span className="stat-label">Busiest Month</span>
                    <span className="stat-value" style={{ fontSize: '1.25rem' }}>
                        {lineChartData.sort((a: any, b: any) => b.total - a.total)[0]?.name || 'N/A'}
                    </span>
                </div>
            </div>

            <div className="analytics-grid">

                {/* Monthly Trend Area Chart */}
                <div className="glass-panel chart-container full-width">
                    <h3>Monthly Spending Trend</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <AreaChart data={lineChartData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Spent']}
                                />
                                <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Location Split Pie Chart */}
                <div className="glass-panel chart-container">
                    <h3>Spending by Location</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="legend">
                            {pieChartData.map((d, i) => (
                                <div key={d.name} className="legend-item">
                                    <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                                    <span>{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Vendors Bar Chart */}
                <div className="glass-panel chart-container">
                    <h3>Top 8 Stalls by Spend</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={barChartData} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: number) => `₹${value.toLocaleString()}`} />
                                <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            <style jsx>{`
        .mb-8 { margin-bottom: 2rem; }
        .analytics-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }
        .full-width { grid-column: 1 / -1; }
        .chart-container { padding: 1.5rem; }
        h3 { margin-bottom: 1.5rem; font-size: 1.1rem; color: #334155; }
        
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          margin-top: 1rem;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #64748b;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
      `}</style>
        </div>
    );
}
