
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { User } from '@/types';
import { getUsers, saveUsers } from '@/lib/db';

export async function GET() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // @ts-ignore
    const orgId = session.user.organizationId;
    const users = await getUsers();

    // Filter users belonging to this Manager's Organization
    // Also exclude the Manager themselves? Usually yes or no.
    // Let's return all users in the org.
    const orgUsers = users.filter((u: User) => u.organizationId === orgId && u.role === 'user');

    return NextResponse.json({ success: true, users: orgUsers });
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
            createdBy: session.user.email || 'system'
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
        const { userId } = await request.json();
        // @ts-ignore
        const orgId = session.user.organizationId;

        const users = await getUsers();
        const initialLength = users.length;

        // Remove only if it belongs to org and is 'user' role (safety)
        const newUsers = users.filter((u: User) => !(u.id === userId && u.organizationId === orgId));

        if (newUsers.length === initialLength) {
            return NextResponse.json({ success: false, error: 'User not found or cannot be deleted' }, { status: 404 });
        }

        await saveUsers(newUsers);

        return NextResponse.json({ success: true, message: 'User deleted successfully' });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
