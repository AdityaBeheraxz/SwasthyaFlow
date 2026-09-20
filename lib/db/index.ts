import { PGlite } from '@electric-sql/pglite';
import { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';

type Database = ReturnType<typeof pgliteDrizzle<typeof schema>>;
const globalStore=globalThis as typeof globalThis & {swasthyaDb?:Promise<Database>};
export function db(): Promise<Database> {
  globalStore.swasthyaDb ??= (async () => {
    if (process.env.DATABASE_URL) return pgDrizzle(new Pool({ connectionString:process.env.DATABASE_URL }), {schema}) as unknown as Database;
    const client = new PGlite('.data/swasthyaflow');
    await client.waitReady;
    return pgliteDrizzle(client,{schema});
  })();
  return globalStore.swasthyaDb;
}
