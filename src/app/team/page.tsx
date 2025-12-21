'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, Edit2, Trash2, Shield, Calendar, MapPin, Store } from 'lucide-react';
import { format } from 'date-fns';

export default function TeamPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [team, setTeam] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        permissions: {
            locations: [] as string[],
            stalls: [] as string[],
            validFrom: ''
        }
    });

    // Reference Data for Selects
    const [availableLocations, setAvailableLocations] = useState<string[]>([]);
    const [availableStalls, setAvailableStalls] = useState<string[]>([]);

    useEffect(() => {
        // @ts-ignore
        if (status === 'authenticated') {
            // @ts-ignore
            if (session?.user?.role !== 'manager') {
                router.push('/');
                return;
            }
            fetchTeam();
            fetchReferenceData();
        }
    }, [status, session, router]);

    const fetchTeam = async () => {
        try {
            const res = await fetch('/api/team/users');
            const data = await res.json();
            if (data.success) setTeam(data.data);
        } catch (error) {
            console.error('Failed to fetch team', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReferenceData = async () => {
        try {
            const res = await fetch('/api/invoices');
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                // Extract unique values
                const locs = Array.from(new Set(result.data.map((i: any) => i.location))).sort() as string[];
                const stalls = Array.from(new Set(result.data.map((i: any) => i.stall))).sort() as string[];
                setAvailableLocations(locs);
                setAvailableStalls(stalls);
            }
        } catch (e) {
            console.error('Failed to fetch ref data', e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const endpoint = '/api/team/users';
        const method = editingUser ? 'PUT' : 'POST';

        const payload = editingUser
            ? { ...formData, userId: editingUser.id }
            : formData;

        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                closeModal();
                fetchTeam();
            } else {
                alert('Operation failed');
            }
        } catch (error) {
            alert('Network error');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this user?')) return;
        try {
            await fetch(`/api/team/users?userId=${userId}`, { method: 'DELETE' });
            fetchTeam();
        } catch (e) { console.error(e); }
    };

    const openModal = (user?: any) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '', // Don't show existing hash
                permissions: {
                    locations: user.permissions?.locations || [],
                    stalls: user.permissions?.stalls || [],
                    validFrom: user.permissions?.validFrom || ''
                }
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '', email: '', password: '',
                permissions: { locations: [], stalls: [], validFrom: '' }
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const toggleSelection = (list: string[], item: string) => {
        if (list.includes(item)) return list.filter(i => i !== item);
        return [...list, item];
    };

    if (isLoading) return <div className="p-8">Loading Team...</div>;

    return (
        <div className="container" style={{ maxWidth: '1200px' }}>
            <header className="mb-8 flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h1>Team Management</h1>
                    <p style={{ color: '#64748b' }}>Manage access and permissions for your staff.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn btn-primary"
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                >
                    <UserPlus size={18} />
                    Add Member
                </button>
            </header>

            <div className="glass-panel">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                            <th className="p-4 text-sm text-slate-500">Member</th>
                            <th className="p-4 text-sm text-slate-500">Access Scope</th>
                            <th className="p-4 text-sm text-slate-500">Data Visibility</th>
                            <th className="p-4 text-sm text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {team.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td className="p-4">
                                    <div className="font-medium">{user.name}</div>
                                    <div className="text-sm text-slate-500">{user.email}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                            <MapPin size={14} className="text-slate-400" />
                                            {user.permissions.locations?.length > 0
                                                ? user.permissions.locations.includes('*') ? 'All Locations' : `${user.permissions.locations.length} Locations`
                                                : 'All Locations'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                            <Store size={14} className="text-slate-400" />
                                            {user.permissions.stalls?.length > 0
                                                ? user.permissions.stalls.includes('*') ? 'All Stalls' : `${user.permissions.stalls.length} Stalls`
                                                : 'All Stalls'}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                        <Calendar size={14} className="text-slate-400" />
                                        {user.permissions.validFrom
                                            ? `From ${format(new Date(user.permissions.validFrom), 'MMM d, yyyy')}`
                                            : 'Full History'}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => openModal(user)} className="btn p-2 border border-slate-200">
                                            <Edit2 size={16} className="text-slate-600" />
                                        </button>
                                        <button onClick={() => handleDelete(user.id)} className="btn p-2 border border-red-200 bg-red-50">
                                            <Trash2 size={16} className="text-red-600" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {team.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400">
                                    No team members found. Invite someone to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
                }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
                        <form onSubmit={handleSubmit} className="p-6">
                            <h2 className="text-xl font-bold mb-6">
                                {editingUser ? 'Edit Member Permissions' : 'Add New Member'}
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Full Name</label>
                                    <input
                                        required
                                        className="w-full p-2 border rounded"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        disabled={!!editingUser}
                                        className="w-full p-2 border rounded disabled:bg-slate-50"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">
                                        {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        className="w-full p-2 border rounded"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-6 mb-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Shield size={18} /> Access Control
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Allowed Locations</label>
                                        <div className="flex flex-wrap gap-2 p-3 border rounded bg-slate-50 max-h-32 overflow-y-auto">
                                            {availableLocations.map(loc => (
                                                <button
                                                    key={loc}
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        permissions: {
                                                            ...formData.permissions,
                                                            locations: toggleSelection(formData.permissions.locations, loc)
                                                        }
                                                    })}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${formData.permissions.locations.includes(loc)
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-white border text-slate-600 hover:border-blue-400'
                                                        }`}
                                                >
                                                    {loc}
                                                </button>
                                            ))}
                                            {availableLocations.length === 0 && <span className="text-slate-400 text-sm">No locations found via Sync yet.</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Select specific locations. If none selected, ALL are allowed.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Allowed Stalls</label>
                                        <div className="flex flex-wrap gap-2 p-3 border rounded bg-slate-50 max-h-32 overflow-y-auto">
                                            {availableStalls.map(stall => (
                                                <button
                                                    key={stall}
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        permissions: {
                                                            ...formData.permissions,
                                                            stalls: toggleSelection(formData.permissions.stalls, stall)
                                                        }
                                                    })}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${formData.permissions.stalls.includes(stall)
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-white border text-slate-600 hover:border-purple-400'
                                                        }`}
                                                >
                                                    {stall}
                                                </button>
                                            ))}
                                            {availableStalls.length === 0 && <span className="text-slate-400 text-sm">No stalls found via Sync yet.</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Select specific stalls. If none selected, ALL are allowed.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data Visibility Start Date</label>
                                        <input
                                            type="date"
                                            className="p-2 border rounded"
                                            value={formData.permissions.validFrom}
                                            onChange={e => setFormData({
                                                ...formData,
                                                permissions: { ...formData.permissions, validFrom: e.target.value }
                                            })}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">User can only see data from this date onwards.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={closeModal} className="btn border border-slate-200">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Member</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .p-4 { padding: 1rem; }
                .p-8 { padding: 2rem; }
                .text-sm { font-size: 0.875rem; }
                .text-xs { font-size: 0.75rem; }
                .font-medium { font-weight: 500; }
                .text-slate-500 { color: #64748b; }
                .text-slate-400 { color: #94a3b8; }
                .text-right { text-align: right; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mt-1 { margin-top: 0.25rem; }
                .border { border: 1px solid #e2e8f0; }
                .rounded { border-radius: 0.375rem; }
                .rounded-xl { border-radius: 0.75rem; }
                .rounded-full { border-radius: 9999px; }
                .bg-slate-50 { background-color: #f8fafc; }
                .bg-white { background-color: white; }
                .w-full { width: 100%; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                .flex-col { flex-direction: column; }
                .gap-1 { gap: 0.25rem; }
                .gap-2 { gap: 0.5rem; }
                .gap-4 { gap: 1rem; }
                .grid { display: grid; }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .col-span-2 { grid-column: span 2 / span 2; }
                .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
                .max-h-\[90vh\] { max-height: 90vh; }
                .overflow-y-auto { overflow-y: auto; }
            `}</style>
        </div>
    );
}
