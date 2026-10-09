import type {Pool} from 'pg';
import {readMigrationFiles} from 'drizzle-orm/migrator';

// The hosted migration schema is provisioned once by its administrator.
// Checking it first avoids requiring database-wide CREATE for normal migrations.
export async function migratePostgres(pool:Pick<Pool,'connect'>,folder='db/migrations'){
 const migrations=readMigrationFiles({migrationsFolder:folder});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(721903114)');
  const schema=await client.query("SELECT to_regnamespace('drizzle') AS namespace");
  if(!schema.rows[0]?.namespace)await client.query('CREATE SCHEMA drizzle');
  const table=await client.query("SELECT to_regclass('drizzle.__drizzle_migrations') AS relation");
  if(!table.rows[0]?.relation)await client.query('CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)');
  const history=await client.query<{hash:string;created_at:string}>('SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at');
  const applied=new Map(history.rows.map(row=>[Number(row.created_at),row.hash]));
  const latest=Math.max(0,...applied.keys());
  for(const migration of migrations){
   const hash=applied.get(migration.folderMillis);
   if(hash){if(hash!==migration.hash)throw new Error('MIGRATION_HISTORY_MISMATCH');continue;}
   if(migration.folderMillis<=latest)throw new Error('MIGRATION_HISTORY_GAP');
   for(const statement of migration.sql)if(statement.trim())await client.query(statement);
   await client.query('INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES ($1,$2)',[migration.hash,migration.folderMillis]);
  }
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
