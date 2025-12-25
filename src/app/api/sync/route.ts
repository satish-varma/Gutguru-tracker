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
  console.log('[Sync API] POST request received');

  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || !session.user || !session.user.organizationId) {
    console.log('[Sync API] Unauthorized - no session');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // @ts-ignore
  console.log(`[Sync API] User: ${session.user.email}, Role: ${session.user.role}, Org: ${session.user.organizationId}`);

  // @ts-ignore
  if (session.user.role !== 'admin' && session.user.role !== 'manager') {
    console.log('[Sync API] Forbidden - not admin/manager');
    return NextResponse.json({ success: false, error: 'Forbidden: Managers only' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const forceFullSync = searchParams.get('full') === 'true';
    console.log(`[Sync API] Starting sync, forceFullSync=${forceFullSync}`);

    // @ts-ignore
    const result = await performSync(session.user.organizationId, {
      forceFullSync,
      signal: request.signal
    });

    console.log(`[Sync API] Sync completed:`, JSON.stringify(result).substring(0, 500));
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[Sync API] Sync failed with error:', error);
    console.error('[Sync API] Error stack:', error?.stack);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage, details: error?.stack?.substring(0, 500) },
      { status: 500 }
    );
  }
}
