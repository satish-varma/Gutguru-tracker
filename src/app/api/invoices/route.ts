import { NextResponse } from 'next/server';
import { getInvoices, deleteAllInvoices, getUserByEmail } from '@/lib/turso';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.organizationId || !session.user.email) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedOrgId = searchParams.get('orgId');

    let targetOrgId = session.user.organizationId;

    // Admin Override
    if (session.user.role === 'admin' && requestedOrgId) {
        targetOrgId = requestedOrgId;
    }

    try {
        let invoices = await getInvoices(targetOrgId);

        // Filter for regular 'user' role
        if (session.user.role === 'user') {
            // Fetch LATEST permissions from DB instead of session
            const dbUser = await getUserByEmail(session.user.email);
            const perms = dbUser?.permissions || {};
            const { locations, stalls, validFrom } = perms;

            if (validFrom) {
                invoices = invoices.filter((inv) => new Date(inv.date) >= new Date(validFrom));
            }
            if (locations && locations.length > 0 && !locations.includes('*')) {
                invoices = invoices.filter((inv) => locations.includes(inv.location));
            }
            if (stalls && stalls.length > 0 && !stalls.includes('*')) {
                invoices = invoices.filter((inv) => stalls.includes(inv.stall));
            }
        }

        return NextResponse.json({ success: true, data: invoices });
    } catch (error) {
        console.error('[API] Failed to get invoices:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
    }
}

export async function DELETE() {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || !session.user.organizationId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Forbidden: Managers only' }, { status: 403 });
    }

    try {
        console.log(`[Stats] User ${session.user.email} resetting all data for org ${session.user.organizationId}`);
        await deleteAllInvoices(session.user.organizationId as string);
        console.log('[Stats] Data cleared successfully');
        return NextResponse.json({ success: true, message: 'All invoices deleted' });
    } catch (error) {
        console.error('[API] Failed to delete invoices:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete invoices' }, { status: 500 });
    }
}
