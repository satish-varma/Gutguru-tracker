import { NextResponse } from 'next/server';
import { getAuditLogs, getLoginHistory } from '@/lib/turso';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || !session.user.organizationId || session.user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'audit';
        const limit = parseInt(searchParams.get('limit') || '100');
        // @ts-ignore
        const orgId = session.user.organizationId;

        if (type === 'login') {
            const logs = await getLoginHistory(orgId, limit);
            return NextResponse.json({ success: true, data: logs });
        } else {
            const logs = await getAuditLogs(orgId, limit);
            return NextResponse.json({ success: true, data: logs });
        }
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}
