export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { initializeDatabase, seedDefaultAdmin } = await import('@/lib/turso');
        const bcrypt = await import('bcryptjs');

        // Initialize database tables on startup
        console.log('[Startup] Initializing Turso database...');
        try {
            await initializeDatabase();

            // Seed default admin user
            const defaultPassword = bcrypt.hashSync('admin123', 10);
            await seedDefaultAdmin('default', defaultPassword);

            console.log('[Startup] Database ready!');
        } catch (error) {
            console.error('[Startup] Database initialization failed:', error);
        }

        // Auto-sync scheduler
        const { performSync } = await import('@/lib/sync');
        const { turso } = await import('@/lib/turso');

        // 6 hours = 6 * 60 * 60 * 1000 = 21600000
        const INTERVAL = 21600000;

        console.log('[Scheduler] Registering Auto-Sync Task (Every 6h)...');

        const runAutoSync = async () => {
            console.log(`[Scheduler] Running Auto-Sync at ${new Date().toISOString()}...`);
            try {
                // Get unique org IDs from users table
                const result = await turso.execute('SELECT DISTINCT org_id FROM users');
                const orgIds = result.rows.map(row => row.org_id as string).filter(Boolean);

                if (orgIds.length === 0) {
                    console.log('[Scheduler] No organizations found.');
                    return;
                }

                console.log(`[Scheduler] Found ${orgIds.length} organizations to sync.`);

                for (const orgId of orgIds) {
                    try {
                        await performSync(orgId);
                    } catch (e: any) {
                        console.error(`[Scheduler] Failed to sync Org ${orgId}:`, e.message);
                    }
                }
            } catch (err) {
                console.error('[Scheduler] Critical error in job:', err);
            }
        };

        // Schedule it
        setInterval(runAutoSync, INTERVAL);
    }
}
