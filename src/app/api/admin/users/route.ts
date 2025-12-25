import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUsers, createUser, updateUserRole, deleteUser, getUserByEmail, updateUserPassword } from "@/lib/turso";
import bcrypt from "bcryptjs";

export async function GET() {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        // @ts-ignore
        const users = await getUsers(session.user.organizationId);
        const safeUsers = users.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt || new Date().toISOString()
        }));

        return NextResponse.json({ success: true, data: safeUsers });
    } catch (error) {
        console.error('[API] Failed to get users:', error);
        return NextResponse.json({ success: false, error: 'Failed to get users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { email, password, name, role } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return NextResponse.json({ success: false, error: 'User already exists' }, { status: 400 });
        }

        // Create new user
        const hashedPassword = bcrypt.hashSync(password, 10);
        await createUser({
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            name: name || email.split('@')[0],
            role: role || 'user',
            // @ts-ignore
            orgId: session.user.organizationId,
        });

        return NextResponse.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error('[API] Failed to create user:', error);
        return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { userId, newRole, newPassword } = await request.json();

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
        }

        // @ts-ignore
        const orgId = session.user.organizationId;

        if (newRole) {
            await updateUserRole(userId, newRole, orgId);
        }

        if (newPassword && newPassword.trim().length > 0) {
            const hashedPassword = bcrypt.hashSync(newPassword, 10);
            await updateUserPassword(userId, hashedPassword, orgId);
        }

        return NextResponse.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        console.error('[API] Failed to update user:', error);
        return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);

    // @ts-ignore
    if (!session || !session.user || session.user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
        }

        // @ts-ignore
        await deleteUser(userId, session.user.organizationId);

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('[API] Failed to delete user:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
    }
}
