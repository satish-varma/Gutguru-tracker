import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAuditLog, getSettings } from '@/lib/turso';
import { headers } from 'next/headers';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user as any).role === 'user') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = (session.user as any).organizationId;
    const settings = await getSettings(orgId);

    const workerUrl = settings.hungerboxWorkerUrl || process.env.HUNGERBOX_WORKER_URL;
    const apiKey = settings.hungerboxWorkerApiKey || process.env.WORKER_API_KEY;

    if (!workerUrl || !apiKey) {
        return NextResponse.json({
            success: false,
            error: 'Worker configuration missing. Please set HungerBox Worker URL and API Key in Settings or environment variables.'
        }, { status: 500 });
    }

    try {
        // Prepare payload for the worker
        // You might want to pass parameters like date range or organizationId
        const payload = {
            organizationId: (session.user as any).organizationId,
            timestamp: new Date().toISOString()
        };

        // Fire and forget (or return sync started)
        // Note: fetch will wait for the response unless we implement a more complex background task
        // But for HF Spaces, we typically wait for the trigger response

        console.log(`[Sync] Triggering HungerBox Worker at ${workerUrl}`);

        // We don't await the full result if it takes too long, but usually trigger is fast
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(payload)
        });

        const contentType = response.headers.get("content-type");
        let result;
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Worker returned non-JSON response (Status: ${response.status})`);
        }

        if (!response.ok) {
            throw new Error(`Worker Error: ${result?.error || result?.message || response.statusText}`);
        }

        // Record audit log
        const headerList = headers();
        const ip = (await headerList).get('x-forwarded-for') || (await headerList).get('x-real-ip') || 'unknown';

        await createAuditLog({
            userId: session.user.id,
            userEmail: session.user.email,
            action: 'Triggered HungerBox Sales Sync',
            details: JSON.stringify({
                workerUrl: workerUrl.substring(0, 30) + '...',
                workerResponse: result
            }),
            orgId: (session.user as any).organizationId,
            ipAddress: ip
        });

        return NextResponse.json({
            success: true,
            message: 'HungerBox Sales Sync Triggered successfully',
            workerStatus: result
        });

    } catch (error: any) {
        console.error('[API] HungerBox Sync trigger failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to trigger worker',
            details: error.stack
        }, { status: 500 });
    }
}
