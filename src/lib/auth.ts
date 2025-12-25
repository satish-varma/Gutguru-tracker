import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail, initializeDatabase, seedDefaultAdmin } from "@/lib/turso";

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

                if (user && bcrypt.compareSync(credentials.password, user.password)) {
                    return {
                        id: user.id,
                        name: user.name || user.email.split('@')[0],
                        email: user.email,
                        role: user.role,
                        organizationId: user.orgId,
                        permissions: user.permissions,
                    };
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
