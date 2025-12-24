'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, Edit2, Trash2, Shield, Calendar, MapPin, Store } from 'lucide-react';
import { format } from 'date-fns';
import { MultiSelect } from '@/components/MultiSelect';

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
    const [referenceData, setReferenceData] = useState<any[]>([]);
    const [availableLocations, setAvailableLocations] = useState<string[]>([]);
    // Derived state for stalls will be calculated based on selected locations
    const filteredStalls = referenceData.length > 0
        ? Array.from(new Set(
            referenceData
                .filter((item: any) =>
                    formData.permissions.locations.length === 0 ||
                    formData.permissions.locations.includes(item.location)
                )
                .map((item: any) => item.stall)
        )).sort() as string[]
        : [];

    useEffect(() => {
        if (status === 'authenticated') {
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
            if (data.success) setTeam(data.users || []);
        } catch (error) {
            console.error('Failed to fetch team', error);
            setTeam([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReferenceData = async () => {
        try {
            const res = await fetch('/api/invoices');
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                setReferenceData(result.data);
                // Extract unique values
                const locs = Array.from(new Set(result.data.map((i: any) => i.location))).sort() as string[];
                setAvailableLocations(locs);
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
                    <div className="bg-white rounded-xl shadow-2xl overflow-y-auto m-4" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh' }}>
                        <form onSubmit={handleSubmit} className="modal-content" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className="text-xl font-bold" style={{ margin: 0 }}>
                                    {editingUser ? 'Edit Member Permissions' : 'Add New Member'}
                                </h2>
                                <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Full Name</label>
                                    <input
                                        required
                                        className="form-input"
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        disabled={!!editingUser}
                                        className="form-input"
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', background: editingUser ? '#f8fafc' : 'white' }}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                                        {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        className="form-input"
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                                <h3 className="font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem' }}>
                                    <Shield size={18} /> Access Control
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <MultiSelect
                                            label="Allowed Locations"
                                            options={availableLocations}
                                            value={formData.permissions.locations}
                                            onChange={(vals) => setFormData({
                                                ...formData,
                                                permissions: {
                                                    ...formData.permissions,
                                                    locations: vals
                                                }
                                            })}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Select specific locations. If none selected (All), ALL are allowed.</p>
                                    </div>

                                    <div>
                                        <MultiSelect
                                            label="Allowed Stalls"
                                            options={filteredStalls}
                                            value={formData.permissions.stalls}
                                            onChange={(vals) => setFormData({
                                                ...formData,
                                                permissions: {
                                                    ...formData.permissions,
                                                    stalls: vals
                                                }
                                            })}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Select specific stalls. If none selected (All), ALL are allowed.</p>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Data Visibility Start Date</label>
                                        <input
                                            type="date"
                                            style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                                            value={formData.permissions.validFrom}
                                            onChange={e => setFormData({
                                                ...formData,
                                                permissions: { ...formData.permissions, validFrom: e.target.value }
                                            })}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>User can only see data from this date onwards.</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                <button type="button" onClick={closeModal} className="btn" style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b' }}>Cancel</button>
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
