import { NextResponse } from 'next/server';
import { getHungerBoxSales } from '@/lib/turso';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).organizationId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const orgId = (session.user as any).organizationId;

        const sales = await getHungerBoxSales(orgId, limit);

        return NextResponse.json({
            success: true,
            data: sales,
            lastSynced: sales.length > 0 ? sales[0].syncedAt : null
        });
    } catch (error) {
        console.error('[API] Failed to fetch sales:', error);
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}
