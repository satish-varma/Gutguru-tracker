import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail, initializeDatabase, seedDefaultAdmin, createLoginHistory } from "@/lib/turso";
import { headers } from 'next/headers';

// Initialize database on startup
let dbInitialized = false;
async function ensureDbInitialized() {
    if (!dbInitialized) {
        await initializeDatabase();
        // Seed default admin for the default org
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        await seedDefaultAdmin('default', defaultPassword);
        dbInitialized = true;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                // Ensure database is initialized
                await ensureDbInitialized();

                const user = await getUserByEmail(credentials.email);

                const headerList = headers();
                const ip = (await headerList).get('x-forwarded-for') || (await headerList).get('x-real-ip') || 'unknown';
                const userAgent = (await headerList).get('user-agent') || 'unknown';

                if (user && bcrypt.compareSync(credentials.password, user.password)) {
                    const sessionUser = {
                        id: user.id,
                        name: user.name || user.email.split('@')[0],
                        email: user.email,
                        role: user.role,
                        organizationId: user.orgId,
                        permissions: user.permissions,
                    };

                    // Record successful login
                    await createLoginHistory({
                        userId: user.id,
                        userEmail: user.email,
                        status: 'success',
                        ipAddress: ip,
                        userAgent: userAgent,
                        orgId: user.orgId
                    });

                    return sessionUser;
                }

                // Record failed login
                if (user) {
                    await createLoginHistory({
                        userId: user.id,
                        userEmail: user.email,
                        status: 'failed',
                        ipAddress: ip,
                        userAgent: userAgent,
                        orgId: user.orgId
                    });
                }

                return null;
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.organizationId = user.organizationId;
                token.permissions = user.permissions;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.organizationId = token.organizationId;
                session.user.permissions = token.permissions;
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/signin',
    }
};
