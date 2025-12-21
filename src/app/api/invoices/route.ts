import { NextResponse } from 'next/server';
import { getInvoices } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore
    const invoices = await getInvoices(session.user.id);
    return NextResponse.json({ success: true, data: invoices });
}
