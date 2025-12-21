import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

export async function POST(request: Request) {
    try {
        const { name, email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Read existing users
        let users = [];
        try {
            const data = await fs.readFile(USERS_FILE, 'utf-8');
            users = JSON.parse(data);
        } catch {
            // file doesn't exist yet
        }

        if (users.find((u: any) => u.email === email)) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            passwordHash: bcrypt.hashSync(password, 10),
            role: 'user', // Default role
        };

        users.push(newUser);
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));

        // Create user data directory
        const userDir = path.join(process.cwd(), 'data', newUser.id);
        await fs.mkdir(userDir, { recursive: true });

        // Initialize user settings
        await fs.writeFile(
            path.join(userDir, 'settings.json'),
            JSON.stringify({ emailSearchTerm: 'HungerBox', syncLookbackDays: 30 }, null, 2)
        );

        // Initialize empty invoices
        await fs.writeFile(
            path.join(userDir, 'invoices.json'),
            JSON.stringify([], null, 2)
        );

        return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email } });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
