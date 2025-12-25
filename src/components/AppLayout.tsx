'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const sidebarWidth = isCollapsed ? '80px' : '260px';

    const isAuthPage = pathname === '/auth/signin';

    if (isAuthPage) {
        return <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>{children}</div>;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
            <Sidebar isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
            <div
                style={{
                    flex: 1,
                    marginLeft: sidebarWidth,
                    transition: 'margin-left 0.3s ease-in-out',
                    minWidth: 0,
                    position: 'relative'
                }}
            >
                {children}
            </div>
        </div>
    );
}
