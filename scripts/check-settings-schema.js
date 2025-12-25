const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkSchema() {
    try {
        const result = await turso.execute("PRAGMA table_info(settings)");
        console.log("Settings table columns:");
        result.rows.forEach(row => {
            console.log(`- ${row.name} (${row.type})`);
        });

        const settingsResult = await turso.execute("SELECT * FROM settings LIMIT 1");
        console.log("\nSample settings row:");
        console.log(JSON.stringify(settingsResult.rows[0], null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkSchema();
