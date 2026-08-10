import { neon } from '@neondatabase/serverless';
let sql;
export function db() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw Object.assign(new Error('DATABASE_URL no está configurada.'), { code: 'NO_DATABASE_URL' });
  if (!sql) sql = neon(url);
  return sql;
}
