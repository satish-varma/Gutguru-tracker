import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settings';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || !session.user.id) return NextResponse.json({}, { status: 401 });

    // @ts-ignore
    const settings = await getSettings(session.user.id);
    return NextResponse.json(settings);
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || !session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        // @ts-ignore
        await saveSettings(session.user.id, body);
        return NextResponse.json({ success: true, settings: body });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }
}
