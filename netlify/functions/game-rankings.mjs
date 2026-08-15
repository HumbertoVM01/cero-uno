import { db } from './_shared/db.mjs';
import { json, fail, clampInt } from './_shared/http.mjs';
import { GAME_SCORE_VERSION, publicScoreRow } from './_shared/game-score.mjs';

export default async (req)=>{
  if(req.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const u=new URL(req.url),metric=['total','parts','skill','time'].includes(u.searchParams.get('metric'))?u.searchParams.get('metric'):'total',offset=clampInt(u.searchParams.get('offset'),0,1000000,0),limit=clampInt(u.searchParams.get('limit'),1,100,20),version=clampInt(u.searchParams.get('version'),1,999,GAME_SCORE_VERSION),sql=db();
    let rows;
    if(metric==='parts')rows=await sql`select * from game_scores where score_version=${version} order by memory_score desc,skill_score desc,elapsed_ms asc,created_at asc,id asc offset ${offset} limit ${limit}`;
    else if(metric==='skill')rows=await sql`select * from game_scores where score_version=${version} order by skill_score desc,memory_score desc,elapsed_ms asc,created_at asc,id asc offset ${offset} limit ${limit}`;
    else if(metric==='time')rows=await sql`select * from game_scores where score_version=${version} order by elapsed_ms asc,skill_score desc,created_at asc,id asc offset ${offset} limit ${limit}`;
    else rows=await sql`select * from game_scores where score_version=${version} order by total_score desc,memory_score desc,skill_score desc,elapsed_ms asc,created_at asc,id asc offset ${offset} limit ${limit}`;
    const count=await sql`select count(*)::int n from game_scores where score_version=${version}`;
    return json({metric,version,total:Number(count[0]?.n||0),offset,limit,items:rows.map((r,i)=>({...publicScoreRow(r),position:offset+i+1}))});
  }catch(e){return fail(e)}
};
