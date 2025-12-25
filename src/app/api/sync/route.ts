import { NextResponse } from 'next/server';
import { performSync } from '@/lib/sync';
import { getInvoices } from '@/lib/turso';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || !session.user || !session.user.organizationId) return NextResponse.json({}, { status: 401 });

  try {
    // @ts-ignore
    const invoices = await getInvoices(session.user.organizationId);
    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error('[API] Failed to get invoices:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || !session.user || !session.user.organizationId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // @ts-ignore
  if (session.user.role !== 'admin' && session.user.role !== 'manager') {
    return NextResponse.json({ success: false, error: 'Forbidden: Managers only' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const forceFullSync = searchParams.get('full') === 'true';

    // @ts-ignore
    const result = await performSync(session.user.organizationId, {
      forceFullSync,
      signal: request.signal
    });

    return NextResponse.json(result);

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
