import {it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import {migrate} from 'drizzle-orm/pglite/migrator';
it('keeps application tables inaccessible through Supabase browser roles',async()=>{
 const client=new PGlite();
 try{
  await client.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await migrate(drizzle(client),{migrationsFolder:'db/migrations'});
  await client.exec("INSERT INTO facilities(id,name,type,location) VALUES('TEST','Test','Test','Test');");
  const tables=await client.query<{tablename:string;rowsecurity:boolean}>("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'");
  expect(tables.rows).toHaveLength(16);expect(tables.rows.every(row=>row.rowsecurity)).toBe(true);
  await client.exec('SET ROLE anon');
  await expect(client.query('SELECT * FROM facilities')).rejects.toThrow('permission denied');
  await client.exec('RESET ROLE; GRANT SELECT ON facilities TO authenticated; SET ROLE authenticated;');
  expect((await client.query('SELECT * FROM facilities')).rows).toEqual([]);
  await client.exec('RESET ROLE');expect((await client.query('SELECT * FROM facilities')).rows).toHaveLength(1);
 }finally{await client.close();}
},30000);
