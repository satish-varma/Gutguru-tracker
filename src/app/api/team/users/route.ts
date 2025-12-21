
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { User, UserRole } from '@/types';

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

// Helper (Duplicated from auth.ts - in a real app, move to shared lib)
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
    if (!session || !session.user || session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const users = await getUsers();
    // @ts-ignore
    const orgId = session.user.organizationId;

    // Filter users belonging to this manager's organization
    // Exclude the manager themselves if you want, or include them. Currently including subs.
    const team = users.filter((u: User) => u.organizationId === orgId && u.role === 'user');

    const safeTeam = team.map((u: User) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        permissions: u.permissions || {}
    }));

    return NextResponse.json({ success: true, data: safeTeam });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { name, email, password, permissions } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const users = await getUsers();
        if (users.find((u: User) => u.email === email)) {
            return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
        }

        // @ts-ignore
        const orgId = session.user.organizationId;

        const newUser: User = {
            id: crypto.randomUUID(),
            name,
            email,
            passwordHash: bcrypt.hashSync(password, 10),
            role: 'user', // Strictly 'user'
            organizationId: orgId, // Bind to Manager's Org
            permissions: permissions || {}, // { locations: [], stalls: [], validFrom: '' }
            createdBy: session.user.email
        };

        users.push(newUser);
        await saveUsers(users);

        return NextResponse.json({ success: true, message: 'User created successfully', user: newUser });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { userId, permissions, password } = await request.json();
        // @ts-ignore
        const orgId = session.user.organizationId;

        const users = await getUsers();
        const userIndex = users.findIndex((u: User) => u.id === userId && u.organizationId === orgId);

        if (userIndex === -1) {
            return NextResponse.json({ success: false, error: 'User not found in your organization' }, { status: 404 });
        }

        if (permissions) {
            users[userIndex].permissions = permissions;
        }

        if (password && password.trim().length > 0) {
            users[userIndex].passwordHash = bcrypt.hashSync(password, 10);
        }

        await saveUsers(users);

        return NextResponse.json({ success: true, message: 'User updated successfully' });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // @ts-ignore
        const orgId = session.user.organizationId;

        const users = await getUsers();
        // Filter out the deleted user, ensuring they belong to current Org
        const newUsers = users.filter((u: User) => !(u.id === userId && u.organizationId === orgId));

        if (newUsers.length === users.length) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        await saveUsers(newUsers);

        return NextResponse.json({ success: true, message: 'User deleted' });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
