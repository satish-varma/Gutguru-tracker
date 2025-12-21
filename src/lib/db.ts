
import fs from 'fs/promises';
import path from 'path';
import { Invoice } from '@/types';

// Helper to get user-specific path
function getUserDbPath(userId: string) {
    if (!userId) throw new Error("User ID is required for database access");
    return path.join(process.cwd(), 'data', userId, 'invoices.json');
}

export async function getInvoices(userId: string): Promise<Invoice[]> {
    try {
        const data = await fs.readFile(getUserDbPath(userId), 'utf-8');
        return JSON.parse(data);
    } catch (_error) {
        return [];
    }
}

export async function saveInvoices(userId: string, invoices: Invoice[]): Promise<void> {
    await fs.writeFile(getUserDbPath(userId), JSON.stringify(invoices, null, 2));
}

export async function addInvoices(userId: string, newInvoices: Invoice[]): Promise<Invoice[]> {
    const currentInvoices = await getInvoices(userId);

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
        await saveInvoices(userId, currentInvoices);
    }

    return added;
}

