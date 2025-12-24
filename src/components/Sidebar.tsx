'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, BarChart3, Settings, PieChart, Users, Shield, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import styles from './Sidebar.module.css';

const MENU_ITEMS = [
  { name: 'Overview', icon: LayoutDashboard, path: '/' },
  { name: 'Invoices', icon: FileText, path: '/invoices' },
  { name: 'Analytics', icon: BarChart3, path: '/analytics' },
];

export interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, toggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === 'admin';
  const isManager = session?.user?.role === 'manager';

  const showSettings = isManager || isAdmin;

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.iconContainer}>
          <PieChart size={28} color="#000" />
        </div>
        {!isCollapsed && <span className={styles.logoText}>TheGutGuru</span>}

        <button className={styles.collapseBtn} onClick={toggleCollapse}>
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className={styles.sidebarNav}>
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              title={isCollapsed ? item.name : ''}
            >
              <div className={styles.iconContainer}>
                <item.icon size={20} strokeWidth={1.5} />
              </div>
              {!isCollapsed && <span className={styles.linkText}>{item.name}</span>}
            </Link>
          );
        })}

        {isManager && (
          <Link
            href="/team"
            className={`${styles.navItem} ${pathname === '/team' ? styles.active : ''}`}
            title={isCollapsed ? 'Team' : ''}
          >
            <div className={styles.iconContainer}>
              <Users size={20} strokeWidth={1.5} />
            </div>
            {!isCollapsed && <span className={styles.linkText}>Team</span>}
          </Link>
        )}

        {isAdmin && (
          <Link
            href="/admin"
            className={`${styles.navItem} ${pathname === '/admin' ? styles.active : ''}`}
            title={isCollapsed ? 'Admin' : ''}
          >
            <div className={styles.iconContainer}>
              <Shield size={20} strokeWidth={1.5} />
            </div>
            {!isCollapsed && <span className={styles.linkText}>Admin</span>}
          </Link>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }}></div>

        {/* User Profile Section */}
        {session?.user && (
          <div className={isCollapsed ? styles.collapsedProfile : styles.userProfile}>
            {isCollapsed ? (
              <button onClick={() => signOut()} className={styles.logoutBtnCollapsed} title="Sign Out">
                <div className={styles.avatarSmall}>
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </button>
            ) : (
              <>
                <div className={styles.avatar}>
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{session.user.name}</span>
                  <span className={styles.userRole}>{session.user.role || 'User'}</span>
                </div>
                <button onClick={() => signOut()} className={styles.logoutBtn} title="Sign Out">
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        )}

        {showSettings && (
          <div className={styles.settingsContainer}>
            <Link
              href="/settings"
              className={`${styles.navItem} ${styles.settingsItem} ${pathname === '/settings' ? styles.active : ''}`}
              title={isCollapsed ? 'Settings' : ''}
            >
              <div className={styles.iconContainer}>
                <Settings size={20} strokeWidth={1.5} />
              </div>
              {!isCollapsed && <span className={styles.linkText}>Settings</span>}
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
