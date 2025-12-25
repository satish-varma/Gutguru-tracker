import { NextResponse } from 'next/server';
import { getInvoiceById, updateInvoiceStatus } from '@/lib/turso';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || !session.user.organizationId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { status } = body;

        // @ts-ignore
        const orgId = session.user.organizationId;

        // Check if invoice exists
        const invoice = await getInvoiceById(id, orgId);

        if (!invoice) {
            return NextResponse.json({
                success: false,
                error: 'Invoice not found',
                debug: { receivedId: id }
            }, { status: 404 });
        }

        // Update status
        await updateInvoiceStatus(id, status, orgId);

        return NextResponse.json({ success: true, data: { ...invoice, status } });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: 'Internal Error', details: String(e) }, { status: 500 });
    }
}

// PATCH handler - same as PUT for status updates
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || !session.user.organizationId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { status } = body;

        // @ts-ignore
        const orgId = session.user.organizationId;

        // Check if invoice exists
        const invoice = await getInvoiceById(id, orgId);

        if (!invoice) {
            return NextResponse.json({
                success: false,
                error: 'Invoice not found',
                debug: { receivedId: id }
            }, { status: 404 });
        }

        // Update status
        await updateInvoiceStatus(id, status, orgId);

        return NextResponse.json({ success: true, data: { ...invoice, status } });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: 'Internal Error', details: String(e) }, { status: 500 });
    }
}
