import { PGlite } from '@electric-sql/pglite';
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';
import {isProductionDeployment} from '@/lib/runtime-config';

type Database = ReturnType<typeof pgliteDrizzle<typeof schema>>;
const globalStore=globalThis as typeof globalThis & {swasthyaDb?:Promise<Database>};
export function db(): Promise<Database> {
  globalStore.swasthyaDb ??= (async () => {
    if (process.env.DATABASE_URL) return pgDrizzle(new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL_MODE?{rejectUnauthorized:process.env.DATABASE_SSL_MODE==='verify-full'}:undefined,max:20,idleTimeoutMillis:30_000,connectionTimeoutMillis:5_000,statement_timeout:15_000,query_timeout:20_000}), {schema}) as unknown as Database;
    if(isProductionDeployment)throw new Error('PRODUCTION_DATABASE_REQUIRED');
    const client = new PGlite('.data/swasthyaflow');
    await client.waitReady;
    return pgliteDrizzle(client,{schema});
  })();
  return globalStore.swasthyaDb;
}
