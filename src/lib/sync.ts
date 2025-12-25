import imap from 'imap-simple';
import { getInvoices, createInvoice, getSettings } from '@/lib/turso';
import { Invoice } from '@/types';
import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParser = require('pdf2json');

export async function performSync(organizationId: string, options: {
    forceFullSync?: boolean,
    signal?: AbortSignal
} = {}) {
    const settings = await getSettings(organizationId);

    // Determine credential source: User Settings OR Environment Fallback
    const emailUser = settings.emailUser || process.env.EMAIL_USER;
    const emailPass = settings.emailPassword || process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPass) {
        throw new Error('Missing email credentials.');
    }

    const config = {
        imap: {
            user: emailUser,
            password: emailPass,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false },
        },
    };

    if (!config.imap.user || !config.imap.password || config.imap.user.startsWith('your-email')) {
        throw new Error('Email credentials not set properly.');
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    let connection: any;
    try {
        connection = await imap.connect(config);
        if (options.signal?.aborted) throw new Error('Aborted');

        try {
            await connection.openBox('Invoices');
            console.log(`[Sync:${organizationId}] Opened 'Invoices' mailbox`);
        } catch (e) {
            console.log(`[Sync:${organizationId}] 'Invoices' mailbox not found, falling back to INBOX`);
            await connection.openBox('INBOX');
        }

        const searchTerm = settings.emailSearchTerm;
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - (options.forceFullSync ? 3650 : settings.syncLookbackDays));

        const existingInvoices = await getInvoices(organizationId);
        const existingIds = new Set(existingInvoices.map(inv => inv.id));

        let searchCriteria = [
            ['TEXT', searchTerm],
            ['SINCE', lookbackDate]
        ];

        if (existingInvoices.length === 0) {
            console.log(`[Sync:${organizationId}] First run detected. Fetching ALL matching emails...`);
            searchCriteria = [['TEXT', searchTerm]];
        }

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            struct: true,
            markSeen: false,
        };

        console.log(`[Sync:${organizationId}] Searching emails...`);
        const messages = await connection.search(searchCriteria, fetchOptions);
        if (options.signal?.aborted) throw new Error('Aborted');
        console.log(`[Sync:${organizationId}] Found ${messages.length} messages.`);

        const addedInvoices: Invoice[] = [];

        for (const message of messages) {
            if (options.signal?.aborted) {
                console.log(`[Sync:${organizationId}] Sync aborted`);
                break;
            }
            if (!message.attributes || !message.attributes.struct) continue;

            const parts = imap.getParts(message.attributes.struct!);
            const attachments = parts.filter(
                (part) =>
                    part.disposition &&
                    part.disposition.type.toUpperCase() === 'ATTACHMENT'
            );

            for (const attachment of attachments) {
                if (options.signal?.aborted) break;

                const fileName = attachment.params?.name || '';

                if (fileName.includes("commission_invoice")) continue;
                if (!fileName.toLowerCase().endsWith('.pdf')) continue;

                if (options.signal?.aborted) break;
                const partData = await connection.getPartData(message, attachment);

                if (options.signal?.aborted) break;
                let text = '';
                try {
                    text = await new Promise((resolve, reject) => {
                        const pdfParser = new PDFParser(null, 1);
                        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                        pdfParser.on("pdfParser_dataReady", () => {
                            resolve(pdfParser.getRawTextContent());
                        });
                        pdfParser.parseBuffer(partData);
                    });
                } catch (err) {
                    console.error(`Failed to parse PDF ${fileName}:`, err);
                    continue;
                }

                // Parsing Logic
                const amountMatch = text.match(/Net Payable Amount[\s:]*([\\d,]+\.?\d*)/i);
                const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

                const dateMatch = text.match(/Raised On\s*:\s*(\d{4}-\d{2}-\d{2})/i);
                const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

                const vendorLocationMatch = text.match(/Payment Advice Raised To\s*\n\s*([^\n]+)\n\s*([^\n]+)/i);
                let stall = 'Unknown Stall';
                let rawLocation = '';

                if (vendorLocationMatch) {
                    stall = vendorLocationMatch[1].trim();
                    rawLocation = vendorLocationMatch[2].trim();
                } else {
                    const altLocation = text.match(/(?:Location|Site|Cafeteria)[\s:]*([^\n]+)/i);
                    if (altLocation) rawLocation = altLocation[1].trim();
                }

                const annexureMatch = text.match(/(\d{4}-\d{2}-\d{2})\s+\w+\s+(Live\s*Counter|Tuck\s*Shop|Tuckshop)\s+(.+?)(?=\s+\d+(\.\\d+)?\s+\d)/i);
                if (annexureMatch) {
                    const vendorName = annexureMatch[2].replace(/\s+/g, ' ').trim();
                    const fullLoc = annexureMatch[3].trim();
                    const words = fullLoc.split(/\s+/);
                    let shortLoc = fullLoc;
                    if (words.length >= 3) shortLoc = `${words[0]} ${words[1]} ${words[2]}`;
                    else if (words.length >= 2) shortLoc = `${words[0]} ${words[1]}`;

                    stall = `${vendorName} ${shortLoc}`;
                    rawLocation = shortLoc;
                }

                const dateRangeMatch = text.match(/For the Date Range\s*:?[\s]*(\d{4}-\d{2}-\d{2})[\s\S]*?to[\s\S]*?(\d{4}-\d{2}-\d{2})/i);
                let serviceDateRange = '';
                if (dateRangeMatch) {
                    serviceDateRange = `${dateRangeMatch[1]} to ${dateRangeMatch[2]}`;
                }

                if (stall && rawLocation) {
                    const cleanLoc = rawLocation.replace(/[,\.]/g, ' ').trim();
                    const words = cleanLoc.split(/\s+/).filter(w => w.length > 0);
                    let shortLoc = '';
                    if (words.length >= 3) shortLoc = `${words[0]} ${words[1]} ${words[2]}`;
                    else if (words.length >= 2) shortLoc = `${words[0]} ${words[1]}`;
                    else if (words.length === 1) shortLoc = words[0];

                    if (shortLoc && !stall.toLowerCase().includes(shortLoc.toLowerCase())) {
                        stall = `${stall} ${shortLoc}`;
                    }
                }

                let location = 'Other';
                const combinedString = (fileName + ' ' + rawLocation).toUpperCase();
                if (combinedString.includes('BROADRIDGE')) location = 'Broadridge';
                else if (combinedString.includes('CGI')) location = 'CGI Information Systems';
                else if (combinedString.includes('IBM')) location = 'IBM';
                else if (combinedString.includes('DSM')) location = 'DSM Shared Services';
                else location = rawLocation || 'Other';

                if (amount > 0) {
                    const uniqueId = `INV-${fileName.split('.')[0]}-${amount}`;

                    // Skip if already exists
                    if (existingIds.has(uniqueId)) {
                        continue;
                    }

                    // Try to save PDF (may fail on serverless environments like Vercel)
                    let pdfPath: string | null = null;
                    try {
                        // Use /tmp on serverless, public/documents on local
                        const isServerless = process.env.VERCEL === '1' || !process.cwd().includes('hungerbox');
                        const uploadDir = isServerless
                            ? '/tmp/documents'
                            : path.join(process.cwd(), 'public', 'documents');

                        if (!fs.existsSync(uploadDir)) {
                            fs.mkdirSync(uploadDir, { recursive: true });
                        }

                        const filePath = path.join(uploadDir, `${uniqueId}.pdf`);
                        fs.writeFileSync(filePath, partData);
                        pdfPath = isServerless ? null : `/documents/${uniqueId}.pdf`;
                        console.log(`[Sync] PDF saved: ${filePath}`);
                    } catch (err) {
                        console.warn('[Sync] Could not save PDF (expected on serverless):', err);
                        // Continue without PDF - invoice data is still valuable
                    }

                    // Save to Turso database
                    await createInvoice({
                        id: uniqueId,
                        date,
                        serviceDateRange,
                        location,
                        stall,
                        amount,
                        status: 'Processed',
                        pdfPath: pdfPath || undefined,
                        syncedAt: new Date().toISOString(),
                        orgId: organizationId,
                    });

                    addedInvoices.push({
                        id: uniqueId,
                        date,
                        location,
                        stall,
                        amount,
                        status: 'Processed',
                        serviceDateRange,
                        pdfUrl: `/documents/${uniqueId}.pdf`
                    });

                    existingIds.add(uniqueId);
                }
            }
        }

        if (connection) connection.end();

        return {
            success: true,
            count: addedInvoices.length,
            data: addedInvoices,
            message: addedInvoices.length > 0
                ? `Successfully synced ${addedInvoices.length} new invoices`
                : 'No new unique invoices found'
        };

    } catch (error: any) {
        if (connection) connection.end();
        console.error(`[Sync:${organizationId}] Failed:`, error);
        throw error;
    }
}
