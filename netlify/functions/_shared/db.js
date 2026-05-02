const { neon } = require('@neondatabase/serverless');

let sql;
function getConnectionString() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
}

function getSql() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    const err = new Error('DATABASE_URL o NEON_DATABASE_URL no está configurada en Netlify.');
    err.code = 'NO_DATABASE_URL';
    throw err;
  }
  if (!sql) sql = neon(connectionString);
  return sql;
}

module.exports = { getSql };
