import { createClient } from '@libsql/client';

// Turso database client
// For local development, you can use a local SQLite file
// For production, use Turso cloud URL

const isProduction = process.env.NODE_ENV === 'production';

export const turso = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize database schema
export async function initializeDatabase() {
    try {
        // Create invoices table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                service_date_range TEXT,
                location TEXT NOT NULL,
                stall TEXT NOT NULL,
                amount REAL NOT NULL,
                status TEXT DEFAULT 'Pending',
                pdf_path TEXT,
                synced_at TEXT NOT NULL,
                org_id TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create users table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT,
                role TEXT DEFAULT 'user',
                org_id TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create settings table
        await turso.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                org_id TEXT PRIMARY KEY,
                email_search_term TEXT DEFAULT 'TheGutGuru',
                sync_lookback_days INTEGER DEFAULT 30,
                email_user TEXT,
                email_password TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes for better query performance
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id)
        `);
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)
        `);
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)
        `);
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
        `);
        await turso.execute(`
            CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id)
        `);

        console.log('[Turso] Database initialized successfully');
    } catch (error) {
        console.error('[Turso] Failed to initialize database:', error);
        throw error;
    }
}

// Invoice operations
export async function getInvoices(orgId: string) {
    const result = await turso.execute({
        sql: 'SELECT * FROM invoices WHERE org_id = ? ORDER BY date DESC',
        args: [orgId],
    });
    return result.rows.map(row => ({
        id: row.id as string,
        date: row.date as string,
        serviceDateRange: row.service_date_range as string,
        location: row.location as string,
        stall: row.stall as string,
        amount: row.amount as number,
        status: row.status as string,
        pdfPath: row.pdf_path as string,
        syncedAt: row.synced_at as string,
    }));
}

export async function getInvoiceById(id: string, orgId: string) {
    const result = await turso.execute({
        sql: 'SELECT * FROM invoices WHERE id = ? AND org_id = ?',
        args: [id, orgId],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        id: row.id as string,
        date: row.date as string,
        serviceDateRange: row.service_date_range as string,
        location: row.location as string,
        stall: row.stall as string,
        amount: row.amount as number,
        status: row.status as string,
        pdfPath: row.pdf_path as string,
        syncedAt: row.synced_at as string,
    };
}

export async function createInvoice(invoice: {
    id: string;
    date: string;
    serviceDateRange?: string;
    location: string;
    stall: string;
    amount: number;
    status?: string;
    pdfPath?: string;
    syncedAt: string;
    orgId: string;
}) {
    await turso.execute({
        sql: `INSERT OR IGNORE INTO invoices 
              (id, date, service_date_range, location, stall, amount, status, pdf_path, synced_at, org_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            invoice.id,
            invoice.date,
            invoice.serviceDateRange || null,
            invoice.location,
            invoice.stall,
            invoice.amount,
            invoice.status || 'Pending',
            invoice.pdfPath || null,
            invoice.syncedAt,
            invoice.orgId,
        ],
    });
}

export async function updateInvoiceStatus(id: string, status: string, orgId: string) {
    await turso.execute({
        sql: 'UPDATE invoices SET status = ? WHERE id = ? AND org_id = ?',
        args: [status, id, orgId],
    });
}

export async function deleteAllInvoices(orgId: string) {
    await turso.execute({
        sql: 'DELETE FROM invoices WHERE org_id = ?',
        args: [orgId],
    });
}

// User operations
export async function getUserByEmail(email: string) {
    const result = await turso.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [email],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        id: row.id as string,
        email: row.email as string,
        password: row.password as string,
        name: row.name as string,
        role: row.role as string,
        orgId: row.org_id as string,
        createdAt: row.created_at as string,
    };
}

export async function getUsers(orgId: string) {
    const result = await turso.execute({
        sql: 'SELECT id, email, name, role, created_at FROM users WHERE org_id = ? ORDER BY created_at DESC',
        args: [orgId],
    });
    return result.rows.map(row => ({
        id: row.id as string,
        email: row.email as string,
        name: row.name as string,
        role: row.role as string,
        createdAt: row.created_at as string,
    }));
}

export async function createUser(user: {
    id: string;
    email: string;
    password: string;
    name?: string;
    role?: string;
    orgId: string;
}) {
    await turso.execute({
        sql: `INSERT INTO users (id, email, password, name, role, org_id)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
            user.id,
            user.email,
            user.password,
            user.name || null,
            user.role || 'user',
            user.orgId,
        ],
    });
}

export async function updateUserRole(id: string, role: string, orgId: string) {
    await turso.execute({
        sql: 'UPDATE users SET role = ? WHERE id = ? AND org_id = ?',
        args: [role, id, orgId],
    });
}

export async function deleteUser(id: string, orgId: string) {
    await turso.execute({
        sql: 'DELETE FROM users WHERE id = ? AND org_id = ?',
        args: [id, orgId],
    });
}

// Settings operations
export async function getSettings(orgId: string) {
    const result = await turso.execute({
        sql: 'SELECT * FROM settings WHERE org_id = ?',
        args: [orgId],
    });

    const defaults = {
        emailSearchTerm: 'TheGutGuru',
        syncLookbackDays: 30,
        emailUser: '',
        emailPassword: '',
    };

    if (result.rows.length === 0) return defaults;

    const row = result.rows[0];
    return {
        emailSearchTerm: (row.email_search_term as string) || defaults.emailSearchTerm,
        syncLookbackDays: (row.sync_lookback_days as number) || defaults.syncLookbackDays,
        emailUser: (row.email_user as string) || defaults.emailUser,
        emailPassword: (row.email_password as string) || defaults.emailPassword,
    };
}

export async function saveSettings(orgId: string, settings: {
    emailSearchTerm?: string;
    syncLookbackDays?: number;
    emailUser?: string;
    emailPassword?: string;
}) {
    await turso.execute({
        sql: `INSERT OR REPLACE INTO settings 
              (org_id, email_search_term, sync_lookback_days, email_user, email_password, updated_at)
              VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [
            orgId,
            settings.emailSearchTerm || 'TheGutGuru',
            settings.syncLookbackDays || 30,
            settings.emailUser || '',
            settings.emailPassword || '',
        ],
    });
}

// Seed default admin user if not exists
export async function seedDefaultAdmin(orgId: string, hashedPassword: string) {
    const existingAdmin = await getUserByEmail('admin@thegutguru.com');
    if (!existingAdmin) {
        await createUser({
            id: 'admin-default',
            email: 'admin@thegutguru.com',
            password: hashedPassword,
            name: 'Admin',
            role: 'admin',
            orgId,
        });
        console.log('[Turso] Default admin user created');
    }
}
