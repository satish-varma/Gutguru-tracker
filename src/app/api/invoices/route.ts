import { NextResponse } from 'next/server';
import { getInvoices, saveInvoices } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || !session.user.organizationId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedOrgId = searchParams.get('orgId');

    // @ts-ignore
    let targetOrgId = session.user.organizationId;

    // Admin Override
    // @ts-ignore
    if (session.user.role === 'admin' && requestedOrgId) {
        targetOrgId = requestedOrgId;
    }

    // @ts-ignore
    let invoices = await getInvoices(targetOrgId);

    // Filter for regular 'user' role
    // @ts-ignore
    if (session.user.role === 'user') {
        // @ts-ignore
        const perms = session.user.permissions || {};
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
}

export async function DELETE() {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || !session.user.organizationId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore
    if (session.user.role !== 'admin' && session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Forbidden: Managers only' }, { status: 403 });
    }

    // @ts-ignore
    await saveInvoices(session.user.organizationId, []); // Clear data
    return NextResponse.json({ success: true, message: 'All invoices deleted' });
}
