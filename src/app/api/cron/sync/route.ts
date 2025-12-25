import { NextResponse } from 'next/server';
import { performSync } from '@/lib/sync';
import { turso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Check for Vercel Cron authorization
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    console.log('[Cron] Starting daily auto-sync for all organizations...');

    try {
        // Get all unique organization IDs from the users table
        const result = await turso.execute('SELECT DISTINCT org_id FROM users');
        const orgIds = result.rows.map(row => row.org_id as string).filter(Boolean);

        if (orgIds.length === 0) {
            return NextResponse.json({ success: true, message: 'No organizations found to sync.' });
        }

        const results = [];
        for (const orgId of orgIds) {
            try {
                console.log(`[Cron] Syncing Org: ${orgId}`);
                const syncResult = await performSync(orgId);
                results.push({ orgId, success: true, count: syncResult.count });
            } catch (error: any) {
                console.error(`[Cron] Failed to sync Org ${orgId}:`, error.message);
                results.push({ orgId, success: false, error: error.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Auto-sync completed',
            summary: results
        });
    } catch (error: any) {
        console.error('[Cron] Critical error in auto-sync:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
