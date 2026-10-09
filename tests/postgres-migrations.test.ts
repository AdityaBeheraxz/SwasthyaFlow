import {it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import type {Pool} from 'pg';
import {migratePostgres} from '../db/migrate-postgres';
function poolFor(client:PGlite){return {connect:async()=>({query:(sql:string,values?:unknown[])=>client.query(sql,values),release:()=>{}})} as unknown as Pick<Pool,'connect'>;}
it('migrates with a pre-created schema and a database login that cannot create schemas',async()=>{
 const client=new PGlite();
 try{
  await client.exec('CREATE ROLE restricted_migrator; CREATE SCHEMA drizzle AUTHORIZATION restricted_migrator; GRANT USAGE, CREATE ON SCHEMA public TO restricted_migrator; SET ROLE restricted_migrator;');
  await expect(client.query('CREATE SCHEMA forbidden_schema')).rejects.toThrow('permission denied');
  await migratePostgres(poolFor(client));
  expect((await client.query<{count:number}>('SELECT count(*)::integer AS count FROM drizzle.__drizzle_migrations')).rows[0].count).toBe(12);
  await migratePostgres(poolFor(client));
  expect((await client.query<{count:number}>('SELECT count(*)::integer AS count FROM drizzle.__drizzle_migrations')).rows[0].count).toBe(12);
  await client.exec("UPDATE drizzle.__drizzle_migrations SET hash='changed' WHERE created_at=1790000000011");
  await expect(migratePostgres(poolFor(client))).rejects.toThrow('MIGRATION_HISTORY_MISMATCH');
  expect((await client.query<{count:number}>("SELECT count(*)::integer AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count).toBe(16);
 }finally{await client.close();}
},30000);
