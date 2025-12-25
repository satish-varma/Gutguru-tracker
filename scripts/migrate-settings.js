const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
    try {
        console.log("Checking if sync_interval_hours exists...");
        const tableInfo = await turso.execute("PRAGMA table_info(settings)");
        const hasColumn = tableInfo.rows.some(row => row.name === 'sync_interval_hours');

        if (!hasColumn) {
            console.log("Adding sync_interval_hours column...");
            await turso.execute("ALTER TABLE settings ADD COLUMN sync_interval_hours INTEGER DEFAULT 6");
            console.log("Column added successfully.");
        } else {
            console.log("Column already exists.");
        }
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

migrate();
