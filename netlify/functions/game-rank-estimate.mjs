import { db } from './_shared/db.mjs';
import { json, readJson, fail } from './_shared/http.mjs';
import { sanitizeRun, memoryAgainstTarget, skillFromMistakes, totalFromMetrics, rankPositions } from './_shared/game-score.mjs';

export default async (req)=>{
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const body=await readJson(req),run=sanitizeRun(body);if(run.error)return json({error:run.error},400);
    const sql=db(),targetRows=await sql`select * from allives where id=${run.targetId}::uuid limit 1`;
    if(!targetRows.length)return json({error:'TARGET_NOT_FOUND'},400);
    const memory=memoryAgainstTarget(run.player,targetRows[0]),skillExact=skillFromMistakes(run.mistakes),skill=Math.round(skillExact*10)/10,score=totalFromMetrics(memory,skillExact,run.elapsedMs);
    const positions=await rankPositions(sql,{scoreVersion:run.scoreVersion,total:score.total,memory,skill,elapsedMs:run.elapsedMs});
    return json({score:{total:score.total,memory,skill,elapsedMs:run.elapsedMs},positions});
  }catch(e){return fail(e)}
};
