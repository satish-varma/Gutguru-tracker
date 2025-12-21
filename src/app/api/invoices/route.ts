import { NextResponse } from 'next/server';
import { getInvoices } from '@/lib/db';

export async function GET() {
    const invoices = await getInvoices();
    return NextResponse.json({ success: true, data: invoices });
}
