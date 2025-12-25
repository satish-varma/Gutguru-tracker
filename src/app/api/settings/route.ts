import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/turso';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || !session.user.organizationId) return NextResponse.json({}, { status: 401 });

    try {
        // @ts-ignore
        const settings = await getSettings(session.user.organizationId);
        return NextResponse.json(settings);
    } catch (error) {
        console.error('[API] Failed to get settings:', error);
        return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || !session.user.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // @ts-ignore
    if (session.user.role !== 'admin' && session.user.role !== 'manager') {
        return NextResponse.json({ error: 'Forbidden: Managers only' }, { status: 403 });
    }

    try {
        const body = await request.json();
        // @ts-ignore
        await saveSettings(session.user.organizationId, body);
        return NextResponse.json({ success: true, settings: body });
    } catch (error) {
        console.error('[API] Failed to save settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
