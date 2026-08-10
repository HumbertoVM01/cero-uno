import { db } from './_shared/db.mjs';
export default async () => {
  const sql = db();
  await sql`select refresh_allive_windows()`;
  return new Response('ok');
};
