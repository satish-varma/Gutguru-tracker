import fs from 'fs/promises';
import path from 'path';
import { Invoice } from '@/types';

const DB_PATH = path.join(process.cwd(), 'data', 'invoices.json');

export async function getInvoices(): Promise<Invoice[]> {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (_error) {
        // If file doesn't exist or is invalid, return empty array
        return [];
    }
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
    await fs.writeFile(DB_PATH, JSON.stringify(invoices, null, 2));
}

export async function addInvoices(newInvoices: Invoice[]): Promise<Invoice[]> {
    const currentInvoices = await getInvoices();

    // Create a Map for existing invoices to easily check for duplicates 
    // (Assuming we can key by ID - if IDs are random everytime, we need a better unique key)
    // Since we are generating IDs randomly in the current sync logic: 
    //   `id: 'INV-${Date.now()}-${Math.floor(Math.random() * 1000)}'`
    // We can't rely on ID for deduplication if we re-scan the same email.
    // We should construct a unique key from the content: data-amount-stall-location

    const uniqueKey = (inv: Invoice) => `${inv.date}-${inv.amount}-${inv.stall}-${inv.location}`;
    const existingKeys = new Set(currentInvoices.map(uniqueKey));

    const added: Invoice[] = [];

    for (const inv of newInvoices) {
        if (!existingKeys.has(uniqueKey(inv))) {
            currentInvoices.push(inv);
            added.push(inv);
            existingKeys.add(uniqueKey(inv)); // Add to set to prevent duplicates within the new batch too
        }
    }

    if (added.length > 0) {
        await saveInvoices(currentInvoices);
    }

    return added;
}
