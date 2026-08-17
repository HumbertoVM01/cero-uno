import assert from 'node:assert/strict';
import { TASKS, SHAPES, DIRS, visualSignature, coarseVisualSignature, rotationInvariantVisualSignature, mod } from '../public/js/game/core.js';
import { buildTaskAuditScenario, __taskTestInternals as I } from '../public/js/game/tasks.js';

const N=Math.max(20,Number(process.env.AUDIT_SEEDS||200));
const rankStats={count:Array.from({length:9},()=>new Map()),balance:Array.from({length:9},()=>new Map())};
const winnerStats=Array.from({length:9},()=>new Map());
function uniqueVisual(items,key='d'){const sigs=items.map(x=>visualSignature(x[key]));return new Set(sigs).size===sigs.length}
function correctCount(items){return items.filter(x=>x.correct).length}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function shareEndpoint(a,b,c,d){return [a,b].some(p=>[c,d].some(q=>dist(p,q)<1e-6))}
function geometryNoImproperCross(segments){for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){const [a,b]=segments[i],[c,d]=segments[j];if(shareEndpoint(a,b,c,d))continue;assert.equal(I.properCross(a,b,c,d),false)} }

// The eight Piece Fit masks must be connected, equal-area and dihedrally unique.
function maskPts(mask){return [...mask].flatMap((v,i)=>v==='1'?[[Math.floor(i/3),i%3]]:[])}
function normPts(ps){const mr=Math.min(...ps.map(p=>p[0])),mc=Math.min(...ps.map(p=>p[1]));return ps.map(([r,c])=>[r-mr,c-mc]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(p=>p.join(',')).join(';')}
function transformPts(ps,k,mirror){return ps.map(([r,c])=>{let x=c-1,y=r-1;if(mirror)x=-x;for(let i=0;i<k;i++) [x,y]=[-y,x];return [Math.round(y+1),Math.round(x+1)]})}
function dihedralKey(mask){const ps=maskPts(mask);return Array.from({length:4},(_,k)=>[normPts(transformPts(ps,k,false)),normPts(transformPts(ps,k,true))]).flat().sort()[0]}
assert.ok(I.MASKS.every(m=>maskPts(m).length===5));
assert.equal(new Set(I.MASKS.map(dihedralKey)).size,I.MASKS.length,'Piece Fit masks must be dihedrally unique');

function secretHypotheses(s){
  const all=[...s.positives,...s.negatives,...s.items.map(x=>x.d)],hs=[];
  for(const sh of new Set(all.map(d=>d.shape)))hs.push(d=>d.shape===sh);
  for(const fill of ['solid','outline'])hs.push(d=>d.fill===fill);
  for(const r of DIRS)hs.push(d=>mod(d.rotation||0,360)===r);
  for(const count of [1,2,3,4])hs.push(d=>!!d.countVisible&&d.count===count);
  for(const pos of ['top','right','bottom','left'])hs.push(d=>d.mark!=='none'&&d.markPos===pos);
  for(const sh of new Set(all.map(d=>d.shape)))for(const fill of ['solid','outline'])hs.push(d=>d.shape===sh&&d.fill===fill);
  for(const m of [2,3])for(let t=0;t<m;t++)hs.push(d=>((mod(d.rotation||0,360)/90+(d.count||1))%m)===t);
  hs.push(d=>(d.count===2)===(d.fill==='solid'));
  return hs;
}
function assertEvidenceDeterminesShownAnswer(s){
  for(const h of secretHypotheses(s)){
    if(!s.positives.every(h)||!s.negatives.every(d=>!h(d)))continue;
    const disagreement=s.items.some(x=>h(x.d)!==s.matches(x.d));
    assert.equal(disagreement,false,'a simple alternate rule fits all evidence but changes the shown answer set');
  }
}

for(const task of TASKS){
  for(let level=1;level<=9;level++){
    for(let i=0;i<N;i++){
      const s=buildTaskAuditScenario(task.id,level,`audit-${i}`);
      switch(task.id){
        case 'intruder':assert.notEqual(visualSignature(s.base),visualSignature(s.intr));break;
        case 'twin':assert.equal(correctCount(s.items),1);assert.ok(uniqueVisual(s.items));assert.equal(s.items.filter(x=>visualSignature(x.d)===visualSignature(s.target)).length,1);break;
        case 'select_all':assert.ok(s.items.some(x=>x.correct)&&s.items.some(x=>!x.correct));assert.ok(uniqueVisual(s.items));break;
        case 'sequence':assert.equal(correctCount(s.items),1);assert.ok(uniqueVisual(s.items));break;
        case 'missing_cell':assert.equal(correctCount(s.items),1);assert.ok(uniqueVisual(s.items));break;
        case 'matrix':assert.equal(correctCount(s.items),1);assert.ok(uniqueVisual(s.items));assert.equal(visualSignature(I.applyOps(s.cells[6],s.ops)),visualSignature(s.answer));break;
        case 'rotation_match':{
          assert.equal(correctCount(s.items),1);assert.ok(uniqueVisual(s.items));const id=rotationInvariantVisualSignature(s.target);assert.equal(s.items.filter(x=>rotationInvariantVisualSignature(x.d)===id).length,1);break;
        }
        case 'mirror_match':assert.equal(correctCount(s.items),1);assert.ok(uniqueVisual(s.items));break;
        case 'piece_fit':assert.equal(correctCount(s.items),1);assert.equal(new Set(s.items.map(x=>x.m)).size,s.items.length);break;
        case 'maze_exit':{
          const all=[...s.segments,...s.branches.flat()];geometryNoImproperCross(all);assert.equal(s.branches.length,s.profile.branches);break;
        }
        case 'broken_circuit':{
          const results=s.candidates.map(e=>I.graphConnected(s.nodes.length,[...s.edges,e],s.start,s.goal));assert.equal(I.graphConnected(s.nodes.length,s.edges,s.start,s.goal),false);assert.equal(results.filter(Boolean).length,1);assert.equal(results[0],true);
          const base=s.edges.map(([a,b])=>[s.nodes[a],s.nodes[b]]),cand=s.candidates.map(([a,b])=>[s.nodes[a],s.nodes[b]]);geometryNoImproperCross(base);for(const cseg of cand)for(const bseg of base){if(shareEndpoint(...cseg,...bseg))continue;assert.equal(I.properCross(...cseg,...bseg),false)}break;
        }
        case 'missing_bridge':assert.equal(correctCount(s.items),1);assert.equal(new Set(s.items.map(x=>x.k)).size,s.items.length);assert.equal(new Set(s.items.map(x=>x.k.length)).size,1,'all bridge candidates must have the same degree');break;
        case 'family':{
          assert.equal(correctCount(s.items),1);const correct=s.items.find(x=>x.correct).d;assert.equal(correct.shape,s.shape);assert.ok(s.items.filter(x=>!x.correct).every(x=>x.d.shape!==s.shape));assert.ok(uniqueVisual(s.items));assert.ok(s.examples.every(x=>!visualSignature(x).includes('undefined')));assert.ok(s.examples.every(x=>visualSignature(x)!==visualSignature(correct)));if(s.examples.length>=3)assert.ok(new Set(s.examples.map(x=>`${x.fill}:${x.rotation}:${x.mark}`)).size>=2);break;
        }
        case 'double_filter':{
          assert.equal(correctCount(s.items),1);assert.ok(uniqueVisual(s.items));const corr=s.items.find(x=>x.correct).d;assert.ok(s.items.some(x=>x.d.shape===corr.shape&&x.d.fill!==corr.fill));assert.ok(s.items.some(x=>x.d.shape!==corr.shape&&x.d.fill===corr.fill));break;
        }
        case 'secret_rule':assert.ok(s.positives.every(s.matches));assert.ok(s.negatives.every(x=>!s.matches(x)));assert.equal(correctCount(s.items),1);assert.ok(s.items.every(x=>s.matches(x.d)===x.correct));assert.ok(uniqueVisual(s.items));assertEvidenceDeterminesShownAnswer(s);break;
        case 'count':{
          assert.ok(s.answers.includes(s.targetN));assert.equal(new Set(s.answers).size,s.answers.length);if(s.sameShapeAny!==s.targetN)assert.ok(!s.answers.includes(s.sameShapeAny));const sorted=[...s.answers].sort((a,b)=>a-b),rank=sorted.indexOf(s.targetN);rankStats.count[level-1].set(rank,(rankStats.count[level-1].get(rank)||0)+1);break;
        }
        case 'more':assert.equal(s.counts.filter(x=>x===Math.max(...s.counts)).length,1);assert.equal(s.winner,s.counts.indexOf(Math.max(...s.counts)));winnerStats[level-1].set(s.winner,(winnerStats[level-1].get(s.winner)||0)+1);break;
        case 'balance':{
          assert.notEqual(visualSignature(s.A),visualSignature(s.B));assert.ok(s.answers.includes(s.answer));assert.equal(new Set(s.answers).size,s.answers.length);const sorted=[...s.answers].sort((a,b)=>a-b),rank=sorted.indexOf(s.answer);rankStats.balance[level-1].set(rank,(rankStats.balance[level-1].get(rank)||0)+1);break;
        }
        case 'a_to_b':{
          assert.equal(correctCount(s.items),1);assert.ok(uniqueVisual(s.items));assert.equal(s.pool.filter(o=>visualSignature(I.applyOp(s.a,o))===visualSignature(s.b)).length,1);assert.ok(s.items.every(x=>x.correct||x.op!==s.op));break;
        }
        case 'operator_chain':{
          assert.equal(correctCount(s.items),1);assert.ok(uniqueVisual(s.items));assert.notEqual(visualSignature(s.initial),visualSignature(s.answer));if(level>=3)assert.notEqual(visualSignature(I.applyOps(s.initial,s.ops)),visualSignature(I.applyOps(s.initial,[...s.ops].reverse())));break;
        }
        case 'permutation':{
          assert.equal(correctCount(s.items),1);assert.equal(new Set(s.objs.map(coarseVisualSignature)).size,s.objs.length);if(s.stages.length>1){const n=s.n,id=Array.from({length:n},(_,j)=>j),apply=(state,p)=>{const out=new Array(n);for(let src=0;src<n;src++)out[p[src]]=state[src];return out},a=apply(apply(id,s.stages[0]),s.stages[1]),b=apply(apply(id,s.stages[1]),s.stages[0]);assert.notDeepEqual(a,b);const hamming=x=>x.reduce((n,v,j)=>n+(v!==s.final[j]),0);assert.ok(s.items.some(x=>!x.correct&&hamming(x.state)===2),'high-level permutation needs a near-miss');}break;
        }
        case 'tap_order':assert.equal(new Set(s.descs.map(coarseVisualSignature)).size,s.descs.length);break;
        case 'node_path':{
          assert.ok(s.route.length>=3);assert.equal(new Set(s.nodes.map(x=>x.cell)).size,s.nodes.length);const branchAttach=s.nodes.filter(x=>x.attach!=null).map(x=>x.attach);assert.equal(new Set(branchAttach).size,branchAttach.length);geometryNoImproperCross(s.edges);break;
        }
        case 'vertex_trace':{
          assert.ok(I.validateTraceRoute(s.route,{closed:s.closed,allowCross:s.allowCross}));for(const p of s.distractors)for(const [a,b] of (()=>{const z=[];for(let q=0;q<s.route.length-1;q++)z.push([s.route[q],s.route[q+1]]);if(s.closed)z.push([s.route.at(-1),s.route[0]]);return z})())assert.ok(I.segmentPointDistance(a,b,p)>=38);break;
        }
        case 'what_changed':{
          if(s.beforePos[s.target].x===s.afterPos[s.target].x&&s.beforePos[s.target].y===s.afterPos[s.target].y)assert.notEqual(visualSignature(s.before[s.target]),visualSignature(s.after[s.target]));else assert.ok(dist(s.beforePos[s.target],s.afterPos[s.target])>=25);for(let j=0;j<s.before.length;j++)if(j!==s.target)assert.equal(visualSignature(s.before[j]),visualSignature(s.after[j]));break;
        }
        case 'what_disappeared':assert.ok(!s.after.some(x=>visualSignature(x)===visualSignature(s.correct)));assert.equal(new Set(s.before.map(visualSignature)).size,s.before.length);assert.equal(s.visibleCount,s.before.length);assert.equal(s.after.length,s.before.length-1);assert.equal(s.afterPos.length,s.after.length);break;
        case 'follow_target':assert.ok(I.followScenarioFair(s.objs,s.duration,level));assert.equal(new Set(s.objs.map(x=>coarseVisualSignature(x.d))).size,s.objs.length);for(const o of s.objs)for(const t of [0,s.duration/2000,s.duration/1000]){const p=I.followPosAt(o,t);assert.ok(p.x>=7.99&&p.x<=92.01&&p.y>=9.99&&p.y<=90.01)}break;
      }
    }
  }
  console.log('AUDIT PASS',task.id);
}
for(const [name,levels] of Object.entries(rankStats))for(let level=0;level<levels.length;level++){const m=levels[level];assert.ok(m.size>=Math.min(2,level<2?2:3),`${name} L${level+1} correct rank should vary`)}
for(let level=0;level<winnerStats.length;level++){const expected=level<2?2:level<6?3:4;assert.equal(winnerStats[level].size,expected,`More L${level+1} should allow every group to win`)}
console.log(`ALL 27 TASK AUDIT STRESS TESTS PASS (${N} seeds/level, ${N*9*27} scenarios)`);
