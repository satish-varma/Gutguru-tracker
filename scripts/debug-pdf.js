const imap = require('imap-simple');
require('dotenv').config({ path: '.env.local' });
const PDFParser = require('pdf2json');

async function debugAttachment() {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;

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

    try {
        const connection = await imap.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [['TEXT', 'Hungerbox']];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            struct: true,
            markSeen: false,
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`Found ${messages.length} messages.`);

        if (messages.length === 0) return;

        // Pick one of the latest messages
        const message = messages[messages.length - 1];
        console.log('Processing latest message...');

        const parts = imap.getParts(message.attributes.struct);
        console.log(`Total parts in message: ${parts.length}`);

        for (const part of parts) {
            console.log(`Part: ${part.partID}, Type: ${part.type}, Subtype: ${part.subtype}, Disposition: ${part.disposition ? part.disposition.type : 'NONE'}, Filename: ${part.params ? (part.params.name || 'NONE') : 'NONE'}`);
        }

        const pdfParts = parts.filter(p =>
            p.params && p.params.name && p.params.name.toLowerCase().endsWith('.pdf')
        );

        console.log(`Found ${pdfParts.length} PDF parts.`);

        if (pdfParts.length > 0) {
            const part = pdfParts[0];
            const partData = await connection.getPartData(message, part);
            console.log(`Downloaded ${partData.length} bytes for ${part.params.name}`);

            const pdfParser = new PDFParser(null, 1);
            pdfParser.on("pdfParser_dataError", (errData) => console.error(errData.parserError));
            pdfParser.on("pdfParser_dataReady", () => {
                const text = pdfParser.getRawTextContent();
                console.log('\n--- PDF TEXT START (First 5000 chars) ---');
                console.log(text.substring(0, 5000));
                console.log('--- PDF TEXT END ---\n');

                // Test our existing regex
                const amountMatch = text.match(/Net\s+Payable\s+Amount[\s:]*([0-9,]+\.?\d*)/i);
                console.log('Amount Match:', amountMatch ? amountMatch[1] : 'NOT FOUND');

                if (!amountMatch) {
                    console.log('Searching for "Payable" in surroundings...');
                    const lines = text.split('\n');
                    lines.forEach((line, i) => {
                        if (line.includes('Payable')) {
                            console.log(`Line ${i}: ${line}`);
                            console.log(`Line ${i + 1}: ${lines[i + 1] || ''}`);
                        }
                    });
                }

                const dateMatch = text.match(/Raised On\s*:\s*(\d{4}-\d{2}-\d{2})/i);
                console.log('Date Match:', dateMatch ? dateMatch[1] : 'NOT FOUND');

                const dateRangeMatch = text.match(/For the Date Range\s*:?[\s]*(\d{4}-\d{2}-\d{2})[\s\S]*?to[\s\S]*?(\d{4}-\d{2}-\d{2})/i);
                console.log('Date Range Match:', dateRangeMatch ? `${dateRangeMatch[1]} to ${dateRangeMatch[2]}` : 'NOT FOUND');

                connection.end();
            });
            pdfParser.parseBuffer(partData);
        } else {
            console.log('No PDF attachment found in the message.');
            connection.end();
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

debugAttachment();
