import crypto from 'node:crypto';
import { POM_IDS, GEM_IDS, SCENT_IDS } from './catalog.mjs';

export const GAME_SCORE_VERSION = 1;
export const GAME_TASK_IDS = new Set([
  'intruder','twin','select_all','sequence','missing_cell','matrix','rotation_match','mirror_match','piece_fit',
  'maze_exit','broken_circuit','missing_bridge','family','double_filter','secret_rule','count','more','balance',
  'a_to_b','operator_chain','permutation','tap_order','node_path','vertex_trace','what_changed','what_disappeared','follow_target'
]);
const POM_FIELDS=['body','top','leftArm','rightArm','leftLeg','rightLeg'];
const GEM_FIELDS=['leftEye','rightEye'];

export function visitorHash(token){
  const salt=process.env.VISITOR_HASH_SALT||'museo-de-allives';
  return crypto.createHash('sha256').update(`${salt}:${token}`).digest('hex');
}
export function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
export function skillFromMistakes(mistakes){
  let sum=0;for(let i=1;i<=9;i++)sum+=(i/45)*(1/(1+(mistakes[i-1]||0)));return 100*sum;
}
export function speedRaw(elapsedMs){return 100*clamp((135-(elapsedMs/1000))/90,0,1)}
export function totalFromMetrics(memory,skill,elapsedMs){
  const M=clamp(memory/9,0,1),S=clamp(skill/100,0,1),raw=speedRaw(elapsedMs),speed=M*raw;
  return {memoryPoints:600*M,skillPoints:300*S,speedPoints:speed,speedRaw:raw,total:Math.round(clamp(600*M+300*S+speed,0,1000))};
}
export function validPlayerBuild(player){
  const parts=player?.parts||{};
  return POM_FIELDS.every(k=>POM_IDS.has(parts[k]))&&GEM_FIELDS.every(k=>GEM_IDS.has(parts[k]))&&SCENT_IDS.has(player?.scentId);
}
export function memoryAgainstTarget(player,targetRow){
  const map={body:'body_asset',top:'top_asset',leftArm:'left_arm_asset',rightArm:'right_arm_asset',leftLeg:'left_leg_asset',rightLeg:'right_leg_asset',leftEye:'left_eye_asset',rightEye:'right_eye_asset'};
  let n=0;for(const [k,col] of Object.entries(map))if(player.parts[k]===targetRow[col])n++;if(player.scentId===targetRow.scent_id)n++;return n;
}
export function sanitizeRun(body,{requireIdentity=false}={}){
  const alias=String(body.alias||'').trim(),roundId=String(body.roundId||'').trim(),visitorToken=String(body.visitorToken||''),targetId=String(body.targetId||'').trim();
  const elapsedMs=Math.round(Number(body.elapsedMs)),mistakes=Array.isArray(body.mistakes)?body.mistakes.map(Number):[],taskIds=Array.isArray(body.taskIds)?body.taskIds.map(String):[];
  if(requireIdentity&&(!alias||[...alias].length>20))return {error:'ALIAS_REQUIRED'};
  if(alias&&[...alias].length>20)return {error:'ALIAS_TOO_LONG'};
  if(roundId.length<8||roundId.length>120)return {error:'INVALID_ROUND'};
  if(requireIdentity&&(visitorToken.length<8||visitorToken.length>200))return {error:'INVALID_VISITOR'};
  if(!/^[0-9a-f-]{36}$/i.test(targetId))return {error:'INVALID_TARGET'};
  if(!Number.isFinite(elapsedMs)||elapsedMs<5000||elapsedMs>2*60*60*1000)return {error:'INVALID_TIME'};
  if(mistakes.length!==9||mistakes.some(n=>!Number.isInteger(n)||n<0||n>100))return {error:'INVALID_MISTAKES'};
  if(taskIds.length!==9||new Set(taskIds).size!==9||taskIds.some(id=>!GAME_TASK_IDS.has(id)))return {error:'INVALID_TASKS'};
  if(!validPlayerBuild(body.player))return {error:'INVALID_PLAYER_BUILD'};
  return {alias,roundId,visitorToken,targetId,elapsedMs,mistakes,taskIds,player:body.player,scoreVersion:GAME_SCORE_VERSION};
}
export function sanitizeSubmission(body){return sanitizeRun(body,{requireIdentity:true})}

export function publicScoreRow(r){
  return {id:r.id,alias:r.alias,total:Number(r.total_score),memory:Number(r.memory_score),skill:Number(r.skill_score),elapsedMs:Number(r.elapsed_ms),createdAt:r.created_at,scoreVersion:Number(r.score_version)};
}

export async function rankPositions(sql,{scoreVersion=GAME_SCORE_VERSION,total,memory,skill,elapsedMs}){
  const [totalRows,partsRows,skillRows,timeRows,countRows]=await Promise.all([
    sql`select count(*)::int n from game_scores where score_version=${scoreVersion} and (
      total_score>${total} or
      (total_score=${total} and memory_score>${memory}) or
      (total_score=${total} and memory_score=${memory} and skill_score>${skill}) or
      (total_score=${total} and memory_score=${memory} and skill_score=${skill} and elapsed_ms<${elapsedMs})
    )`,
    sql`select count(*)::int n from game_scores where score_version=${scoreVersion} and (
      memory_score>${memory} or
      (memory_score=${memory} and skill_score>${skill}) or
      (memory_score=${memory} and skill_score=${skill} and elapsed_ms<${elapsedMs})
    )`,
    sql`select count(*)::int n from game_scores where score_version=${scoreVersion} and (
      skill_score>${skill} or
      (skill_score=${skill} and memory_score>${memory}) or
      (skill_score=${skill} and memory_score=${memory} and elapsed_ms<${elapsedMs})
    )`,
    sql`select count(*)::int n from game_scores where score_version=${scoreVersion} and (
      elapsed_ms<${elapsedMs} or
      (elapsed_ms=${elapsedMs} and skill_score>${skill})
    )`,
    sql`select count(*)::int n from game_scores where score_version=${scoreVersion}`
  ]);
  return {total:Number(totalRows[0]?.n||0)+1,parts:Number(partsRows[0]?.n||0)+1,skill:Number(skillRows[0]?.n||0)+1,time:Number(timeRows[0]?.n||0)+1,entries:Number(countRows[0]?.n||0)};
}
