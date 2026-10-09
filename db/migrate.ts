import { PGlite } from '@electric-sql/pglite';
import { migrate as pgliteMigrate } from 'drizzle-orm/pglite/migrator';
import { migrate as pgMigrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { mkdir } from 'node:fs/promises';
import {postgresPoolConfig} from '../lib/db/postgres-config';

async function main() {
  if (process.env.DATABASE_URL) {
    const pool = new Pool(postgresPoolConfig(process.env,true));
    try{await pgMigrate(pgDrizzle(pool),{migrationsFolder:'db/migrations'});}finally{await pool.end();}
  } else {
    if(process.env.VERCEL==='1'||['demo','production'].includes(process.env.DEPLOYMENT_MODE??''))throw new Error('HOSTED_DATABASE_REQUIRED');
    await mkdir('.data',{recursive:true});
    const client = new PGlite(process.env.PGLITE_DATA_DIR||'.data/swasthyaflow');
    await pgliteMigrate(pgliteDrizzle(client),{migrationsFolder:'db/migrations'});
    await client.close();
  }
  console.log('Migrations complete');
}
main().catch(()=>{console.error('Database migration failed. Check connection, verified TLS certificate, database permissions and migration history.'); process.exitCode=1;});
