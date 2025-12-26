const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkUsers() {
    try {
        const result = await turso.execute("SELECT id, email, role, org_id FROM users");
        console.log("Users in Database:");
        result.rows.forEach(row => {
            console.log(`- ${row.email}: Role=${row.role}, Org=${row.org_id}`);
        });
    } catch (e) {
        console.error(e);
    }
}

checkUsers();
