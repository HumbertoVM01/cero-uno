const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required. Copy .env.example and export DATABASE_URL first.');
    process.exit(1);
  }
  const sql = neon(url);
  const schema = fs.readFileSync(path.join(__dirname, '..', 'neon', 'schema.sql'), 'utf8');
  await sql(schema);
  console.log('Cero Uno schema applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
