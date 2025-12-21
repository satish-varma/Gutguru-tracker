
import { NextResponse } from 'next/server';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';
const pdf = require('pdf-parse');

// Type definitions ensuring type safety
interface Invoice {
  id: string;
  date: string;
  location: string;
  stall: string;
  amount: number;
  status: 'Processed' | 'Pending';
}

export async function POST() {
  const config = {
    imap: {
      user: process.env.EMAIL_USER as string,
      password: process.env.EMAIL_PASSWORD as string,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      authTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false }, // Sometimes needed for local dev/certain networks
    },
  };

  if (!config.imap.user || !config.imap.password) {
    return NextResponse.json(
      { success: false, error: 'Email credentials not configured in .env.local' },
      { status: 500 }
    );
  }

  try {
    const connection = await imap.connect(config);
    await connection.openBox('INBOX');

    // Search for emails from Hungerbox with attachments
    // Note: adjusting search criteria to be broader effectively calls for 'ALL' 
    // but in production, we should filter by specific sender e.g., [['FROM', 'reports@hungerbox.com'], ['UNSEEN']]
    const searchCriteria = [['TEXT', 'HungerBox']];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      struct: true,
      markSeen: false,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const newInvoices: Invoice[] = [];

    // Process only the last 5 messages to avoid timeout during dev
    const recentMessages = messages.slice(-5);

    for (const message of recentMessages) {
      const parts = imap.getParts(message.attributes.struct!);

      // Look for PDF attachments
      const attachments = parts.filter(
        (part) =>
          part.disposition &&
          part.disposition.type.toUpperCase() === 'ATTACHMENT' &&
          part.subtype.toUpperCase() === 'PDF'
      );

      for (const attachment of attachments) {
        const partData = await connection.getPartData(message, attachment);

        // Parse PDF content
        const pdfData = await pdf(partData);
        const text = pdfData.text;

        // --- Heuristic Parsing Logic ---
        // This regex logic is a BEST GUESS based on common invoice formats.
        // We will need to refine this based on the user's actual PDF structure.

        // 1. Try to find Total Amount (looking for "Net Payable" or "Total" followed by numbers)
        const amountMatch = text.match(/(?:Net Payable|Total Amount|Invoice Amount)[\s:]*₹?[\s]*([\d,]+\.?\d*)/i);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

        // 2. Try to find Location (looking for keywords)
        const locationMatch = text.match(/(?:Location|Site|Cafeteria)[\s:]*([^\n]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : 'Unknown Location';

        // 3. Try to find Stall Name (looking for keywords)
        const stallMatch = text.match(/(?:Stall|Vendor|Outlet)[\s:]*([^\n]+)/i);
        const stall = stallMatch ? stallMatch[1].trim() : 'Unknown Stall';

        // 4. Date extraction
        const dateMatch = text.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
        const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

        if (amount > 0) {
          newInvoices.push({
            id: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: date,
            location: location,
            stall: stall,
            amount: amount,
            status: 'Processed'
          });
        }
      }
    }

    connection.end();

    return NextResponse.json({
      success: true,
      count: newInvoices.length,
      data: newInvoices,
      message: newInvoices.length > 0 ? 'Successfully synced invoices' : 'No new valid invoices found'
    });

  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync emails' },
      { status: 500 }
    );
  }
}
