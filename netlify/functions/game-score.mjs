import { db } from './_shared/db.mjs';
import { json, readJson, fail } from './_shared/http.mjs';
import { sanitizeSubmission, visitorHash, memoryAgainstTarget, skillFromMistakes, totalFromMetrics, rankPositions, publicScoreRow } from './_shared/game-score.mjs';

export default async (req)=>{
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const body=await readJson(req),run=sanitizeSubmission(body);if(run.error)return json({error:run.error},400);
    const sql=db();
    const existing=await sql`select id from game_scores where round_id=${run.roundId} limit 1`;
    if(existing.length)return json({error:'ROUND_ALREADY_SUBMITTED'},409);
    const hash=visitorHash(run.visitorToken);
    const recent=await sql`select count(*)::int n from game_scores where visitor_hash=${hash} and created_at>clock_timestamp()-interval '1 minute'`;
    if(Number(recent[0]?.n||0)>=12)return json({error:'RATE_LIMITED'},429);
    const targetRows=await sql`select * from allives where id=${run.targetId}::uuid limit 1`;
    if(!targetRows.length)return json({error:'TARGET_NOT_FOUND'},400);
    const memory=memoryAgainstTarget(run.player,targetRows[0]),skillExact=skillFromMistakes(run.mistakes),skill=Math.round(skillExact*10)/10,score=totalFromMetrics(memory,skillExact,run.elapsedMs);
    const rows=await sql`
      insert into game_scores(round_id,visitor_hash,alias,score_version,target_id,memory_score,skill_score,elapsed_ms,total_score,speed_points,mistakes,task_ids)
      values(${run.roundId},${hash},${run.alias},${run.scoreVersion},${run.targetId}::uuid,${memory},${skill},${run.elapsedMs},${score.total},${score.speedPoints},${JSON.stringify(run.mistakes)}::jsonb,${run.taskIds}::text[])
      returning *
    `;
    const positions=await rankPositions(sql,{scoreVersion:run.scoreVersion,total:score.total,memory,skill,elapsedMs:run.elapsedMs});
    return json({status:'created',score:publicScoreRow(rows[0]),positions},201);
  }catch(e){
    if(e?.code==='23505')return json({error:'ROUND_ALREADY_SUBMITTED'},409);
    return fail(e);
  }
};
