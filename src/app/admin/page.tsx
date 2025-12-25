'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Key, UserPlus, Trash2, Edit, X, Check, Users } from 'lucide-react';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [actionMsg, setActionMsg] = useState('');
    const [actionType, setActionType] = useState<'success' | 'error'>('success');

    // New user form
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        email: '',
        password: '',
        name: '',
        role: 'user'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
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

    const showMessage = (msg: string, type: 'success' | 'error') => {
        setActionMsg(msg);
        setActionType(type);
        setTimeout(() => setActionMsg(''), 4000);
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
                showMessage(`Password for ${selectedUser.name || selectedUser.email} updated.`, 'success');
                setNewPassword('');
                setSelectedUser(null);
            } else {
                showMessage('Failed to update password.', 'error');
            }
        } catch (err) {
            showMessage('Error occurred.', 'error');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserForm.email || !newUserForm.password) {
            showMessage('Email and password are required.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUserForm)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showMessage(`User ${newUserForm.email} created successfully!`, 'success');
                setNewUserForm({ email: '', password: '', name: '', role: 'user' });
                setShowAddUser(false);
                fetchUsers();
            } else {
                showMessage(data.error || 'Failed to create user.', 'error');
            }
        } catch (err) {
            showMessage('Error creating user.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (user: any) => {
        if (!confirm(`Are you sure you want to delete ${user.name || user.email}?`)) return;

        try {
            const res = await fetch(`/api/admin/users?userId=${user.id}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showMessage(`User ${user.email} deleted.`, 'success');
                fetchUsers();
            } else {
                showMessage(data.error || 'Failed to delete user.', 'error');
            }
        } catch (err) {
            showMessage('Error deleting user.', 'error');
        }
    };

    const handleRoleChange = async (user: any, newRole: string) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    newRole: newRole
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                showMessage(`Role for ${user.email} updated to ${newRole}.`, 'success');
                fetchUsers();
            } else {
                showMessage(data.error || 'Failed to update role.', 'error');
            }
        } catch (err) {
            showMessage('Error updating role.', 'error');
        }
    };

    if (status === 'loading' || isLoading) return <div className="p-8">Loading Admin Panel...</div>;

    // @ts-ignore
    if (session?.user?.role !== 'admin') return null; // Double check protection

    return (
        <div className="container" style={{ maxWidth: '1100px' }}>
            <header className="mb-8" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: '#e0f2fe', borderRadius: '12px', color: '#0284c7' }}>
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0 }}>Admin Console</h1>
                        <p style={{ color: '#64748b', margin: '0.25rem 0 0 0' }}>User Management & Security</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddUser(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <UserPlus size={18} />
                    Add User
                </button>
            </header>

            {actionMsg && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    background: actionType === 'error' ? '#fee2e2' : '#dcfce7',
                    color: actionType === 'error' ? '#ef4444' : '#166534',
                    borderRadius: '8px',
                    fontWeight: 500
                }}>
                    {actionMsg}
                </div>
            )}

            <div className="glass-panel">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Users size={20} color="#64748b" />
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Registered Users</h2>
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>
                        {users.length} users
                    </span>
                </div>

                {users.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>No users found. Click "Add User" to create one.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>User</th>
                                <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>Role</th>
                                <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>Created</th>
                                <th style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '50%',
                                                background: user.role === 'admin' ? '#dbeafe' : user.role === 'manager' ? '#fef3c7' : '#f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                color: user.role === 'admin' ? '#1d4ed8' : user.role === 'manager' ? '#d97706' : '#64748b'
                                            }}>
                                                {(user.name || user.email).substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{user.name || 'Unnamed'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user, e.target.value)}
                                            style={{
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                background: user.role === 'admin' ? '#dbeafe' : user.role === 'manager' ? '#fef3c7' : '#f1f5f9',
                                                color: user.role === 'admin' ? '#1d4ed8' : user.role === 'manager' ? '#d97706' : '#64748b',
                                                border: '1px solid transparent',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="user">USER</option>
                                            <option value="manager">MANAGER</option>
                                            <option value="admin">ADMIN</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                className="btn"
                                                title="Reset Password"
                                                style={{
                                                    border: '1px solid #e2e8f0',
                                                    padding: '0.5rem',
                                                    fontSize: '0.8rem',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    background: '#f8fafc'
                                                }}
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="btn"
                                                title="Delete User"
                                                style={{
                                                    border: '1px solid #fecaca',
                                                    padding: '0.5rem',
                                                    fontSize: '0.8rem',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    background: '#fef2f2',
                                                    color: '#dc2626'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add User Modal */}
            {showAddUser && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div className="glass-panel" style={{ background: 'white', padding: '2rem', width: '100%', maxWidth: '450px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <UserPlus size={20} color="#0284c7" />
                                Add New User
                            </h3>
                            <button
                                onClick={() => setShowAddUser(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                                    Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={newUserForm.name}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                                    Email <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="user@example.com"
                                    value={newUserForm.email}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                                    Password <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={newUserForm.password}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                                    Role
                                </label>
                                <select
                                    value={newUserForm.role}
                                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        background: 'white'
                                    }}
                                >
                                    <option value="user">User (View Only)</option>
                                    <option value="manager">Manager (Sync & Manage)</option>
                                    <option value="admin">Admin (Full Access)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddUser(false)}
                                    className="btn"
                                    style={{ background: '#f1f5f9', color: '#64748b' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {isSubmitting ? 'Creating...' : (
                                        <>
                                            <Check size={16} />
                                            Create User
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Key size={20} color="#0284c7" />
                                Reset Password
                            </h3>
                            <button
                                onClick={() => { setSelectedUser(null); setNewPassword(''); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            Enter a new password for <strong>{selectedUser.name || selectedUser.email}</strong>.
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
