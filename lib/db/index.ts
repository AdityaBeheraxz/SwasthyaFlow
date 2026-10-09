import type { drizzle as pgliteDrizzle } from 'drizzle-orm/pglite';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';
import {isProductionDeployment} from '@/lib/runtime-config';
import {postgresPoolConfig} from './postgres-config';

type Database = ReturnType<typeof pgliteDrizzle<typeof schema>>;
const globalStore=globalThis as typeof globalThis & {swasthyaDb?:Promise<Database>};
export function db(): Promise<Database> {
  globalStore.swasthyaDb ??= (async () => {
    if (process.env.DATABASE_URL) return pgDrizzle(new Pool(postgresPoolConfig()), {schema}) as unknown as Database;
    if(isProductionDeployment||process.env.VERCEL==='1'||process.env.DEPLOYMENT_MODE==='demo')throw new Error('HOSTED_DATABASE_REQUIRED');
    const [{PGlite},{drizzle:pgliteDrizzle}]=await Promise.all([import('@electric-sql/pglite'),import('drizzle-orm/pglite')]);
    const client = new PGlite(process.env.PGLITE_DATA_DIR||'.data/swasthyaflow');
    await client.waitReady;
    return pgliteDrizzle(client,{schema});
  })();
  return globalStore.swasthyaDb;
}
