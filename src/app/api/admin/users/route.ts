
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

async function getUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveUsers(users: any[]) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function GET() {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const users = await getUsers();
    const safeUsers = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt || new Date().toISOString()
    }));

    return NextResponse.json({ success: true, data: safeUsers });
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { userId, newPassword } = await request.json();

        if (!userId || !newPassword) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const users = await getUsers();
        const userIndex = users.findIndex((u: any) => u.id === userId);

        if (userIndex === -1) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Update password
        users[userIndex].passwordHash = bcrypt.hashSync(newPassword, 10);
        await saveUsers(users);

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
