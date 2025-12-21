import { NextResponse } from 'next/server';
import imap from 'imap-simple';
import { addInvoices, getInvoices } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { Invoice } from '@/types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse-new');

export async function GET() {
  const invoices = await getInvoices();
  return NextResponse.json({ success: true, data: invoices });
}

export async function POST(request: Request) {
  const config = {
    imap: {
      user: process.env.EMAIL_USER as string,
      password: process.env.EMAIL_PASSWORD as string,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      authTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false },
    },
  };

  if (!config.imap.user || !config.imap.password || config.imap.user.startsWith('your-email')) {
    return NextResponse.json(
      { success: false, error: 'Email credentials not set properly. Please check .env.local' },
      { status: 500 }
    );
  }

  try {
    const connection = await imap.connect(config);

    // Attempt to open 'Invoices' label (folder) directly, fallback to INBOX if not found
    try {
      await connection.openBox('Invoices');
      console.log("Opened 'Invoices' mailbox");
    } catch (e) {
      console.log("'Invoices' mailbox not found via IMAP, falling back to INBOX with label search");
      await connection.openBox('INBOX');
    }

    // --- Improved Search Strategy ---
    const settings = await getSettings();
    const searchTerm = settings.emailSearchTerm;

    // Check for explicit "full=true" query param to force full sync
    const { searchParams } = new URL(request.url);
    const forceFullSync = searchParams.get('full') === 'true';

    // Calculate lookback date based on settings
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - (forceFullSync ? 3650 : settings.syncLookbackDays));

    const existingCount = (await getInvoices()).length;

    let searchCriteria = [
      ['TEXT', searchTerm],
      ['SINCE', lookbackDate.toISOString()]
    ];

    if (existingCount === 0) {
      console.log('First run detected. Fetching ALL matching emails...');
      // Remove date filter
      searchCriteria = [['TEXT', searchTerm]];
    }


    // We already have 'searchCriteria' defined above.

    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      struct: true,
      markSeen: false,
    };

    console.log(`Searching emails...`);
    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Found ${messages.length} messages.`);
    const potentialInvoices: Invoice[] = [];

    // Process ALL found messages (User requested full history scan)
    const recentMessages = messages;

    for (const message of recentMessages) {
      if (!message.attributes || !message.attributes.struct) continue;

      const parts = imap.getParts(message.attributes.struct!);
      const attachments = parts.filter(
        (part) =>
          part.disposition &&
          part.disposition.type.toUpperCase() === 'ATTACHMENT'
      );

      for (const attachment of attachments) {
        const fileName = attachment.params?.name || '';
        console.log(`Found attachment: ${fileName}`);

        // --- Exclude Logic ---
        if (
          fileName.includes("commission_invoice")
        ) {
          console.log(`Skipping excluded file: ${fileName}`);
          continue;
        }

        // Verify PDF extension
        if (!fileName.toLowerCase().endsWith('.pdf')) {
          continue;
        }

        const partData = await connection.getPartData(message, attachment);
        let text = '';
        try {
          const pdfData = await pdf(partData);
          text = pdfData.text;
        } catch (err) {
          console.error(`Failed to parse PDF ${fileName}:`, err);
          continue;
        }

        // --- PRECISE Parsing Logic based on User Invoice Sample ---

        // 1. Amount: "Net Payable Amount 219"
        const amountMatch = text.match(/Net Payable Amount[\s:]*([\d,]+\.?\d*)/i);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

        // 2. Date: "Raised On :2025-10-24"
        const dateMatch = text.match(/Raised On\s*:\s*(\d{4}-\d{2}-\d{2})/i);
        const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];


        // 3. Location & Stall
        // Pattern:
        // Payment Advice Raised To
        // Live Counter                  <-- Stall
        // Orion B5-4th Floor Pantry, IBM <-- Location
        const vendorLocationMatch = text.match(/Payment Advice Raised To\s*\n\s*([^\n]+)\n\s*([^\n]+)/i);

        let stall = 'Unknown Stall';
        let rawLocation = '';

        if (vendorLocationMatch) {
          stall = vendorLocationMatch[1].trim();
          rawLocation = vendorLocationMatch[2].trim();
        } else {
          // Fallback
          const altLocation = text.match(/(?:Location|Site|Cafeteria)[\s:]*([^\n]+)/i);
          if (altLocation) rawLocation = altLocation[1].trim();
        }

        // --- Annexure Logic for Live Counter / Tuck Shop ---
        // Reference: "2025-10-30 IBM Live Counter Mindspace 13th floor Cafeteria 0 16010.9 16010.9"
        // We look for Date -> Company -> Vendor -> Location -> Numbers
        // Regex Lookahead adjusted to ensure we don't stop at "13th" (alphanumeric) but stop at pure numbers (Financials)
        // Look for: space + number + space + number (identifies the start of the value columns: Mrp Value, Non Mrp Value)
        const annexureMatch = text.match(/(\d{4}-\d{2}-\d{2})\s+\w+\s+(Live\s*Counter|Tuck\s*Shop|Tuckshop)\s+(.+?)(?=\s+\d+(\.\d+)?\s+\d)/i);

        if (annexureMatch) {
          const vendorName = annexureMatch[2].replace(/\s+/g, ' ').trim();

          // "Location Name (first two words of the entire name)"
          const fullLoc = annexureMatch[3].trim();
          const words = fullLoc.split(/\s+/);
          let shortLoc = fullLoc;
          if (words.length >= 2) {
            shortLoc = `${words[0]} ${words[1]}`;
          }

          // Stall Name = Vendor Name + Short Location
          stall = `${vendorName} ${shortLoc}`;
          rawLocation = shortLoc;

          console.log(`Annexure Override: ${stall} @ ${rawLocation}`);
        }


        // 4. Service Date Range
        const dateRangeMatch = text.match(/For the Date Range\s*:?[\s]*(\d{4}-\d{2}-\d{2})[\s\S]*?to[\s\S]*?(\d{4}-\d{2}-\d{2})/i);
        let serviceDateRange = '';
        if (dateRangeMatch) {
          serviceDateRange = `${dateRangeMatch[1]} to ${dateRangeMatch[2]}`;
        }

        // --- Standardize Stall Name (Universal Rule) ---
        // Require Stall Name = Vendor Name + Short Location (First 2 words)
        if (stall && rawLocation) {
          const cleanLoc = rawLocation.replace(/[,\.]/g, ' ').trim();
          const words = cleanLoc.split(/\s+/).filter(w => w.length > 0);

          let shortLoc = '';
          if (words.length >= 2) {
            shortLoc = `${words[0]} ${words[1]}`;
          } else if (words.length === 1) {
            shortLoc = words[0];
          }

          // Append if not already present
          if (shortLoc && !stall.toLowerCase().includes(shortLoc.toLowerCase())) {
            stall = `${stall} ${shortLoc}`;
          }
        }

        // --- Location Normalization (Segregation) ---
        let location = 'Other';
        const combinedString = (fileName + ' ' + rawLocation).toUpperCase();

        if (combinedString.includes('BROADRIDGE')) {
          location = 'Broadridge';
        } else if (combinedString.includes('CGI')) {
          location = 'CGI Information Systems';
        } else if (combinedString.includes('IBM')) {
          location = 'IBM';
        } else if (combinedString.includes('DSM')) {
          location = 'DSM Shared Services';
        } else {
          location = rawLocation || 'Other';
        }

        console.log(`Parsed Success: ${stall} @ ${location} | Date: ${date} | Amount: ${amount}`);

        if (amount > 0) {
          const uniqueId = `INV-${fileName.split('.')[0]}-${amount}`;

          potentialInvoices.push({
            id: uniqueId,
            date: date,
            location: location,
            stall: stall,
            amount: amount,
            status: 'Processed',
            serviceDateRange: serviceDateRange
          });
        }
      }
    }

    connection.end();

    // Deduplicate and save
    const addedInvoices = await addInvoices(potentialInvoices);

    return NextResponse.json({
      success: true,
      count: addedInvoices.length,
      data: addedInvoices,
      message: addedInvoices.length > 0
        ? `Successfully synced ${addedInvoices.length} new invoices`
        : 'No new unique invoices found'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync failed:', error);
    return NextResponse.json(
      { success: false, error: errorMessage || 'Failed to sync emails' },
      { status: 500 }
    );
  }
}
