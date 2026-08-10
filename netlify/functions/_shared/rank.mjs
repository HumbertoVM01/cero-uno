export const VIEW_CONFIG = {
  day:   { column: 'caresses_24h',  where: 'caresses_24h > 0',  seconds: 86400 },
  week:  { column: 'caresses_7d',   where: 'caresses_7d > 0',   seconds: 604800 },
  month: { column: 'caresses_30d',  where: 'caresses_30d > 0',  seconds: 2592000 },
  year:  { column: 'caresses_365d', where: 'caresses_365d > 0', seconds: 31536000 },
  all:   { column: 'total_caresses', where: 'true', seconds: null },
};

export function rowToAllive(r, activeView = 'all') {
  return {
    id: r.id,
    subjectName: r.subject_name,
    exhibitedBy: r.exhibited_by || null,
    createdAt: r.created_at,
    parts: {
      body: r.body_asset,
      top: r.top_asset,
      leftArm: r.left_arm_asset,
      rightArm: r.right_arm_asset,
      leftLeg: r.left_leg_asset,
      rightLeg: r.right_leg_asset,
      leftEye: r.left_eye_asset,
      rightEye: r.right_eye_asset,
    },
    scentId: r.scent_id,
    caresses: {
      day: Number(r.caresses_24h || 0),
      week: Number(r.caresses_7d || 0),
      month: Number(r.caresses_30d || 0),
      year: Number(r.caresses_365d || 0),
      total: Number(r.total_caresses || 0),
    },
    rank: r.position ? Number(r.position) : (r.historical_rank ? Number(r.historical_rank) : null),
    historicalRank: r.historical_rank ? Number(r.historical_rank) : (activeView === 'all' && r.position ? Number(r.position) : null),
    isNew: Boolean(r.is_new),
  };
}
