'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, BarChart3, Settings, PieChart, LogOut, Shield } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

const MENU_ITEMS = [
  { name: 'Overview', icon: LayoutDashboard, path: '/' },
  { name: 'Invoices', icon: FileText, path: '/invoices' },
  { name: 'Analytics', icon: BarChart3, path: '/analytics' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // @ts-ignore
  const isAdmin = session?.user?.role === 'admin';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <PieChart size={20} color="white" />
        </div>
        <span className="logo-text">HungerBox</span>
      </div>

      <nav className="sidebar-nav">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={`nav-item ${pathname === '/admin' ? 'active' : ''}`}
          >
            <Shield size={18} />
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">
            {session?.user?.name ? session.user.name.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <span className="name">{session?.user?.name || 'User'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="role">{session?.user?.id === 'admin_user' ? 'Admin' : 'User'}</span>
              <button onClick={() => signOut()} className="sign-out-btn" title="Sign Out">
                <LogOut size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          width: 240px;
          height: 100vh;
          background: #0f172a; /* Slate 900 */
          color: #94a3b8; /* Slate 400 */
          display: flex;
          flex-direction: column;
          border-right: 1px solid #1e293b;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 50;
        }

        .sidebar-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid #1e293b;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          background: var(--primary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-text {
          color: white;
          font-weight: 600;
          font-size: 1.1rem;
          letter-spacing: -0.01em;
        }

        .sidebar-nav {
          padding: 1.5rem 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
        }

        .nav-item.active {
          background: var(--primary);
          color: white;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid #1e293b;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #334155;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .name {
          color: #e2e8f0;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .role {
            font-size: 0.75rem;
            color: #64748b;
        }
        
        .sign-out-btn {
            background: none;
            border: none;
            padding: 0;
            margin: 0;
            color: #ef4444;
            cursor: pointer;
            opacity: 0.7;
            display: flex;
            align-items: center;
        }
        .sign-out-btn:hover {
           opacity: 1;
        }
      `}</style>
    </aside>
  );
}
