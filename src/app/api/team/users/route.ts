import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { getUsers, createUser, updateUserRole, deleteUser, getUserByEmail, updateUserPermissions, updateUserPassword, updateUserName } from '@/lib/turso';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const orgId = session.user.organizationId as string;
        const users = await getUsers(orgId);

        // Filter users belonging to this Manager's Organization (only 'user' role)
        const orgUsers = users.filter((u: any) => u.role === 'user');

        return NextResponse.json({ success: true, users: orgUsers });
    } catch (error) {
        console.error('[API] Failed to get team users:', error);
        return NextResponse.json({ success: false, error: 'Failed to get users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { name, email, password, permissions } = await request.json();
        const orgId = session.user.organizationId as string;

        if (!name || !email || !password) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
        }

        await createUser({
            id: Date.now().toString(),
            email,
            password: bcrypt.hashSync(password, 10),
            name,
            role: 'user', // Strictly 'user' for team members
            orgId,
            permissions: permissions || { locations: [], stalls: [], validFrom: '' }
        });

        return NextResponse.json({ success: true, message: 'User created successfully' });

    } catch (error) {
        console.error('[API] Failed to create team user:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { userId, role, permissions, password, name } = await request.json();
        const orgId = session.user.organizationId as string;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
        }

        if (role) {
            await updateUserRole(userId, role, orgId);
        }

        if (permissions) {
            await updateUserPermissions(userId, permissions, orgId);
        }

        if (name) {
            await updateUserName(userId, name, orgId);
        }

        if (password && password.trim().length > 0) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            await updateUserPassword(userId, hashedPassword, orgId);
        }

        return NextResponse.json({ success: true, message: 'User updated successfully' });

    } catch (error) {
        console.error('[API] Failed to update team user:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'manager') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const orgId = session.user.organizationId as string;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
        }

        await deleteUser(userId, orgId);

        return NextResponse.json({ success: true, message: 'User deleted successfully' });

    } catch (error) {
        console.error('[API] Failed to delete team user:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
