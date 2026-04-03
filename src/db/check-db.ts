import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

async function checkDb() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to Database');
    
    // Check for existing enums
    const enumsRes = await client.query(`
      SELECT n.nspname as schema, t.typname as name
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE (t.typtype = 'e')
    `);
    console.log('Existing Enums:', enumsRes.rows.map(r => r.name));
    
    // Check for existing tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Existing Tables:', tablesRes.rows.map(r => r.table_name));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkDb();
