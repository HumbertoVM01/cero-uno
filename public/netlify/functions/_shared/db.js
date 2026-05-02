const { neon } = require('@neondatabase/serverless');

let sql;
function getSql() {
  if (!process.env.DATABASE_URL) {
    const err = new Error('DATABASE_URL is not configured. Add it in Netlify environment variables.');
    err.code = 'NO_DATABASE_URL';
    throw err;
  }
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}

module.exports = { getSql };
