
import fs from 'fs/promises';
import path from 'path';
import { Invoice, User } from '@/types';

// Helper to get organization-specific path
function getOrgDbPath(orgId: string) {
    // Currently pointing to the root invoices.json as that's where the data is populated.
    // In a real multi-tenant app, this should be path.join(process.cwd(), 'data', orgId, 'invoices.json');
    return path.join(process.cwd(), 'data', 'invoices.json');
}

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

export async function getUsers(): Promise<User[]> {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function saveUsers(users: User[]): Promise<void> {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function getInvoices(orgId: string): Promise<Invoice[]> {
    try {
        const data = await fs.readFile(getOrgDbPath(orgId), 'utf-8');
        return JSON.parse(data);
    } catch (_error) {
        return [];
    }
}

export async function saveInvoices(orgId: string, invoices: Invoice[]): Promise<void> {
    await fs.writeFile(getOrgDbPath(orgId), JSON.stringify(invoices, null, 2));
}

export async function addInvoices(orgId: string, newInvoices: Invoice[]): Promise<Invoice[]> {
    const currentInvoices = await getInvoices(orgId);

    const uniqueKey = (inv: Invoice) => `${inv.date}-${inv.amount}-${inv.stall}-${inv.location}`;
    const existingKeys = new Set(currentInvoices.map(uniqueKey));

    const added: Invoice[] = [];

    for (const inv of newInvoices) {
        if (!existingKeys.has(uniqueKey(inv))) {
            currentInvoices.push(inv);
            added.push(inv);
            existingKeys.add(uniqueKey(inv));
        }
    }

    if (added.length > 0) {
        await saveInvoices(orgId, currentInvoices);
    }

    return added;
}
