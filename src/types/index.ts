export interface Invoice {
    id: string;
    date: string;
    location: string;
    stall: string;
    amount: number;
    status: 'Processed' | 'Pending' | 'Paid';
    serviceDateRange?: string;
    pdfUrl?: string;
    pdfPath?: string;
}

export type UserRole = 'admin' | 'manager' | 'user';

export interface UserPermissions {
    locations?: string[]; // Specific locations or empty for all
    stalls?: string[];    // Specific stalls or empty for all
    validFrom?: string;   // ISO Date string
}

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    organizationId: string; // Links users to a shared data bucket (The Manager's ID)
    permissions?: UserPermissions;
    createdBy?: string;
}
