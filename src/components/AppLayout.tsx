'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { status } = useSession();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const sidebarWidth = isCollapsed ? '80px' : '260px';

    // Hide sidebar on auth pages OR when not fully logged in
    const isAuthPage = pathname?.startsWith('/auth/');
    const hideSidebar = isAuthPage || status !== 'authenticated';

    if (hideSidebar) {
        return (
            <div style={{ minHeight: '100vh', background: '#f1f5f9', width: '100%' }}>
                {children}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', position: 'relative' }}>
            <Sidebar isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
            <main
                className="layout-main"
                style={{
                    flex: 1,
                    minWidth: 0,
                    position: 'relative'
                }}
            >
                {children}
            </main>
            <style jsx>{`
                .layout-main {
                    margin-left: ${sidebarWidth};
                    transition: margin-left 0.3s ease-in-out;
                    padding-bottom: 0;
                }

                @media (max-width: 768px) {
                    .layout-main {
                        margin-left: 0 !important;
                        padding-bottom: 80px; /* Space for bottom nav */
                    }
                }
            `}</style>
        </div>
    );
}
