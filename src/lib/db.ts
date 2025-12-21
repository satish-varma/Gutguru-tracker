
import fs from 'fs/promises';
import path from 'path';
import { Invoice } from '@/types';

// Helper to get organization-specific path
function getOrgDbPath(orgId: string) {
    if (!orgId) throw new Error("Organization ID is required for database access");
    return path.join(process.cwd(), 'data', orgId, 'invoices.json');
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

