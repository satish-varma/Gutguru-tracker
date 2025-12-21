'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Search, User } from 'lucide-react';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [actionMsg, setActionMsg] = useState('');

    useEffect(() => {
        // @ts-ignore
        if (status === 'authenticated' && session?.user?.role !== 'admin') {
            router.push('/'); // Redirect non-admins
        } else if (status === 'authenticated') {
            fetchUsers();
        }
    }, [status, session, router]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!selectedUser || !newPassword) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    newPassword: newPassword
                })
            });

            if (res.ok) {
                setActionMsg(`Password for ${selectedUser.name} updated.`);
                setNewPassword('');
                setSelectedUser(null);
                setTimeout(() => setActionMsg(''), 3000);
            } else {
                setActionMsg('Failed to update password.');
            }
        } catch (err) {
            setActionMsg('Error occurred.');
        }
    };

    if (status === 'loading' || isLoading) return <div className="p-8">Loading Admin Panel...</div>;

    // @ts-ignore
    if (session?.user?.role !== 'admin') return null; // Double check protection

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <header className="mb-8" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#e0f2fe', borderRadius: '12px', color: '#0284c7' }}>
                    <Shield size={32} />
                </div>
                <div>
                    <h1 style={{ margin: 0 }}>Admin Console</h1>
                    <p style={{ color: '#64748b', margin: '0.25rem 0 0 0' }}>User Management & Security</p>
                </div>
            </header>

            {actionMsg && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    background: actionMsg.includes('Failed') ? '#fee2e2' : '#dcfce7',
                    color: actionMsg.includes('Failed') ? '#ef4444' : '#166534',
                    borderRadius: '8px',
                    fontWeight: 500
                }}>
                    {actionMsg}
                </div>
            )}

            <div className="glass-panel">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Registered Users</h2>
                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Total: {users.length}</span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>User</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>Role</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>Sync Status</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {user.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{user.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: user.role === 'admin' ? '#e0f2fe' : '#f1f5f9',
                                        color: user.role === 'admin' ? '#0284c7' : '#64748b'
                                    }}>
                                        {user.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                                    Active {/* Placeholder */}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <button
                                        onClick={() => setSelectedUser(user)}
                                        className="btn"
                                        style={{
                                            border: '1px solid #e2e8f0',
                                            padding: '0.4rem 0.8rem',
                                            fontSize: '0.8rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.4rem'
                                        }}
                                    >
                                        <Key size={14} />
                                        Reset Password
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Password Reset Modal */}
            {selectedUser && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div className="glass-panel" style={{ background: 'white', padding: '2rem', width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0 }}>Reset Password</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            Enter a new password for <strong>{selectedUser.name}</strong>.
                        </p>

                        <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                marginBottom: '1.5rem'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setSelectedUser(null); setNewPassword(''); }}
                                className="btn"
                                style={{ background: '#f1f5f9', color: '#64748b' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePasswordReset}
                                className="btn btn-primary"
                                disabled={!newPassword}
                            >
                                Update Password
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
