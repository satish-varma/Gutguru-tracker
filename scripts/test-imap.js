const imap = require('imap-simple');
require('dotenv').config({ path: '.env.local' });

async function testSync() {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPass) {
        console.error('Missing EMAIL_USER or EMAIL_PASSWORD in .env.local');
        return;
    }

    console.log(`Connecting to IMAP for ${emailUser}...`);

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
        console.log('Connected successfully!');

        // Try opening INBOX
        await connection.openBox('INBOX');
        console.log('Opened INBOX');

        const searchTerms = ['Hungerbox', 'hungerbox', 'TheGutGuru'];

        for (const term of searchTerms) {
            console.log(`\nSearching for "${term}"...`);
            const searchCriteria = [['TEXT', term]];
            const fetchOptions = {
                bodies: ['HEADER'],
                markSeen: false,
            };

            const messages = await connection.search(searchCriteria, fetchOptions);
            console.log(`Found ${messages.length} messages for "${term}"`);

            if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                const headerPart = lastMsg.parts.find(p => p.which === 'HEADER');
                const subject = headerPart.body.subject ? headerPart.body.subject[0] : 'No Subject';
                const from = headerPart.body.from ? headerPart.body.from[0] : 'No From';
                console.log(`Sample Message: From: ${from} | Subject: ${subject}`);
            }
        }

        connection.end();
    } catch (err) {
        console.error('Error during test:', err);
    }
}

testSync();
