export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { performSync } = await import('@/lib/sync');
        const { getUsers } = await import('@/lib/db');

        // 6 hours = 6 * 60 * 60 * 1000 = 21600000
        const INTERVAL = 21600000;

        console.log('[Scheduler] Registering Auto-Sync Task (Every 6h)...');

        const runAutoSync = async () => {
            console.log(`[Scheduler] Running Auto-Sync at ${new Date().toISOString()}...`);
            try {
                const users = await getUsers();
                // @ts-ignore
                const orgIds = [...new Set(users.map((u: any) => u.organizationId).filter(Boolean))];

                if (orgIds.length === 0) {
                    console.log('[Scheduler] No organizations found.');
                    return;
                }

                console.log(`[Scheduler] Found ${orgIds.length} organizations to sync.`);

                for (const orgId of orgIds) {
                    try {
                        // @ts-ignore
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

        // Optional: Run immediately on startup? 
        // Better not blocks startup. But maybe after 1 min?
        // setTimeout(runAutoSync, 60000); 
    }
}
