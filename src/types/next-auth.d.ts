import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id?: string;
            role?: string;
            organizationId?: string;
            permissions?: {
                locations: string[];
                stalls: string[];
                validFrom?: string;
            };
        } & DefaultSession["user"]
    }

    interface User {
        id: string;
        role: string;
        organizationId: string;
        permissions?: any;
    }
}
