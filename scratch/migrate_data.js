const { Client } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_G8E7RvYFpusd@ep-billowing-frost-allewygf.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const SUPABASE_URL = 'postgresql://postgres.tcofptrdcayeybrfgitj:jGY6hCcVQ01wqgLl@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function migrate() {
    const neon = new Client({ connectionString: NEON_URL });
    const supabase = new Client({ connectionString: SUPABASE_URL });

    try {
        await neon.connect();
        await supabase.connect();
        console.log('Connected to both databases');

        const tables = [
            'user',
            'city',
            'committee',
            'campaign',
            'campaignmember',
            'cemetery',
            'case', // mapped to Renamedcase in Prisma but table is "case"
            'caseassignment',
            'visit'
        ];

        for (const table of tables) {
            console.log(`Migrating table: ${table}...`);
            
            // Fetch from Neon
            const res = await neon.query(`SELECT * FROM "${table}"`);
            const rows = res.rows;
            console.log(`Found ${rows.length} rows in ${table}`);

            if (rows.length === 0) continue;

            // Clear destination (optional, but safer if we pushed schema fresh)
            // await supabase.query(`DELETE FROM "${table}"`);

            // Prepare Insert
            const columns = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');
            const placeholders = Object.keys(rows[0]).map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

            for (const row of rows) {
                const values = Object.values(row);
                await supabase.query(query, values);
            }
            console.log(`Successfully migrated ${table}`);
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await neon.end();
        await supabase.end();
    }
}

migrate();
