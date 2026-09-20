import { defineConfig } from 'drizzle-kit';
export default defineConfig({schema:'./db/schema.ts',out:'./db/migrations',dialect:'postgresql',dbCredentials:{url:process.env.DATABASE_URL || 'postgresql://swasthyaflow:local-only@localhost:5432/swasthyaflow'}});
