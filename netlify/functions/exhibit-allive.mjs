import { db } from './_shared/db.mjs';
import { json, readJson, fail } from './_shared/http.mjs';
import { POM_IDS, GEM_IDS, SCENT_IDS } from './_shared/catalog.mjs';
import { rowToAllive } from './_shared/rank.mjs';

const pomFields = ['body','top','leftArm','rightArm','leftLeg','rightLeg'];
const gemFields = ['leftEye','rightEye'];

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const body = await readJson(req);
    const subjectName = String(body.subjectName || '').trim();
    const exhibitedBy = String(body.exhibitedBy || '').trim() || null;
    const parts = body.parts || {};
    if (!subjectName || subjectName.length > 80) return json({ error: 'SUBJECT_REQUIRED' }, 400);
    if (exhibitedBy && exhibitedBy.length > 60) return json({ error: 'EXHIBITOR_TOO_LONG' }, 400);
    if (!pomFields.every(k => POM_IDS.has(parts[k])) || !gemFields.every(k => GEM_IDS.has(parts[k])) || !SCENT_IDS.has(body.scentId)) {
      return json({ error: 'INVALID_ALLIVE' }, 400);
    }
    const sql = db();
    const rows = await sql`
      insert into allives(
        subject_name, exhibited_by, body_asset, top_asset, left_arm_asset, right_arm_asset,
        left_leg_asset, right_leg_asset, left_eye_asset, right_eye_asset, scent_id
      ) values (
        ${subjectName}, ${exhibitedBy}, ${parts.body}, ${parts.top}, ${parts.leftArm}, ${parts.rightArm},
        ${parts.leftLeg}, ${parts.rightLeg}, ${parts.leftEye}, ${parts.rightEye}, ${body.scentId}
      )
      on conflict (body_asset, top_asset, left_arm_asset, right_arm_asset, left_leg_asset, right_leg_asset, left_eye_asset, right_eye_asset, scent_id)
      do nothing
      returning *
    `;
    if (!rows.length) return json({ status: 'duplicate' }, 409);
    return json({ status: 'created', allive: rowToAllive(rows[0]) }, 201);
  } catch (e) { return fail(e); }
};
