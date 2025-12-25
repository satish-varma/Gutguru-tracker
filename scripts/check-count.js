const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkCount() {
    const result = await turso.execute('SELECT COUNT(*) as count FROM invoices');
    console.log(`Total Invoices in Cloud DB: ${result.rows[0].count}`);
}

checkCount();
