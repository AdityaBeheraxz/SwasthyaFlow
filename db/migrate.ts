import { PGlite } from '@electric-sql/pglite';
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator';
import { migrate as pgMigrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { mkdir } from 'node:fs/promises';

async function main() {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({connectionString:process.env.DATABASE_URL});
    await pgMigrate(pgDrizzle(pool),{migrationsFolder:'db/migrations'});
    await pool.end();
  } else {
    await mkdir('.data',{recursive:true});
    const client = new PGlite(process.env.PGLITE_DATA_DIR||'.data/swasthyaflow');
    await pgliteMigrate(pgliteDrizzle(client),{migrationsFolder:'db/migrations'});
    await client.close();
  }
  console.log('Migrations complete');
}
main().catch((error:unknown)=>{console.error(error); process.exitCode=1;});
