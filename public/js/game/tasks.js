import {
  TASK_BY_ID, seeded, clamp, mod, shapeDescriptor, shapeSvg, descKey, cloneDesc, mutateDesc, DIRS, SHAPES,
  visualSignature, coarseVisualSignature, rotationInvariantVisualSignature, visualEquals, uniqueVisualDescs
} from './core.js';

const el=(tag,cls='')=>{const x=document.createElement(tag);if(cls)x.className=cls;return x};
const reduced=()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function svgWrap(body,view='0 0 320 220',cls='game-diagram',label='Diagrama'){return `<svg class="${cls}" viewBox="${view}" role="img" aria-label="${esc(label)}">${body}</svg>`}

class Controller{
  constructor({root,onSuccess,onFailure,sounds,dynamic=false}){this.root=root;this.onSuccess=onSuccess;this.onFailure=onFailure;this.sounds=sounds;this.dynamic=dynamic;this.locked=false;this.cleanup=[];this.resumeFn=null;this.pauseFn=null}
  ok(){if(this.locked)return;this.locked=true;this.sounds?.play('ui_press_02',.42);this.root.classList.add('task-correct');setTimeout(()=>this.onSuccess?.(),reduced()?60:170)}
  bad(target=null){if(this.locked)return;this.locked=true;this.sounds?.play('validation_missing',.58);target?.classList?.add('wrong');this.root.classList.add('task-wrong');setTimeout(()=>this.onFailure?.(),reduced()?80:230)}
  pauseForModal(){this.pauseFn?.()}
  resumeAfterModal(){this.resumeFn?.()}
  destroy(){this.locked=true;for(const f of this.cleanup.splice(0))try{f()}catch{};this.root.replaceChildren()}
}

function choiceRowPattern(n){
  const exact={2:[2],3:[3],4:[2,2],5:[3,2],6:[3,3],7:[4,3],8:[4,4],9:[3,3,3],10:[4,3,3],11:[4,4,3],12:[4,4,4],13:[4,3,3,3],14:[4,4,3,3],15:[4,4,4,3],16:[4,4,4,4]};
  if(exact[n])return exact[n];const cols=n<=6?3:4,out=[];let left=n;while(left>0){out.push(Math.min(cols,left));left-=cols}return out;
}
function mountChoiceGrid(c,choices,{multi=false,onEvaluate=null,gridClass='',rowPattern=null}={}){
  const grid=el('div',`game-choice-grid choices-${choices.length}${gridClass?' '+gridClass:''}`),buttons=[],rows=rowPattern||choiceRowPattern(choices.length);c.root.append(grid);let cursor=0;
  for(const count of rows){
    const row=el('div','game-choice-row');row.style.setProperty('--row-count',count);grid.append(row);
    for(let k=0;k<count&&cursor<choices.length;k++,cursor++){
      const ch=choices[cursor],b=el('button',`game-choice${ch.className?' '+ch.className:''}`);b.type='button';b.innerHTML=ch.html;b.dataset.correct=ch.correct?'1':'0';b.dataset.value=ch.value??'';b.setAttribute('aria-label',ch.label||`Opción ${cursor+1}`);row.append(b);buttons.push(b);
    }
  }
  if(multi){
    const selected=new Set();buttons.forEach((b,i)=>b.onclick=()=>{if(c.locked)return;b.classList.toggle('selected');b.classList.contains('selected')?selected.add(i):selected.delete(i)});
    const conf=el('button','game-task-confirm candy-button primary');conf.textContent='Confirmar';c.root.append(conf);
    conf.onclick=()=>{if(c.locked||!selected.size)return;const result=onEvaluate?.(selected,choices)??([...selected].every(i=>choices[i].correct)&&choices.every((x,i)=>x.correct===selected.has(i)));if(result)c.ok();else{for(const i of selected)if(!choices[i].correct)buttons[i].classList.add('wrong');c.bad(conf)}};
    return {buttons,selected,confirm:conf};
  }
  buttons.forEach((b,i)=>b.onclick=()=>{if(c.locked)return;const ok=onEvaluate?onEvaluate(i,choices):choices[i].correct;ok?c.ok():c.bad(b)});return {buttons};
}
function addReference(root,html,cls='game-reference'){const d=el('div',cls);d.innerHTML=html;root.append(d);return d}
function taskCaption(root,text){const x=el('div','game-task-caption');x.textContent=text;root.append(x);return x}

const PLAIN_SHAPES=['circle','square','triangle','diamond','hexagon','cross','bar','L','T','chevron'];
const DIRECTIONAL=['triangle','L','T','chevron','bar'];
const CHIRAL=['L'];
function glyph(rng,{shapes=PLAIN_SHAPES,shape=null,fill=null,rotation=null,mark='none',markPos=null,count=1,countVisible=false,mirror=false}={}){
  return {shape:shape||rng.pick(shapes),rotation:rotation==null?rng.pick(DIRS):rotation,fill:fill|| (rng.bool()?'solid':'outline'),mark:mark==='random'?rng.pick(['dot','bar','two']):mark,markPos:markPos||rng.pick(['top','right','bottom','left']),count,countVisible,mirror};
}
function canonicalGlyph(shape,{fill='solid',rotation=0,mark='none',markPos='top',count=1,countVisible=false,mirror=false}={}){return {shape,fill,rotation,mark,markPos,count,countVisible,mirror}}
function countGlyph(base,n){return {...cloneDesc(base),count:n,countVisible:true,mark:'none'}}
function markedGlyph(base,pos,mark='dot'){return {...cloneDesc(base),mark,markPos:pos,countVisible:false}}
function addVisualUnique(arr,d,{coarse=false}={}){const key=coarse?coarseVisualSignature(d):visualSignature(d);if(arr.some(x=>(coarse?coarseVisualSignature(x):visualSignature(x))===key))return false;arr.push(d);return true}
function genUniqueShapes(rng,n,{directional=false,mark=false,simple=true,coarse=false,shapes=null}={}){
  const out=[];let guard=0;while(out.length<n&&guard++<1600){const d=glyph(rng,{shapes:shapes||(directional?DIRECTIONAL:PLAIN_SHAPES),mark:mark?'random':'none',count:simple?1:rng.int(1,3),countVisible:!simple});addVisualUnique(out,d,{coarse})}if(out.length<n)throw new Error('VISUAL_POOL_EXHAUSTED');return out;
}
function visualVariants(base,rng,types,count,{coarse=false}={}){
  const out=[];let guard=0;while(out.length<count&&guard++<800){const type=types[guard%types.length],d=mutateDesc(base,rng,type);if(!visualEquals(d,base)&&addVisualUnique(out,d,{coarse}))continue;const random=glyph(rng,{shapes:DIRECTIONAL,mark:'none'});if(!visualEquals(random,base))addVisualUnique(out,random,{coarse})}if(out.length<count)throw new Error('NOT_ENOUGH_VISUAL_VARIANTS');return out;
}
function ensureSingleVisualCorrect(items){const correct=items.filter(x=>x.correct);if(correct.length!==1)throw new Error('CORRECTNESS_COUNT');const sig=visualSignature(correct[0].d);if(items.filter(x=>visualSignature(x.d)===sig).length!==1)throw new Error('VISUAL_CORRECT_NOT_UNIQUE')}

function safeScatter(rng,n,{xMin=10,xMax=90,yMin=12,yMax=88,aspectBias=1.6}={}){
  const cols=Math.max(2,Math.ceil(Math.sqrt(n*aspectBias))),rows=Math.ceil(n/cols),cells=[],cw=(xMax-xMin)/cols,ch=(yMax-yMin)/rows;
  for(let r=0;r<rows;r++)for(let q=0;q<cols;q++){const jx=(rng.float()-.5)*cw*.22,jy=(rng.float()-.5)*ch*.20;cells.push({x:xMin+(q+.5)*cw+jx,y:yMin+(r+.5)*ch+jy})}
  return rng.shuffle(cells).slice(0,n);
}
function tapOrderPositions(rng,n){
  // Touch-specific rows: L8=4+4+4 and L9=5+4+4 keep large vertical gaps;
  // dense tokens use 50px hitboxes, so even narrow mobile fields remain separable.
  const patterns={2:[2],3:[3],4:[4],5:[3,2],6:[3,3],7:[4,3],8:[4,4],9:[3,3,3],10:[4,3,3],11:[4,4,3],12:[4,4,4],13:[5,4,4]},rows=patterns[n]||choiceRowPattern(n),out=[],rowCount=rows.length;
  rows.forEach((count,r)=>{const y=rowCount===1?50:13+r*(74/Math.max(1,rowCount-1)),span=count===5?80:count===4?72:count===3?56:38;for(let i=0;i<count;i++){const x=count===1?50:50-span/2+i*(span/(count-1));out.push({x:x+(rng.float()-.5)*1.0,y:y+(rng.float()-.5)*.7})}});return rng.shuffle(out);
}
function attentionPositions(rng,n){const rows=choiceRowPattern(n),out=[],rowCount=rows.length;rows.forEach((count,r)=>{const y=rowCount===1?50:15+r*(70/Math.max(1,rowCount-1)),span=count===4?70:count===3?54:36;for(let i=0;i<count;i++){const x=count===1?50:50-span/2+i*(span/(count-1));out.push({x:x+(rng.float()-.5)*.7,y:y+(rng.float()-.5)*.7})}});return rng.shuffle(out)}

function pointDist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function segmentPointDistance(a,b,p){const vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y,l2=vx*vx+vy*vy;if(!l2)return pointDist(a,p);const t=clamp((wx*vx+wy*vy)/l2,0,1),x=a.x+t*vx,y=a.y+t*vy;return Math.hypot(p.x-x,p.y-y)}
function orient(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function properCross(a,b,c,d){const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);return o1*o2<0&&o3*o4<0}
function segmentsShareEndpoint(a,b,c,d){return [a,b].some(p=>[c,d].some(q=>p===q||(Math.abs(p.x-q.x)<1e-6&&Math.abs(p.y-q.y)<1e-6)))}
function segmentSegmentDistance(a,b,c,d){if(properCross(a,b,c,d))return 0;return Math.min(segmentPointDistance(a,b,c),segmentPointDistance(a,b,d),segmentPointDistance(c,d,a),segmentPointDistance(c,d,b))}

// Spatial transformations are composed in screen coordinates. Unlike the old field toggles,
// ROTATE and MIRROR are intentionally non-commutative.
function applyOp(d,op){
  const x=cloneDesc(d);
  if(op==='ROTATE')x.rotation=mod((x.rotation||0)+90,360);
  if(op==='ROTATE_CCW')x.rotation=mod((x.rotation||0)-90,360);
  if(op==='MIRROR'){x.rotation=mod(-(x.rotation||0),360);x.mirror=!x.mirror}
  if(op==='FILL')x.fill=x.fill==='solid'?'outline':'solid';
  if(op==='ADD'){x.countVisible=true;x.count=clamp((Number(x.count)||1)+1,1,5)}
  if(op==='MOVE'){if(!x.mark||x.mark==='none')x.mark='dot';x.markPos={top:'right',right:'bottom',bottom:'left',left:'top'}[x.markPos]||'top'}
  return x;
}
function opGlyph(op){return {ROTATE:'↻ 90°',ROTATE_CCW:'↺ 90°',MIRROR:'↔',FILL:'● ↔ ○',ADD:'+ •',MOVE:'• ↷'}[op]||op}
function applyOps(initial,ops){return ops.reduce((s,o)=>applyOp(s,o),cloneDesc(initial))}

// 1 Intruso -----------------------------------------------------------------
function intruderScenario(rng,level){
  const n=[4,5,6,7,8,9,12,12,16][level-1],mutation=['shape','fill','rotation','mark','markPos','rotation','mark','markPos','count'][level-1];
  const opts={shapes:(mutation==='rotation'?['L','chevron','triangle','T']:PLAIN_SHAPES),mark:(mutation==='markPos'?rng.pick(['dot','bar','two']):mutation==='mark'?(rng.bool()?'none':'dot'):'none'),count:mutation==='count'?rng.int(1,3):1,countVisible:mutation==='count'};
  const base=glyph(rng,opts),intr=mutateDesc(base,rng,mutation);if(visualEquals(base,intr))throw new Error('INTRUDER_NOT_VISUAL');return {n,base,intr,idx:rng.int(0,n-1)};
}
function taskIntruder(c,rng,level){const s=intruderScenario(rng,level),choices=Array.from({length:s.n},(_,i)=>({html:shapeSvg(i===s.idx?s.intr:s.base,{size:s.n>=12?50:66,label:i===s.idx?'Figura':'Figura'}),correct:i===s.idx,label:`Figura ${i+1}`}));mountChoiceGrid(c,choices)}

// 2 Gemelo ------------------------------------------------------------------
function twinScenario(rng,level){
  const n=[4,4,5,5,6,6,8,9,12][level-1],target=glyph(rng,{shapes:level>=3?DIRECTIONAL:PLAIN_SHAPES,mark:level>=4?'random':'none',count:level>=7?rng.int(1,3):1,countVisible:level>=7});
  if(level>=4&&target.mark==='none')target.mark='dot';
  const types=['shape','fill','rotation','mark','markPos','mirror','count'],wrong=visualVariants(target,rng,types.slice(0,Math.min(types.length,2+level)),n-1);const items=[{d:target,correct:true},...wrong.map(d=>({d,correct:false}))];ensureSingleVisualCorrect(items);return {target,items:rng.shuffle(items)};
}
function taskTwin(c,rng,level){const s=twinScenario(rng,level);addReference(c.root,shapeSvg(s.target,{size:94,label:'Figura objetivo'}),'game-reference target');mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:s.items.length>=9?52:68}),correct:x.correct,label:`Candidato ${i+1}`})))}

// 3 Selecciona Todos ---------------------------------------------------------
function selectAllScenario(rng,level){
  const n=[4,5,6,7,8,9,12,13,15][level-1],rule=level<5?'shape':level<7?'fill':'combo',shape=rng.pick(['L','T','triangle','chevron']),fill=rng.bool()?'solid':'outline',maxWant=rule==='combo'?4:Math.min(6,n-2),want=rng.int(2,Math.max(2,Math.min(maxWant,Math.floor(n*.42)))),items=[];
  const matches=d=>rule==='shape'?d.shape===shape:rule==='fill'?d.fill===fill:(d.shape===shape&&d.fill===fill);
  while(items.filter(x=>x.correct).length<want){const d=glyph(rng,{shapes:rule==='fill'?PLAIN_SHAPES:[shape],shape:rule==='shape'||rule==='combo'?shape:null,fill:rule==='fill'||rule==='combo'?fill:null,mark:'none'});if(matches(d)&&!items.some(x=>visualSignature(x.d)===visualSignature(d)))items.push({d,correct:true})}
  let guard=0;while(items.length<n&&guard++<1000){let d=glyph(rng,{mark:'none'});if(rule==='shape')d.shape=rng.pick(PLAIN_SHAPES.filter(s=>s!==shape));else if(rule==='fill')d.fill=fill==='solid'?'outline':'solid';else{if(rng.bool())d.shape=rng.pick(PLAIN_SHAPES.filter(s=>s!==shape));else d.fill=fill==='solid'?'outline':'solid'}if(!matches(d)&&!items.some(x=>visualSignature(x.d)===visualSignature(d)))items.push({d,correct:false})}
  if(items.length!==n)throw new Error('SELECT_ALL_POOL');return {rule,shape,fill,items:rng.shuffle(items)};
}
function taskSelectAll(c,rng,level){
  const s=selectAllScenario(rng,level),caption=s.rule==='shape'?'MISMA FORMA':s.rule==='fill'?'MISMO RELLENO':'MISMA FORMA + RELLENO';
  if(s.rule==='fill')addReference(c.root,`<div class="filter-fill ${s.fill}"><span>${s.fill==='solid'?'●':'○'}</span></div><span class="game-ref-caption">${caption}</span>`);
  else addReference(c.root,shapeSvg(canonicalGlyph(s.shape,{fill:s.fill,rotation:0}),{size:82})+`<span class="game-ref-caption">${caption}</span>`);
  mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:s.items.length>=12?48:60}),correct:x.correct,label:`Opción ${i+1}`})),{multi:true});
}

// 4 Sigue la Serie -----------------------------------------------------------
function sequenceScenario(rng,level){
  const a=canonicalGlyph('L',{fill:'solid'}),b=canonicalGlyph('T',{fill:'outline'}),c=canonicalGlyph('chevron',{fill:'solid'});let seq,answer,alts=[];
  if(level===1){seq=[a,b,a,b,a];answer=b;alts=[a,c]}
  else if(level===2){seq=[a,a,b,b,a,a];answer=b;alts=[a,c]}
  else if(level===3){seq=[0,90,180,270,0].map(r=>({...a,rotation:r}));answer={...a,rotation:90};alts=[{...a,rotation:180},{...a,rotation:270},b]}
  else if(level===4){const q=canonicalGlyph('circle',{fill:'outline',countVisible:true});seq=[1,2,3,1,2].map(n=>countGlyph(q,n));answer=countGlyph(q,3);alts=[countGlyph(q,1),countGlyph(q,2),{...q,fill:'solid',count:3,countVisible:true}]}
  else if(level===5){seq=['solid','outline','solid','outline','solid'].map(fill=>({...a,fill}));answer={...a,fill:'outline'};alts=[{...a,fill:'solid'},b,c]}
  else if(level===6){seq=[a,b,c,a,b];answer=c;alts=[a,b,{...c,fill:'outline'}]}
  else if(level===7){seq=[0,1,2,3,4].map(i=>({...a,rotation:(i*90)%360,fill:i%2?'outline':'solid'}));answer={...a,rotation:90,fill:'outline'};alts=[{...a,rotation:90,fill:'solid'},{...a,rotation:180,fill:'outline'},{...a,rotation:0,fill:'outline'}]}
  else if(level===8){const m=markedGlyph(a,'top','dot');seq=['top','right','bottom','left','top'].map(p=>({...m,markPos:p}));answer={...m,markPos:'right'};alts=[{...m,markPos:'bottom'},{...m,markPos:'left'},markedGlyph({...a,rotation:90},'right','dot')]}
  else{const q={...a,countVisible:true,count:1};seq=[{...q,rotation:0,count:1},{...q,rotation:90,count:1},{...q,rotation:90,count:2},{...q,rotation:180,count:2},{...q,rotation:180,count:3}];answer={...q,rotation:270,count:3};alts=[{...q,rotation:180,count:4},{...q,rotation:270,count:2},{...q,rotation:0,count:3},{...q,rotation:270,count:4}]}
  const wrong=uniqueVisualDescs(alts).filter(d=>!visualEquals(d,answer)),need=level<3?2:3;if(wrong.length<need)wrong.push(...visualVariants(answer,rng,['shape','fill','rotation'],need-wrong.length));return {seq,answer,items:rng.shuffle([{d:answer,correct:true},...wrong.slice(0,need).map(d=>({d,correct:false}))])};
}
function taskSequence(c,rng,level){const s=sequenceScenario(rng,level);addReference(c.root,`<div class="game-sequence-strip">${s.seq.map(x=>shapeSvg(x,{size:s.seq.length>5?48:56})).join('<span>→</span>')}<span class="game-question">?</span></div>`);mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:64}),correct:x.correct,label:`Continuación ${i+1}`})))}

// 5 Casilla Faltante ---------------------------------------------------------
function missingCellScenario(rng,level){
  let rows,cols,cells,answer,missing;
  if(level===1){rows=1;cols=3;const q=canonicalGlyph('circle',{fill:'outline',countVisible:true});cells=[1,2,3].map(n=>countGlyph(q,n));missing=2}
  else if(level===2){rows=2;cols=2;cells=[canonicalGlyph('L',{fill:'solid'}),canonicalGlyph('L',{fill:'outline'}),canonicalGlyph('T',{fill:'solid'}),canonicalGlyph('T',{fill:'outline'})];missing=3}
  else if(level===3){rows=2;cols=2;cells=[canonicalGlyph('L'),canonicalGlyph('L',{rotation:90}),canonicalGlyph('chevron'),canonicalGlyph('chevron',{rotation:90})];missing=3}
  else if(level===4){rows=2;cols=2;const A=markedGlyph(canonicalGlyph('L'),'top'),B=markedGlyph(canonicalGlyph('T'),'top');cells=[A,{...A,markPos:'right'},B,{...B,markPos:'right'}];missing=3}
  else if(level===5){rows=2;cols=3;cells=[];for(const sh of ['L','T'])for(const r of [0,90,180])cells.push(canonicalGlyph(sh,{rotation:r}));missing=5}
  else if(level===6){rows=3;cols=3;const q=canonicalGlyph('L',{countVisible:true});cells=[];for(let r=0;r<3;r++)for(let col=0;col<3;col++)cells.push({...q,count:r+1,rotation:col*90});missing=8}
  else if(level===7){rows=3;cols=3;cells=[];for(const sh of ['L','T','chevron'])for(const pos of ['top','right','bottom'])cells.push(markedGlyph(canonicalGlyph(sh),pos));missing=8}
  else if(level===8){rows=3;cols=3;cells=[];for(let r=0;r<3;r++)for(let col=0;col<3;col++)cells.push(canonicalGlyph('L',{count:r+1,countVisible:true,rotation:col*90,fill:col===1?'outline':'solid'}));missing=8}
  else{rows=3;cols=3;cells=[];for(const sh of ['L','T','chevron'])for(let col=0;col<3;col++)cells.push(markedGlyph(canonicalGlyph(sh,{rotation:col*90,fill:col===1?'outline':'solid'}),['top','right','bottom'][col]));missing=8}
  answer=cells[missing];const alts=[mutateDesc(answer,rng,'rotation'),mutateDesc(answer,rng,'fill'),mutateDesc(answer,rng,answer.mark!=='none'?'markPos':'shape'),mutateDesc(answer,rng,'count')],wrong=uniqueVisualDescs(alts).filter(d=>!visualEquals(d,answer));while(wrong.length<3)wrong.push(...visualVariants(answer,rng,['shape','fill','rotation'],1));return {rows,cols,cells,missing,answer,items:rng.shuffle([{d:answer,correct:true},...uniqueVisualDescs(wrong).filter(d=>!visualEquals(d,answer)).slice(0,level<3?2:3).map(d=>({d,correct:false}))])};
}
function taskMissingCell(c,rng,level){const s=missingCellScenario(rng,level),grid=el('div','game-pattern-grid');grid.style.setProperty('--cols',s.cols);s.cells.forEach((d,i)=>{const cell=el('div','game-pattern-cell');cell.innerHTML=i===s.missing?'<span class="game-question">?</span>':shapeSvg(d,{size:s.cols===3?50:64});grid.append(cell)});c.root.append(grid);mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:62}),correct:x.correct,label:`Pieza ${i+1}`})))}

// 6 Matriz ------------------------------------------------------------------
function matrixScenario(rng,level){
  const profiles=[['ADD','ADD'],['FILL','FILL'],['ROTATE','ROTATE'],['MOVE','MOVE'],['ROTATE','FILL'],['ADD','ROTATE'],['MIRROR','ROTATE'],['ROTATE','MIRROR'],['MOVE','MIRROR']],ops=profiles[level-1],starts=[];
  for(let r=0;r<3;r++){let d=canonicalGlyph(['L','T','chevron'][r],{fill:r%2?'outline':'solid',rotation:0,count:1,countVisible:ops.includes('ADD'),mark:ops.includes('MOVE')?'dot':'none',markPos:'top'});if(ops.includes('MIRROR'))d.shape='L';starts.push(d)}
  const cells=[];for(const st of starts){const b=applyOp(st,ops[0]),c=applyOp(b,ops[1]);cells.push(st,b,c)}const answer=cells[8],wrong=[];const addWrong=d=>!visualEquals(d,answer)&&addVisualUnique(wrong,d);addWrong(applyOp(cells[6],ops[1]));addWrong(applyOp(cells[7],ops[0]));for(const t of ['fill','rotation','shape','markPos'])addWrong(mutateDesc(answer,rng,t));let guard=0;while(wrong.length<3&&guard++<100){for(const d of visualVariants(answer,rng,['shape','fill','rotation'],2))addWrong(d)}if(wrong.length<3)throw new Error('MATRIX_DISTRACTORS');return {cells,missing:8,answer,ops,items:rng.shuffle([{d:answer,correct:true},...wrong.slice(0,3).map(d=>({d,correct:false}))])};
}
function taskMatrix(c,rng,level){const s=matrixScenario(rng,level),grid=el('div','game-pattern-grid matrix');grid.style.setProperty('--cols',3);s.cells.forEach((d,i)=>{const cell=el('div','game-pattern-cell');cell.innerHTML=i===8?'<span class="game-question">?</span>':shapeSvg(d,{size:48});grid.append(cell)});c.root.append(grid);mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:58}),correct:x.correct,label:`Pieza ${i+1}`})))}

// 7 Giro --------------------------------------------------------------------
function rotationScenario(rng,level){
  const n=[3,4,4,5,5,6,6,7,8][level-1],target=canonicalGlyph('L',{fill:rng.bool()?'solid':'outline',rotation:rng.pick(DIRS),mark:level>=3?rng.pick(['dot','bar','two']):'none',markPos:rng.pick(['top','right','bottom','left']),count:level>=6?rng.int(1,3):1,countVisible:level>=6}),targetIdentity=rotationInvariantVisualSignature(target),step=rng.pick([90,180,270]),correct={...target,rotation:mod(target.rotation+step,360)},wrong=[];
  const addWrong=d=>{d={...d,rotation:rng.pick(DIRS)};if(rotationInvariantVisualSignature(d)===targetIdentity)return false;return addVisualUnique(wrong,d)};
  for(const sh of ['T','chevron','triangle','bar'])addWrong({...target,shape:sh,mirror:false});addWrong({...target,fill:target.fill==='solid'?'outline':'solid'});addWrong({...target,mirror:!target.mirror});
  if(target.mark!=='none'){for(const mark of ['dot','bar','two'])if(mark!==target.mark)addWrong({...target,mark});for(const pos of ['top','right','bottom','left'])if(pos!==target.markPos)addWrong({...target,markPos:pos})}else addWrong({...target,mark:'dot',markPos:'top'});
  if(target.countVisible){for(const count of [1,2,3,4])if(count!==target.count)addWrong({...target,count})}
  let guard=0;while(wrong.length<n-1&&guard++<500){let d=canonicalGlyph(rng.pick(['L','T','chevron','triangle','bar']),{fill:rng.bool()?'solid':'outline',rotation:rng.pick(DIRS),mirror:rng.bool(.3),mark:level>=3?rng.pick(['none','dot','bar','two']):'none',markPos:rng.pick(['top','right','bottom','left']),count:level>=6?rng.int(1,4):1,countVisible:level>=6});addWrong(d)}
  if(wrong.length<n-1)throw new Error('ROTATION_DISTRACTORS');const items=[{d:correct,correct:true},...wrong.slice(0,n-1).map(d=>({d,correct:false}))];if(items.filter(x=>rotationInvariantVisualSignature(x.d)===targetIdentity).length!==1)throw new Error('ROTATION_IDENTITY_AMBIGUOUS');return {target,items:rng.shuffle(items),targetIdentity};
}
function taskRotation(c,rng,level){const s=rotationScenario(rng,level);addReference(c.root,shapeSvg(s.target,{size:96,label:'Figura original'}));mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:58}),correct:x.correct,label:`Giro ${i+1}`})))}

// 8 Espejo ------------------------------------------------------------------
function mirrorAcross(d,axis){if(axis==='vertical')return applyOp(d,'MIRROR');const x=applyOp(d,'MIRROR');x.rotation=mod(x.rotation+180,360);return x}
function mirrorScenario(rng,level){
  const axis=level>=6&&rng.bool()?'horizontal':'vertical',target=canonicalGlyph('L',{fill:rng.bool()?'solid':'outline',rotation:rng.pick(DIRS),mark:level>=5?'dot':'none',markPos:rng.pick(['top','right','bottom','left'])}),correct=mirrorAcross(target,axis),count=[3,3,3,4,4,6,6,7,8][level-1],wrong=[];
  for(const r of DIRS)addVisualUnique(wrong,{...target,rotation:r,mirror:false});addVisualUnique(wrong,mirrorAcross(target,axis==='vertical'?'horizontal':'vertical'));for(const r of DIRS)addVisualUnique(wrong,{...correct,rotation:r});const filtered=wrong.filter(d=>!visualEquals(d,correct));if(filtered.length<count-1)filtered.push(...visualVariants(correct,rng,['fill','shape'],count-1-filtered.length));const items=[{d:correct,correct:true},...uniqueVisualDescs(filtered).filter(d=>!visualEquals(d,correct)).slice(0,count-1).map(d=>({d,correct:false}))];ensureSingleVisualCorrect(items);return {axis,target,items:rng.shuffle(items)};
}
function taskMirror(c,rng,level){const s=mirrorScenario(rng,level);addReference(c.root,`<div class="mirror-ref">${shapeSvg(s.target,{size:88,label:'Figura frente al espejo'})}<span class="mirror-axis ${s.axis}"></span></div>`);mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:58}),correct:x.correct,label:`Reflejo ${i+1}`})))}

// 9 Pieza Que Encaja ---------------------------------------------------------
const MASKS=['111110000','111101000','111100100','111010010','110011010','110011001','110010011','010111010'];
function maskSvg(mask,{hole=false,size=92}={}){const cell=24,body=[],pts=[];for(let i=0;i<9;i++)if(mask[i]==='1')pts.push([Math.floor(i/3),i%3]);const cr=pts.reduce((a,p)=>a+p[0],0)/pts.length,cc=pts.reduce((a,p)=>a+p[1],0)/pts.length,tx=(1-cc)*cell,ty=(1-cr)*cell;for(const [r,c] of pts){const x=c*cell+8,y=r*cell+8;body.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="5"/>`)}return `<svg class="fit-piece ${hole?'hole':''}" role="img" aria-label="${hole?'Hueco':'Pieza'}" viewBox="0 0 88 88" width="${size}" height="${size}"><g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)})">${body.join('')}</g></svg>`}
function maskDistance(a,b){let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n}
function pieceFitScenario(rng,level){const correct=rng.pick(MASKS),n=[3,3,4,4,5,5,6,6,7][level-1],pool=MASKS.filter(x=>x!==correct).sort((a,b)=>maskDistance(a,correct)-maskDistance(b,correct));let candidates;if(level===1)candidates=pool.slice(-(n-1));else if(level===2)candidates=[pool[Math.floor(pool.length/2)],pool.at(-1)].filter(Boolean);else if(level<=4)candidates=rng.shuffle(pool.slice(Math.max(0,pool.length-5))).slice(0,n-1);else if(level<=6)candidates=rng.shuffle(pool).slice(0,n-1);else candidates=pool.slice(0,n-1);return {correct,items:rng.shuffle([{m:correct,correct:true},...candidates.map(m=>({m,correct:false}))])}}

function taskPieceFit(c,rng,level){const s=pieceFitScenario(rng,level);addReference(c.root,`<div class="fit-board">${maskSvg(s.correct,{hole:true,size:128})}</div>`);mountChoiceGrid(c,s.items.map((x,i)=>({html:maskSvg(x.m,{size:60}),correct:x.correct,label:`Pieza ${i+1}`})))}

// 10 Salida del Laberinto -----------------------------------------------------
function mazeScenario(rng,level){
  const profile=[{exits:2,cols:4,branches:1,depth:1},{exits:2,cols:5,branches:1,depth:2},{exits:3,cols:5,branches:2,depth:1},{exits:3,cols:6,branches:2,depth:2},{exits:3,cols:6,branches:3,depth:2},{exits:4,cols:6,branches:3,depth:2},{exits:4,cols:7,branches:4,depth:2},{exits:4,cols:7,branches:4,depth:3},{exits:4,cols:8,branches:5,depth:3}][level-1],{exits,cols}=profile,lanes=Array.from({length:exits+1},(_,i)=>30+i*(160/exits)),correctExit=rng.int(0,exits-1),exitYs=Array.from({length:exits},(_,i)=>42+i*(136/Math.max(1,exits-1))),dx=242/(cols-1),points=[];
  let lane=rng.int(0,lanes.length-1);for(let i=0;i<cols;i++){if(i===cols-1){points.push({x:38+i*dx,y:exitYs[correctExit]});continue}if(i&&rng.bool(.72))lane=clamp(lane+rng.pick([-1,1]),0,lanes.length-1);points.push({x:38+i*dx,y:lanes[lane]})}
  const segments=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],mx=(a.x+b.x)/2;segments.push([a,{x:mx,y:a.y}],[{x:mx,y:a.y},{x:mx,y:b.y}],[{x:mx,y:b.y},b])}segments.push([points.at(-1),{x:302,y:exitYs[correctExit]}]);
  const branches=[],used=new Set();for(let tries=0;branches.length<profile.branches&&tries<300;tries++){
    const i=rng.int(0,points.length-2);if(used.has(i))continue;const p=points[i],next=points[i+1],other=rng.shuffle(lanes.filter(y=>Math.abs(y-p.y)>20));if(!other.length)continue;const by=other[0],endX=p.x+(next.x-p.x)*rng.pick(profile.depth>=2?[.30,.40,.44]:[.30,.38]),branch=[[p,{x:p.x,y:by}],[{x:p.x,y:by},{x:endX,y:by}]];if(profile.depth>=2){const ty=clamp(by+(rng.bool()?24:-24),22,198);branch.push([{x:endX,y:by},{x:endX,y:ty}]);if(profile.depth>=3){const ex=endX+(next.x-p.x)*.03;branch.push([{x:endX,y:ty},{x:ex,y:ty}])}}branches.push(branch);used.add(i)
  }
  if(branches.length!==profile.branches)throw new Error('MAZE_BRANCH_LAYOUT');return {exits,correctExit,exitYs,segments,branches,profile};
}
function mazeSvg(s){let body=s.segments.map(([a,b])=>`<path class="maze-main" d="M${a.x} ${a.y} L${b.x} ${b.y}"/>`).join('');body+=s.branches.flat().map(([a,b])=>`<path class="maze-decoy" d="M${a.x} ${a.y} L${b.x} ${b.y}"/>`).join('');for(let i=0;i<s.exits;i++)body+=`<circle cx="302" cy="${s.exitYs[i]}" r="9" class="maze-exit"/><text x="302" y="${s.exitYs[i]+4}" text-anchor="middle">${i+1}</text>`;return svgWrap(body,'0 0 320 220','game-diagram maze','Laberinto con salidas numeradas')}
function taskMaze(c,rng,level){const s=mazeScenario(rng,level);addReference(c.root,mazeSvg(s));mountChoiceGrid(c,rng.shuffle(Array.from({length:s.exits},(_,i)=>({html:`<strong>Salida ${i+1}</strong>`,correct:i===s.correctExit,label:`Salida ${i+1}`}))))}

// 11 Circuito Roto -----------------------------------------------------------
function graphConnected(n,edges,start,goal){const adj=Array.from({length:n},()=>[]);for(const [a,b] of edges){adj[a].push(b);adj[b].push(a)}const seen=new Set([start]),q=[start];while(q.length){const x=q.shift();if(x===goal)return true;for(const y of adj[x])if(!seen.has(y)){seen.add(y);q.push(y)}}return false}
function circuitScenario(rng,level){
  // Two planar ladder components separated by one vertical cut. The only
  // candidate that crosses that cut is the repair; every decoy is a missing
  // vertical rung entirely inside one component, so the drawing and graph
  // always describe the same topology.
  const profile=[{cols:5,desired:2},{cols:5,desired:3},{cols:6,desired:3},{cols:6,desired:4},{cols:7,desired:4},{cols:7,desired:5},{cols:8,desired:5},{cols:8,desired:6},{cols:9,desired:7}][level-1],cols=profile.cols,node=(row,col)=>row*cols+col,n=cols*2,gap=rng.int(1,cols-2),nodes=Array.from({length:n},(_,i)=>({id:i,row:Math.floor(i/cols),col:i%cols,x:34+(i%cols)*(252/(cols-1)),y:60+Math.floor(i/cols)*108})),edges=[];
  for(let row=0;row<2;row++)for(let col=0;col<cols-1;col++)if(col!==gap)edges.push([node(row,col),node(row,col+1)]);
  edges.push([node(0,0),node(1,0)],[node(0,cols-1),node(1,cols-1)]);
  const start=node(0,0),goal=node(0,cols-1),correct=[node(0,gap),node(0,gap+1)],edgeKey=e=>e.slice().sort((a,b)=>a-b).join('-'),baseSet=new Set(edges.map(edgeKey)),desired=profile.desired;
  if(graphConnected(n,edges,start,goal))throw new Error('CIRCUIT_BASE_ALREADY_CONNECTED');
  const candidates=[correct],safeRungs=[];
  for(let col=1;col<cols-1;col++){const e=[node(0,col),node(1,col)];if(!baseSet.has(edgeKey(e)))safeRungs.push(e)}
  for(const e of rng.shuffle(safeRungs)){if(candidates.length>=desired)break;candidates.push(e)}
  if(candidates.length<desired)throw new Error('CIRCUIT_SAFE_CANDIDATES');
  const results=candidates.map(e=>graphConnected(n,[...edges,e],start,goal));if(results.filter(Boolean).length!==1||!results[0])throw new Error('CIRCUIT_NOT_SINGLE_REPAIR');return {nodes,edges,candidates,start,goal,correctIndex:0,gap};
}
function circuitSvg(s){
  let body=s.edges.map(([ai,bi])=>{const a=s.nodes[ai],b=s.nodes[bi];return `<path class="circuit-base" d="M${a.x} ${a.y} L${b.x} ${b.y}"/>`}).join('');
  s.candidates.forEach(([ai,bi],i)=>{const a=s.nodes[ai],b=s.nodes[bi],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ox=-dy/len*11,oy=dx/len*11;body+=`<path class="circuit-candidate c${i}" d="M${a.x} ${a.y} L${b.x} ${b.y}"/><circle class="circuit-label-bg" cx="${mx+ox}" cy="${my+oy}" r="10"/><text class="circuit-label" x="${mx+ox}" y="${my+oy+4}" text-anchor="middle">${i+1}</text>`});
  body+=s.nodes.map((p,i)=>`<circle class="circuit-node" cx="${p.x}" cy="${p.y}" r="9"/><text x="${p.x}" y="${p.y+4}" text-anchor="middle">${i===s.start?'S':i===s.goal?'T':''}</text>`).join('');return svgWrap(body,'0 0 320 230','game-diagram circuit','Circuito con puentes candidatos numerados');
}
function taskCircuit(c,rng,level){const s=circuitScenario(rng,level);addReference(c.root,circuitSvg(s));mountChoiceGrid(c,rng.shuffle(s.candidates.map((_,i)=>({html:`<strong>Puente ${i+1}</strong>`,correct:i===s.correctIndex,label:`Puente ${i+1}`}))))}

// 12 Puente Faltante ---------------------------------------------------------
const PORT_SETS=['NS','EW','NE','ES','SW','WN','NEW','NES','ESW','NSW'];
function portObj(k){return {N:k.includes('N'),E:k.includes('E'),S:k.includes('S'),W:k.includes('W')}}
function portDegree(k){const p=portObj(k);return Number(p.N)+Number(p.E)+Number(p.S)+Number(p.W)}
function tilePath(k){const p=portObj(k),a=[];if(p.N)a.push('M44 44 V4');if(p.E)a.push('M44 44 H84');if(p.S)a.push('M44 44 V84');if(p.W)a.push('M44 44 H4');return a.join(' ')}
function tileSvg(k,size=62){return `<svg class="bridge-tile" role="img" aria-label="Pieza con conexiones ${k}" viewBox="0 0 88 88" width="${size}" height="${size}"><rect x="3" y="3" width="82" height="82" rx="14"/><path d="${tilePath(k)}"/></svg>`}
function bridgeScenario(rng,level){
  const degree=level>=7?rng.pick([2,3]):level>=4?(rng.bool(.3)?3:2):2,pool=PORT_SETS.filter(k=>portDegree(k)===degree),correct=rng.pick(pool),n=degree===3?Math.min(4,level>=6?4:3):[3,3,3,4,4,4,4,5,5][level-1],wrong=rng.shuffle(pool.filter(k=>k!==correct)).slice(0,n-1);if(wrong.length<n-1)throw new Error('BRIDGE_POOL');return {correct,items:rng.shuffle([{k:correct,correct:true},...wrong.map(k=>({k,correct:false}))])};
}
function taskBridge(c,rng,level){const s=bridgeScenario(rng,level),ports=portObj(s.correct),marks=['N','E','S','W'].map(dir=>ports[dir]?`<i class="port ${dir.toLowerCase()} open"></i>`:`<i class="port ${dir.toLowerCase()} blocked">×</i>`).join('');addReference(c.root,`<div class="bridge-context"><div class="bridge-hole">${marks}<b>?</b></div></div>`);mountChoiceGrid(c,s.items.map((x,i)=>({html:tileSvg(x.k,56),correct:x.correct,label:`Pieza ${i+1}`})))}

// 13 La Familia --------------------------------------------------------------
function familyScenario(rng,level){
  const shape=rng.pick(['triangle','L','T','chevron']),exampleN=[2,3,3,4,4,4,5,5,6][level-1],n=[3,4,5,5,6,6,7,8,9][level-1],examples=[],states=[];
  for(const fill of ['solid','outline'])for(const rotation of DIRS)for(const mark of (level>=5?['none','dot','bar']:['none']))for(const markPos of ['top','right','bottom','left'])states.push(canonicalGlyph(shape,{fill,rotation,mark,markPos}));
  for(const d of rng.shuffle(states)){if(examples.length>=exampleN)break;addVisualUnique(examples,d)}
  let correct=null;for(const d of rng.shuffle(states)){if(examples.every(x=>!visualEquals(x,d))){correct=d;break}}if(!correct)throw new Error('FAMILY_CORRECT_NOVEL');
  const wrong=[],sharedPool=PLAIN_SHAPES.filter(sh=>sh!==shape);let guard=0;while(wrong.length<n-1&&guard++<1500){const d=glyph(rng,{shapes:sharedPool,mark:level>=6?'random':'none'});addVisualUnique(wrong,d)}if(wrong.length!==n-1)throw new Error('FAMILY_POOL');return {shape,examples,items:rng.shuffle([{d:correct,correct:true},...wrong.map(d=>({d,correct:false}))])};
}
function taskFamily(c,rng,level){const s=familyScenario(rng,level);addReference(c.root,`<div class="family-examples">${s.examples.map(d=>shapeSvg(d,{size:56})).join('')}</div><span class="game-ref-caption">MISMA ESTRUCTURA · LOS DETALLES PUEDEN CAMBIAR</span>`);mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:60}),correct:x.correct,label:`Figura ${i+1}`})))}

// 14 Filtro Doble ------------------------------------------------------------
function doubleFilterScenario(rng,level){
  const targetShape=rng.pick(DIRECTIONAL),targetFill=rng.bool()?'solid':'outline',n=[4,4,5,5,6,6,8,9,12][level-1],items=[],wrongShapes=PLAIN_SHAPES.filter(s=>s!==targetShape);
  const push=(shape,fill,correct=false)=>{let guard=0;while(guard++<100){const d=glyph(rng,{shape,fill,mark:level>=7?'random':'none'});if(!items.some(x=>visualSignature(x.d)===visualSignature(d))){items.push({d,correct});return true}}return false};
  push(targetShape,targetFill,true);push(targetShape,targetFill==='solid'?'outline':'solid');push(rng.pick(wrongShapes),targetFill);push(rng.pick(wrongShapes),targetFill==='solid'?'outline':'solid');
  while(items.length<n){const cls=rng.int(0,2);if(cls===0)push(targetShape,targetFill==='solid'?'outline':'solid');else if(cls===1)push(rng.pick(wrongShapes),targetFill);else push(rng.pick(wrongShapes),targetFill==='solid'?'outline':'solid')}
  const correctSig=visualSignature(items.find(x=>x.correct).d);if(items.filter(x=>visualSignature(x.d)===correctSig).length!==1)throw new Error('DOUBLE_FILTER_VISUAL_DUP');return {shape:targetShape,fill:targetFill,items:rng.shuffle(items)};
}
function taskDoubleFilter(c,rng,level){const s=doubleFilterScenario(rng,level);addReference(c.root,`<div class="double-filter-cues"><div>${shapeSvg(canonicalGlyph(s.shape,{fill:'outline'}),{size:62})}<span>FORMA</span></div><div class="filter-fill ${s.fill}"><span>${s.fill==='solid'?'●':'○'}</span><small>RELLENO</small></div></div>`);mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:s.items.length>=10?48:58}),correct:x.correct,label:`Opción ${i+1}`})))}

// 15 Regla Secreta -----------------------------------------------------------
function secretRuleScenario(rng,level){
  let positives=[],negatives=[],candidates=[],matches;
  if(level===1){const sh=rng.pick(DIRECTIONAL);matches=d=>d.shape===sh;positives=[canonicalGlyph(sh,{fill:'solid',rotation:0}),canonicalGlyph(sh,{fill:'outline',rotation:90}),canonicalGlyph(sh,{fill:'solid',rotation:180})];negatives=[canonicalGlyph(rng.pick(PLAIN_SHAPES.filter(s=>s!==sh)),{fill:'solid'}),canonicalGlyph(rng.pick(PLAIN_SHAPES.filter(s=>s!==sh)),{fill:'outline',rotation:90}),canonicalGlyph(rng.pick(PLAIN_SHAPES.filter(s=>s!==sh)),{fill:'solid',rotation:180})]}
  else if(level===2){const fill=rng.bool()?'solid':'outline';matches=d=>d.fill===fill;positives=['L','T','chevron'].map((sh,i)=>canonicalGlyph(sh,{fill,rotation:i*90}));negatives=['L','T','chevron'].map((sh,i)=>canonicalGlyph(sh,{fill:fill==='solid'?'outline':'solid',rotation:i*90}))}
  else if(level===3){const rot=rng.pick(DIRS),shapes=['L','T','chevron'],fills=['solid','outline','solid'];matches=d=>mod(d.rotation,360)===rot;positives=shapes.map((sh,i)=>canonicalGlyph(sh,{rotation:rot,fill:fills[i]}));negatives=shapes.map((sh,i)=>canonicalGlyph(sh,{rotation:mod(rot+[90,180,270][i],360),fill:fills[i]}))}
  else if(level===4){const count=rng.int(1,3),shapes=['L','T','chevron'],fills=['solid','outline','solid'],rots=[0,90,180],other=[1,2,3].filter(n=>n!==count);matches=d=>d.countVisible&&d.count===count;positives=shapes.map((sh,i)=>canonicalGlyph(sh,{count,countVisible:true,fill:fills[i],rotation:rots[i]}));negatives=shapes.map((sh,i)=>canonicalGlyph(sh,{count:other[i%other.length],countVisible:true,fill:fills[i],rotation:rots[i]}))}
  else if(level===5){const pos=rng.pick(['top','right','bottom','left']),others=['top','right','bottom','left'].filter(p=>p!==pos),shapes=['L','T','chevron'],marks=['dot','bar','two'],fills=['solid','outline','solid'];matches=d=>d.mark!=='none'&&d.markPos===pos;positives=shapes.map((sh,i)=>canonicalGlyph(sh,{mark:marks[i],markPos:pos,fill:fills[i],rotation:i*90}));negatives=shapes.map((sh,i)=>canonicalGlyph(sh,{mark:marks[i],markPos:others[i],fill:fills[i],rotation:i*90}))}
  else if(level===6){const sh=rng.pick(DIRECTIONAL),fill=rng.bool()?'solid':'outline';matches=d=>d.shape===sh&&d.fill===fill;positives=[canonicalGlyph(sh,{fill,rotation:0}),canonicalGlyph(sh,{fill,rotation:90}),canonicalGlyph(sh,{fill,rotation:180})];negatives=[canonicalGlyph(sh,{fill:fill==='solid'?'outline':'solid'}),canonicalGlyph(rng.pick(PLAIN_SHAPES.filter(s=>s!==sh)),{fill}),canonicalGlyph(rng.pick(PLAIN_SHAPES.filter(s=>s!==sh)),{fill:fill==='solid'?'outline':'solid'})]}
  else if(level===7||level===8){const modulus=level===7?2:3,target=level===7?rng.int(0,1):rng.int(0,2);matches=d=>((mod(d.rotation,360)/90+d.count)%modulus)===target;const domain=[];for(const r of DIRS)for(const count of [1,2,3])domain.push(canonicalGlyph('L',{rotation:r,count,countVisible:true}));const posPool=domain.filter(matches),negPool=domain.filter(d=>!matches(d)),pickCoverage=(pool,want)=>{const out=[];for(const count of [1,2,3]){const d=pool.find(x=>x.count===count&&!out.some(y=>visualEquals(x,y)));if(d)addVisualUnique(out,d)}for(const r of DIRS){if(out.length>=want)break;const d=pool.find(x=>x.rotation===r&&!out.some(y=>visualEquals(x,y)));if(d)addVisualUnique(out,d)}for(const d of rng.shuffle(pool)){if(out.length>=want)break;addVisualUnique(out,d)}return out.slice(0,want)};positives=pickCoverage(posPool,4);negatives=pickCoverage(negPool,4)}
  else{matches=d=>(d.count===2)===(d.fill==='solid');positives=[canonicalGlyph('L',{count:2,countVisible:true,fill:'solid'}),canonicalGlyph('T',{count:1,countVisible:true,fill:'outline'}),canonicalGlyph('chevron',{count:3,countVisible:true,fill:'outline'})];negatives=[canonicalGlyph('L',{count:2,countVisible:true,fill:'outline'}),canonicalGlyph('T',{count:1,countVisible:true,fill:'solid'}),canonicalGlyph('chevron',{count:3,countVisible:true,fill:'solid'})]}
  const n=[4,4,4,4,4,5,5,5,6][level-1],allDomain=[];
  // Build the finite high-level domains directly. The old rejection loop kept
  // asking for 80 unique states from domains containing only 12–24 states.
  if(level===7||level===8){for(const r of DIRS)for(const count of [1,2,3])allDomain.push(canonicalGlyph('L',{rotation:r,count,countVisible:true,fill:'solid'}))}
  else if(level===9){for(const sh of ['L','T','chevron'])for(const count of [1,2,3])for(const fill of ['solid','outline'])allDomain.push(canonicalGlyph(sh,{count,countVisible:true,fill}))}
  else{let guard=0;while(allDomain.length<36&&guard++<900){const d=glyph(rng,{shapes:DIRECTIONAL,mark:level===5?'random':'none',count:level===4?rng.int(1,3):1,countVisible:level===4});if(level===5&&d.mark==='none')d.mark='dot';addVisualUnique(allDomain,d)}}
  const correctPool=allDomain.filter(matches),wrongPool=allDomain.filter(d=>!matches(d));if(!correctPool.length||wrongPool.length<n-1)throw new Error('SECRET_RULE_POOL');const correct=rng.pick(correctPool);candidates=[{d:correct,correct:true}];for(const d of rng.shuffle(wrongPool)){if(candidates.length>=n)break;if(!candidates.some(x=>visualSignature(x.d)===visualSignature(d)))candidates.push({d,correct:false})}if(candidates.length!==n)throw new Error('SECRET_RULE_CANDIDATES');return {positives:uniqueVisualDescs(positives),negatives:uniqueVisualDescs(negatives),items:rng.shuffle(candidates),matches};
}
function taskSecretRule(c,rng,level){const s=secretRuleScenario(rng,level);addReference(c.root,`<div class="secret-evidence">${s.positives.map(d=>`<div><b>✓</b>${shapeSvg(d,{size:52})}</div>`).join('')}${s.negatives.map(d=>`<div><b>✕</b>${shapeSvg(d,{size:52})}</div>`).join('')}</div>`);mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:58}),correct:x.correct,label:`Opción ${i+1}`})))}

// 16 Cuenta ------------------------------------------------------------------
function countScenario(rng,level){
  const range=[[2,5],[3,6],[3,6],[4,7],[5,8],[5,8],[6,10],[8,12],[9,14]][level-1],targetN=rng.int(...range),criterion=level<3?'ALL':level<6?'SHAPE':'SHAPE_ORIENTATION',target=canonicalGlyph(rng.pick(DIRECTIONAL),{rotation:rng.pick(DIRS),fill:'solid'}),items=[];
  for(let i=0;i<targetN;i++){const d={...target};if(criterion==='SHAPE')d.rotation=rng.pick(DIRS);items.push(d)}
  const clutter=criterion==='ALL'?0:rng.int(level<6?3:4,level<8?7:9);let sameShapeAny=targetN,guard=0;while(items.length<targetN+clutter&&guard++<500){let d=canonicalGlyph(rng.pick(PLAIN_SHAPES),{rotation:rng.pick(DIRS),fill:rng.bool()?'solid':'outline'});if(criterion==='SHAPE'){if(d.shape===target.shape)continue}else if(criterion==='SHAPE_ORIENTATION'){const exact=d.shape===target.shape&&mod(d.rotation,360)===mod(target.rotation,360);if(exact)continue;if(d.shape===target.shape)sameShapeAny++}items.push(d)}
  const answerCount=level<3?4:5,vals=new Set([targetN]),minV=1,maxV=Math.max(targetN+4,items.length+1),pool=[];for(let v=minV;v<=maxV;v++)if(v!==targetN&&v!==sameShapeAny)pool.push(v);for(const v of rng.shuffle(pool)){if(vals.size>=answerCount)break;vals.add(v)}if(vals.size!==answerCount)throw new Error('COUNT_ANSWER_POOL');return {targetN,criterion,target,items:rng.shuffle(items),answers:rng.shuffle([...vals]),sameShapeAny};
}
function taskCount(c,rng,level){const s=countScenario(rng,level);if(s.criterion==='SHAPE')addReference(c.root,`<div class="count-cue">Cuenta esta forma en cualquier giro: ${shapeSvg({...s.target,rotation:0},{size:46})}</div>`);else if(s.criterion==='SHAPE_ORIENTATION')addReference(c.root,`<div class="count-cue">Cuenta exactamente esta forma y giro: ${shapeSvg(s.target,{size:46})}</div>`);else taskCaption(c.root,'Cuenta todas las figuras.');const field=el('div','count-field'),positions=safeScatter(rng,s.items.length,{xMin:7,xMax:93,yMin:9,yMax:91,aspectBias:1.72}),itemSize=level>=8?30:level>=6?34:40;s.items.forEach((d,i)=>{const a=el('span','count-item');a.innerHTML=shapeSvg(d,{size:itemSize});a.style.left=`${positions[i].x}%`;a.style.top=`${positions[i].y}%`;field.append(a)});c.root.append(field);mountChoiceGrid(c,s.answers.map(v=>({html:`<strong class="number-answer">${v}</strong>`,correct:v===s.targetN,label:`Número ${v}`})))}

// 17 ¿Cuál Tiene Más? --------------------------------------------------------
function groupHtml(n,desc){const max=16;return `<div class="quantity-group fixed-grid" aria-hidden="true">${Array.from({length:max},(_,i)=>i<n?shapeSvg(desc,{size:28}):'<span class="quantity-empty"></span>').join('')}</div>`}
function moreScenario(rng,level){
  const p=[{g:2,min:4,max:6,gaps:[2,3]},{g:2,min:5,max:8,gaps:[1,2]},{g:3,min:5,max:8,gaps:[2]},{g:3,min:6,max:10,gaps:[2,3]},{g:3,min:7,max:11,gaps:[1,2]},{g:3,min:8,max:12,gaps:[1]},{g:4,min:8,max:12,gaps:[2]},{g:4,min:10,max:14,gaps:[1,2]},{g:4,min:12,max:16,gaps:[1]}][level-1],groups=p.g,winner=rng.int(0,groups-1),top=rng.int(p.min,p.max),gap=rng.pick(p.gaps),counts=Array(groups).fill(0);counts[winner]=top;const secondIndex=(winner+rng.int(1,groups-1))%groups;counts[secondIndex]=top-gap;for(let i=0;i<groups;i++)if(i!==winner&&i!==secondIndex){const hi=Math.max(1,top-gap-1),lo=Math.max(1,Math.min(hi,top-5));counts[i]=rng.int(lo,hi)}return {counts,winner,desc:canonicalGlyph(rng.pick(['circle','square','triangle','diamond']),{fill:'solid'}),profile:p};
}
function taskMore(c,rng,level){const s=moreScenario(rng,level),items=s.counts.map((n,i)=>({n,correct:i===s.winner}));const shuffled=rng.shuffle(items);mountChoiceGrid(c,shuffled.map((x,i)=>({html:groupHtml(x.n,s.desc),correct:x.correct,label:`Grupo ${i+1}`})),{gridClass:'quantity-choice-grid'})}

// 18 Balanza -----------------------------------------------------------------
function numericCandidates(rng,answer,count,max=12){const vals=new Set([answer]),pool=[];for(let v=1;v<=max;v++)if(v!==answer)pool.push(v);for(const v of rng.shuffle(pool)){if(vals.size>=count)break;vals.add(v)}if(vals.size!==count)throw new Error('NUMERIC_CANDIDATES');return rng.shuffle([...vals])}
function balanceScenario(rng,level){
  const shapes=rng.shuffle(['circle','square','triangle','diamond','L','T','chevron']),A=canonicalGlyph(shapes[0],{fill:'solid'}),B=canonicalGlyph(shapes[1],{fill:'outline'}),profiles=[[[2,1],2],[[3,1],2],[[2,1],3],[[3,2],2],[[4,3],2],[[5,2],2],[[3,2],3],[[4,3],3],[[5,3],3]],entry=profiles[level-1],[p,q]=entry[0],k=entry[1],leftCount=p*k,answer=q*k,candidateCount=level<=2?4:level<=6?5:6,answers=numericCandidates(rng,answer,candidateCount,Math.max(18,answer+7));return {A,B,p,q,leftCount,answer,answers};
}
function symbolTimes(n,d,size=32){return `<span class="balance-count">${n} ×</span>${shapeSvg(d,{size})}`}
function taskBalance(c,rng,level){const s=balanceScenario(rng,level);addReference(c.root,`<div class="balance-equation"><div>${symbolTimes(s.p,s.A,38)}</div><span>=</span><div>${symbolTimes(s.q,s.B,38)}</div></div><div class="balance-scale"><div>${symbolTimes(s.leftCount,s.A,34)}</div><span>⚖</span><div class="game-question">?</div></div>`);mountChoiceGrid(c,s.answers.map(v=>({html:`<div class="balance-answer">${symbolTimes(v,s.B,31)}</div>`,correct:v===s.answer,label:`${v} símbolos`})))}

// 19 A → B ------------------------------------------------------------------
function transformInput(rng){return canonicalGlyph('L',{fill:rng.bool()?'solid':'outline',rotation:rng.pick(DIRS),mark:'dot',markPos:rng.pick(['top','right','bottom','left']),count:rng.int(1,3),countVisible:true})}
function aToBScenario(rng,level){
  const baseOps=['ADD','FILL','ROTATE','MIRROR','MOVE'],allOps=[...baseOps,'ROTATE_CCW'],pool=level>=8?allOps:baseOps,op=level<6?baseOps[level-1]:rng.pick(pool),candidateN=[4,4,4,4,4,4,5,5,6][level-1];let a,b,c0,answer,guard=0;
  do{a=transformInput(rng);if(op==='ADD'&&a.count>=5)a.count=2;b=applyOp(a,op);guard++}while((visualEquals(a,b)||pool.filter(o=>visualEquals(applyOp(a,o),b)).length!==1)&&guard<150);if(guard>=150)throw new Error('A_TO_B_AMBIGUOUS_EXAMPLE');guard=0;
  do{c0=transformInput(rng);if(op==='ADD'&&c0.count>=5)c0.count=2;answer=applyOp(c0,op);guard++}while(visualEquals(c0,answer)&&guard<100);
  const items=[{d:answer,correct:true,op}];for(const o of rng.shuffle(pool.filter(o=>o!==op))){const d=applyOp(c0,o);if(!items.some(x=>visualSignature(x.d)===visualSignature(d)))items.push({d,correct:false,op:o});if(items.length>=candidateN)break}if(items.length<candidateN)throw new Error('A_TO_B_CANDIDATES');ensureSingleVisualCorrect(items);return {a,b,c0,op,items:rng.shuffle(items),pool};
}
function taskAToB(c,rng,level){const s=aToBScenario(rng,level);addReference(c.root,`<div class="a-to-b"><div>${shapeSvg(s.a,{size:62})}<span>→</span>${shapeSvg(s.b,{size:62})}</div><div>${shapeSvg(s.c0,{size:62})}<span>→</span><b>?</b></div></div>`);mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:56}),correct:x.correct,label:`Resultado ${i+1}`})))}

// 20 Cadena de Operadores ----------------------------------------------------
function chainProfile(level,rng){
  // From L3 onward every profile contains an order-sensitive spatial pair.
  // Cosmetic/value operators may be added, but never replace that dependency.
  const profiles=[['ROTATE'],['FILL'],['ROTATE','MIRROR'],['MIRROR','ROTATE'],['ROTATE','MIRROR','FILL'],['MIRROR','ROTATE','ADD'],['ROTATE','MIRROR','MOVE'],['MIRROR','ROTATE','ADD','FILL'],['ROTATE','ROTATE','MIRROR','ROTATE_CCW']];
  return [...profiles[level-1]];
}
function chainScenario(rng,level){
  const ops=chainProfile(level,rng);let initial,answer,guard=0;do{initial=transformInput(rng);if(ops.includes('ADD')&&initial.count>=4)initial.count=1;answer=applyOps(initial,ops);guard++}while((visualEquals(initial,answer)||(level>=3&&visualEquals(answer,applyOps(initial,[...ops].reverse()))))&&guard<100);if(guard>=100)throw new Error('CHAIN_ORDER_NOT_VISIBLE');
  const wrong=[],push=d=>{if(!visualEquals(d,answer))addVisualUnique(wrong,d)};let st=cloneDesc(initial);for(let i=0;i<ops.length-1;i++){st=applyOp(st,ops[i]);push(st)}
  if(ops.length>1)push(applyOps(initial,[...ops].reverse()));
  for(let skip=0;skip<ops.length;skip++)push(applyOps(initial,ops.filter((_,i)=>i!==skip)));
  for(let i=0;i<ops.length;i++){const alt=[...ops],options=['ROTATE','ROTATE_CCW','MIRROR','FILL','ADD','MOVE'].filter(o=>o!==ops[i]);alt[i]=rng.pick(options);push(applyOps(initial,alt))}
  const need=level<=2?3:level<=5?4:5;if(wrong.length<need-1)wrong.push(...visualVariants(answer,rng,['shape','fill','rotation'],need-1-wrong.length));const items=[{d:answer,correct:true},...uniqueVisualDescs(wrong).filter(d=>!visualEquals(d,answer)).slice(0,need-1).map(d=>({d,correct:false}))];if(items.length!==need)throw new Error('CHAIN_CANDIDATE_COUNT');return {initial,ops,answer,items:rng.shuffle(items)};
}
function taskOperatorChain(c,rng,level){const s=chainScenario(rng,level);addReference(c.root,`<div class="operator-chain"><div>${shapeSvg(s.initial,{size:64})}</div>${s.ops.map(o=>`<span>↓</span><div class="operator-card">${opGlyph(o)}</div>`).join('')}<span>↓</span><b>?</b></div>`);mountChoiceGrid(c,s.items.map((x,i)=>({html:shapeSvg(x.d,{size:54}),correct:x.correct,label:`Resultado ${i+1}`})))}

// 21 Permutación -------------------------------------------------------------
function permutationTokens(rng,n){return genUniqueShapes(rng,n,{directional:true,mark:false,simple:true,coarse:true,shapes:['L','T','chevron','triangle','bar']})}
function identityPerm(n){return Array.from({length:n},(_,i)=>i)}
function applyPerm(state,perm){const out=new Array(state.length);for(let src=0;src<state.length;src++)out[perm[src]]=state[src];return out}
function composePerms(n,stages){let s=identityPerm(n);for(const p of stages)s=applyPerm(s,p);return s}
function permEqual(a,b){return a.join(',')===b.join(',')}
function randomPerm(rng,n){let p=rng.shuffle(identityPerm(n));if(permEqual(p,identityPerm(n)))[p[0],p[1]]=[p[1],p[0]];return p}
function permutationScenario(rng,level){
  const n=[2,3,3,4,4,4,4,5,6][level-1],objs=permutationTokens(rng,n),initial=rng.shuffle(identityPerm(n)),stageCount=level>=7?2:1,stages=[];
  if(stageCount===1){if(level<=2){const p=identityPerm(n);[p[0],p[n-1]]=[p[n-1],p[0]];stages.push(p)}else if(level<=4){stages.push(identityPerm(n).map((_,i)=>mod(i+1,n)))}else stages.push(randomPerm(rng,n))}
  else{
    let p1,p2,guard=0;do{p1=randomPerm(rng,n);p2=randomPerm(rng,n);guard++}while(permEqual(composePerms(n,[p1,p2]),composePerms(n,[p2,p1]))&&guard<300);if(guard>=300)throw new Error('PERMUTATION_COMMUTES');stages.push(p1,p2)
  }
  let final=[...initial];for(const p of stages)final=applyPerm(final,p);const candidates=[final],addState=s=>{if(!candidates.some(x=>permEqual(x,s)))candidates.push(s)};
  if(stages.length===1){addState(initial);const inv=identityPerm(n);for(let src=0;src<n;src++)inv[stages[0][src]]=src;addState(applyPerm(initial,inv))}else{const near=[...final];if(n>1)[near[0],near[1]]=[near[1],near[0]];addState(near);addState(applyPerm(initial,stages[0]));let rev=[...initial];for(const p of [...stages].reverse())rev=applyPerm(rev,p);addState(rev)}
  const desired=level>=7?4:level>=3?3:2;let guard=0;while(candidates.length<desired&&guard++<500){const w=rng.shuffle(initial);addState(w)}if(candidates.length<desired)throw new Error('PERMUTATION_CANDIDATES');candidates.length=desired;return {n,objs,initial,stages,final,items:rng.shuffle(candidates.map(x=>({state:x,correct:permEqual(x,final)})))};
}
function permPositions(n){if(n>=5){const cols=3,rows=Math.ceil(n/cols);return Array.from({length:n},(_,i)=>[55+(i%cols)*105,55+Math.floor(i/cols)*(rows>1?90:0)])}return Array.from({length:n},(_,i)=>[35+i*(250/Math.max(1,n-1)),90])}
let markerSeq=0;
function permMapSvg(perm,n){const pts=permPositions(n),marker=`pa${markerSeq++}`,defs=`<defs><marker id="${marker}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#ff79ae"/></marker></defs>`;let body=defs;for(let i=0;i<n;i++){const j=perm[i],a=pts[i],b=pts[j];body+=`<circle cx="${a[0]}" cy="${a[1]}" r="7" class="perm-dot"/>`;if(i!==j){const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2+(i<j?-24:24);body+=`<path class="perm-map-arrow" d="M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}" marker-end="url(#${marker})"/>`}}return svgWrap(body,'0 0 320 190','perm-map-svg','Mapa de posiciones')}
function taskPermutation(c,rng,level){
  const s=permutationScenario(rng,level);
  const arrangement=(state,choice=false)=>{
    // Choice cards get an explicit slot grid. Never let token SVGs determine card geometry:
    // 4 tokens use 2×2; 5/6 use 3-column rows; smaller sets stay on one row.
    const cols=choice?(s.n<=3?s.n:s.n===4?2:3):(s.n>=5?3:s.n);
    const size=choice?(s.n>=5?28:s.n===4?32:36):(s.n>=5?34:42);
    return `<div class="perm-arr${choice?' perm-arr-choice':' perm-arr-reference'}" style="--perm-cols:${cols}">${state.map(i=>`<span>${shapeSvg(s.objs[i],{size})}</span>`).join('')}</div>`;
  };
  addReference(c.root,`<div class="permutation-board"><div>${arrangement(s.initial)}</div><div class="perm-stage-stack">${s.stages.map((p,i)=>`${i?'<b>↓</b>':''}${permMapSvg(p,s.n)}`).join('')}</div><b>?</b></div>`);
  const rows=s.items.length<=2?[s.items.length]:s.items.length===3?[2,1]:[2,2];
  mountChoiceGrid(c,s.items.map((x,i)=>({html:arrangement(x.state,true),correct:x.correct,label:`Orden ${i+1}`})),{gridClass:'permutation-choices',rowPattern:rows});
}

// 22 Toca en Orden -----------------------------------------------------------
function tapOrderScenario(rng,level){const targets=[2,3,4,4,5,6,7,8,9][level-1],dist=[0,0,0,2,2,2,3,4,4][level-1],descs=genUniqueShapes(rng,targets+dist,{directional:true,mark:false,simple:true,coarse:true,shapes:['L','T','chevron','triangle','bar']});return {targets,dist,descs,sequence:descs.slice(0,targets),tokens:rng.shuffle(descs.map((d,i)=>({d,seq:i<targets?i:null})))}}
function taskTapOrder(c,rng,level){const s=tapOrderScenario(rng,level);addReference(c.root,`<div class="tap-sequence">${s.sequence.map(d=>shapeSvg(d,{size:s.targets>6?32:40})).join('<span>→</span>')}</div>`);const field=el('div','tap-order-field'),positions=tapOrderPositions(rng,s.tokens.length),visualSize=s.targets<=4?62:s.targets<=6?56:48;field.classList.toggle('dense',s.tokens.length>=12);s.tokens.forEach((x,i)=>{const b=el('button','tap-target');b.type='button';b.innerHTML=`<span class="tap-target-glyph" aria-hidden="true">${shapeSvg(x.d,{size:visualSize})}</span>`;b.style.left=`${positions[i].x}%`;b.style.top=`${positions[i].y}%`;b.dataset.seq=x.seq??'';b.setAttribute('aria-label',x.seq==null?`Distractor ${i+1}`:`Figura de secuencia ${x.seq+1}`);field.append(b)});c.root.append(field);let expected=0;field.onclick=e=>{const b=e.target.closest('.tap-target');if(!b||c.locked||b.classList.contains('consumed'))return;const seq=b.dataset.seq===''?null:Number(b.dataset.seq);if(seq===expected){b.classList.add('consumed');b.disabled=true;expected++;c.sounds?.play('random_tick_fast',.18);if(expected===s.targets)c.ok()}else c.bad(b)}}

// 23 Camino por Nodos --------------------------------------------------------
const GRID_COLS=5,GRID_ROWS=3;
function gridNeighbors(idx){const r=Math.floor(idx/GRID_COLS),q=idx%GRID_COLS,out=[];if(q>0)out.push(idx-1);if(q<GRID_COLS-1)out.push(idx+1);if(r>0)out.push(idx-GRID_COLS);if(r<GRID_ROWS-1)out.push(idx+GRID_COLS);return out}
function findGridPath(rng,length){const starts=rng.shuffle(Array.from({length:GRID_COLS*GRID_ROWS},(_,i)=>i));for(const start of starts){const path=[start],seen=new Set(path);const dfs=()=>{if(path.length===length)return true;for(const nb of rng.shuffle(gridNeighbors(path.at(-1)))){if(seen.has(nb))continue;seen.add(nb);path.push(nb);if(dfs())return true;path.pop();seen.delete(nb)}return false};if(dfs())return path}return null}
function nodePathScenario(rng,level){
  const routeEdges=[2,3,4,5,5,6,6,7,8][level-1],routeNodes=routeEdges+1,branchTarget=level<3?0:Math.min(4,1+Math.floor((level-3)/2));let path,branches=[];
  for(let tries=0;tries<300;tries++){
    path=findGridPath(rng,routeNodes);if(!path)continue;const used=new Set(path),cands=[];for(let ri=1;ri<path.length-1;ri++)for(const nb of gridNeighbors(path[ri]))if(!used.has(nb))cands.push({attach:ri,cell:nb});branches=[];const usedAttach=new Set(),usedCell=new Set();for(const x of rng.shuffle(cands)){if(branches.length>=branchTarget)break;if(usedAttach.has(x.attach)||usedCell.has(x.cell))continue;branches.push(x);usedAttach.add(x.attach);usedCell.add(x.cell);used.add(x.cell)}if(branches.length===branchTarget)break;
  }
  if(!path||branches.length!==branchTarget)throw new Error('NODE_PATH_LAYOUT');const coord=idx=>{const r=Math.floor(idx/GRID_COLS),q=idx%GRID_COLS;return {x:34+q*63,y:38+r*72}};const route=path.map((cell,i)=>({id:`r${i}`,cell,...coord(cell)})),branchNodes=branches.map((b,i)=>({id:`b${i}`,cell:b.cell,...coord(b.cell),attach:b.attach})),nodes=[...route,...branchNodes],edges=[];for(let i=0;i<route.length-1;i++)edges.push([route[i],route[i+1]]);for(const b of branchNodes)edges.push([route[b.attach],b]);return {route,nodes,edges};
}
function taskNodePath(c,rng,level){const s=nodePathScenario(rng,level),board=el('div','node-path-board'),edgeSvg=svgWrap(s.edges.map(([a,b])=>`<path d="M${a.x},${a.y} L${b.x},${b.y}"/>`).join(''),'0 0 320 220','game-diagram node-path-edges','Conexiones entre nodos');board.innerHTML=edgeSvg;const overlay=el('div','node-path-overlay');s.nodes.forEach((n,i)=>{const b=el('button',`node-hit ${i===0?'start':i===s.route.length-1?'goal':''}`);b.type='button';b.dataset.id=n.id;b.style.left=`${n.x/320*100}%`;b.style.top=`${n.y/220*100}%`;b.setAttribute('aria-label',i===0?'Inicio':i===s.route.length-1?'Meta':'Nodo');if(i===0){b.classList.add('visited');b.disabled=true}overlay.append(b)});board.append(overlay);c.root.append(board);let expected=1;overlay.addEventListener('click',e=>{const b=e.target.closest('.node-hit');if(!b||c.locked||b.disabled)return;const expectedNode=s.route[expected];if(b.dataset.id===expectedNode?.id){b.classList.add('visited');b.disabled=true;c.sounds?.play('random_tick_fast',.16);expected++;if(expected===s.route.length)c.ok()}else c.bad(b)})}

// 24 Trazo por Vértices ------------------------------------------------------
const TRACE_TEMPLATES=[
  {route:[[48,110],[272,110]],d:0},
  {route:[[48,170],[160,48],[272,170]],d:0},
  {route:[[72,172],[160,46],[248,172]],d:0,closed:true},
  {route:[[45,165],[102,55],[178,165],[275,58]],d:0},
  {route:[[54,45],[266,175],[54,175],[266,45]],d:0,allowCross:true},
  {route:[[42,170],[92,58],[153,145],[218,52],[278,164]],d:2},
  {route:[[42,168],[84,62],[134,158],[184,58],[232,158],[278,68]],d:0},
  {route:[[42,165],[78,66],[130,148],[178,52],[225,148],[278,62]],d:2},
  {route:[[40,170],[78,64],[126,154],[171,48],[218,150],[280,66]],d:3}
];
function transformTraceRoute(rng,route){
  const flipX=rng.bool(),flipY=rng.bool(),jitter=()=>rng.int(-6,6);return route.map(([x,y],i)=>({x:clamp((flipX?320-x:x)+(i?jitter():0),30,290),y:clamp((flipY?220-y:y)+(i?jitter():0),28,192)}));
}
function traceSegments(route,closed=false){const out=[];for(let i=0;i<route.length-1;i++)out.push([route[i],route[i+1]]);if(closed)out.push([route.at(-1),route[0]]);return out}
function validateTraceRoute(route,{closed=false,allowCross=false}={}){
  const segs=traceSegments(route,closed);for(let i=0;i<route.length;i++)for(let j=i+1;j<route.length;j++)if(pointDist(route[i],route[j])<56)return false;
  for(const [a,b] of segs)if(pointDist(a,b)<58)return false;
  for(let si=0;si<segs.length;si++)for(let vi=0;vi<route.length;vi++){
    const [a,b]=segs[si],isEndpoint=pointDist(route[vi],a)<1||pointDist(route[vi],b)<1;if(!isEndpoint&&segmentPointDistance(a,b,route[vi])<34)return false;
  }
  let crossings=0;for(let i=0;i<segs.length;i++)for(let j=i+1;j<segs.length;j++){if(segmentsShareEndpoint(...segs[i],...segs[j]))continue;if(properCross(...segs[i],...segs[j]))crossings++}
  if(allowCross)return crossings===1;return crossings===0;
}
function placeTraceDistractors(rng,route,spec){
  if(!spec.d)return [];const segments=traceSegments(route,spec.closed),slots=[];for(let y=30;y<=190;y+=8)for(let x=32;x<=288;x+=8){const p={x,y},pathClear=Math.min(...segments.map(([a,b])=>segmentPointDistance(a,b,p))),nodeClear=Math.min(...route.map(q=>pointDist(p,q)));if(pathClear>=38&&nodeClear>=56)slots.push({...p,score:pathClear+rng.float()*5})}slots.sort((a,b)=>b.score-a.score);const distractors=[];for(const p of slots){if(distractors.length>=spec.d)break;if(distractors.some(q=>pointDist(p,q)<56))continue;distractors.push({x:p.x,y:p.y})}return distractors.length===spec.d?distractors:null;
}
function traceScenario(rng,level){
  const spec=TRACE_TEMPLATES[level-1];for(let tries=0;tries<400;tries++){
    const route=transformTraceRoute(rng,spec.route);if(!validateTraceRoute(route,spec))continue;const distractors=placeTraceDistractors(rng,route,spec);if(!distractors)continue;const pts=[...route,...distractors],seq=Array.from({length:route.length},(_,i)=>i);if(spec.closed)seq.push(0);return {route,distractors,pts,seq,closed:!!spec.closed,allowCross:!!spec.allowCross}
  }
  const route=spec.route.map(([x,y])=>({x,y}));if(!validateTraceRoute(route,spec))throw new Error('TRACE_TEMPLATE_INVALID');const distractors=placeTraceDistractors(rng,route,spec);if(!distractors)throw new Error('TRACE_DISTRACTOR_LAYOUT');const pts=[...route,...distractors],seq=Array.from({length:route.length},(_,i)=>i);if(spec.closed)seq.push(0);return {route,distractors,pts,seq,closed:!!spec.closed,allowCross:!!spec.allowCross};
}
function traceDirectionArrows(points,seq){
  const out=[];for(let i=0;i<seq.length-1;i++){
    const a=points[seq[i]],b=points[seq[i+1]],mx=a.x+(b.x-a.x)*.57,my=a.y+(b.y-a.y)*.57,angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    out.push(`<path class="trace-direction-arrow" d="M-7,-5 L7,0 L-7,5 Z" transform="translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${angle.toFixed(1)})"/>`)
  }return out.join('')
}
function taskVertexTrace(c,rng,level){
  const s=traceScenario(rng,level),path=s.seq.map((i,j)=>`${j?'L':'M'}${s.pts[i].x},${s.pts[i].y}`).join(' '),arrows=traceDirectionArrows(s.pts,s.seq);
  const ref=svgWrap(`<path class="trace-ref" d="${path}"/>${arrows}${s.pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===0?9:7}" class="trace-ref-node ${i===0?'trace-start':''}"/>`).join('')}`,'0 0 320 220','game-diagram trace-reference','Referencia del trazo. Empieza en el vértice gris y sigue el sentido de las flechas.');
  addReference(c.root,ref);
  taskCaption(c.root,'Toca el vértice gris y luego los vértices en el sentido de las flechas.');
  const field=el('div','trace-input trace-tap-board');
  field.innerHTML=svgWrap('<path class="live-trace" d=""/>','0 0 320 220','game-diagram trace-live','Trazo que vas completando');
  const overlay=el('div','trace-tap-overlay');field.append(overlay);c.root.append(field);
  const live=field.querySelector('.live-trace'),nodes=[];let step=-1,trail=[];
  s.pts.forEach((p,i)=>{
    const b=el('button',`trace-node ${i===0?'start':''}`);b.type='button';b.dataset.i=String(i);b.style.left=`${p.x/320*100}%`;b.style.top=`${p.y/220*100}%`;
    b.setAttribute('aria-label',i===0?'Vértice gris de inicio':'Vértice');b.innerHTML='<span aria-hidden="true"></span>';overlay.append(b);nodes.push(b)
  });
  const render=()=>{
    live.setAttribute('d',trail.map((idx,j)=>`${j?'L':'M'}${s.pts[idx].x},${s.pts[idx].y}`).join(' '));
    const current=trail.at(-1);nodes.forEach((node,i)=>{node.classList.toggle('visited',trail.includes(i));node.classList.toggle('current',current===i);if(current===i)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current')})
  };
  const choose=node=>{
    if(c.locked)return;const idx=Number(node.dataset.i),expected=s.seq[step+1];
    if(idx!==expected){c.bad(node);return}
    step++;trail.push(idx);render();c.sounds?.play('random_tick_fast',.16);if(step===s.seq.length-1)c.ok()
  };
  overlay.addEventListener('click',e=>{const node=e.target.closest('.trace-node');if(node)choose(node)});
  render();
}

// 25 ¿Qué Cambió? ------------------------------------------------------------
function attentionScene(descs,positions,{disabled=false}={}){return `<div class="attention-scene">${descs.map((d,i)=>`<button class="attention-object" data-i="${i}" type="button" ${disabled?'disabled':''} aria-label="Figura ${i+1}" style="left:${positions[i].x}%;top:${positions[i].y}%">${shapeSvg(d,{size:48})}</button>`).join('')}</div>`}
function whatChangedScenario(rng,level){
  const n=[3,4,4,5,5,6,6,8,10][level-1],change=['shape','position','rotation','shape','markPos','rotation','combo','markPos','mark'][level-1],before=genUniqueShapes(rng,n,{directional:change==='rotation'||change==='combo',mark:change==='markPos'||change==='mark',simple:true}),target=rng.int(0,n-1),positions=[...attentionPositions(rng,n),...safeScatter(rng,change==='position'?6:0,{xMin:10,xMax:90,yMin:12,yMax:88,aspectBias:1.55})],beforePos=positions.slice(0,n),afterPos=beforePos.map(p=>({...p})),after=before.map(cloneDesc);
  if(change==='position'){
    const candidates=[...positions.slice(n)];for(let i=0;i<180;i++)candidates.push({x:10+rng.float()*80,y:12+rng.float()*76});
    const opts=candidates.filter(p=>pointDist(p,beforePos[target])>=25&&beforePos.every((q,i)=>i===target||pointDist(p,q)>=16)).map(p=>({...p,score:Math.min(...beforePos.filter((_,i)=>i!==target).map(q=>pointDist(p,q)))+pointDist(p,beforePos[target])*.35})).sort((a,b)=>b.score-a.score);
    if(!opts.length)throw new Error('WHAT_CHANGED_POSITION');afterPos[target]={x:opts[0].x,y:opts[0].y}
  }
  else if(change==='combo'){after[target]=mutateDesc(after[target],rng,'fill');after[target]=mutateDesc(after[target],rng,'rotation')}
  else{if(change==='markPos'&&after[target].mark==='none')after[target].mark=rng.pick(['dot','bar','two']);if(change==='mark'&&after[target].mark==='none')after[target].mark='dot';after[target]=mutateDesc(after[target],rng,change)}
  if(change!=='position'&&visualEquals(before[target],after[target]))throw new Error('WHAT_CHANGED_INVISIBLE');return {before,after,target,beforePos,afterPos,observeMs:1700+level*90};
}
function taskWhatChanged(c,rng,level){const s=whatChangedScenario(rng,level);let timers=[];const cancel=()=>timers.splice(0).forEach(clearTimeout),run=()=>{cancel();c.root.innerHTML=attentionScene(s.before,s.beforePos,{disabled:true});const t1=setTimeout(()=>{if(c.locked)return;c.root.innerHTML='<div class="attention-cover"></div>';const t2=setTimeout(()=>{if(c.locked)return;c.root.innerHTML=attentionScene(s.after,s.afterPos);c.root.querySelectorAll('.attention-object').forEach(b=>b.onclick=()=>Number(b.dataset.i)===s.target?c.ok():c.bad(b))},reduced()?70:190);timers.push(t2)},s.observeMs);timers.push(t1)};run();c.pauseFn=cancel;c.resumeFn=run;c.cleanup.push(cancel)}

// 26 ¿Qué Desapareció? -------------------------------------------------------
function disappearedObserveMs(n){return 900+n*300}
function whatDisappearedScenario(rng,level){
  const n=[3,4,5,5,6,6,7,8,9][level-1],before=genUniqueShapes(rng,n,{directional:level>=6,mark:level>=4,simple:true}),target=rng.int(0,n-1),positions=attentionPositions(rng,n),correct=before[target],after=before.filter((_,i)=>i!==target),afterPos=positions.filter((_,i)=>i!==target),candidateN=level<=2?3:level<=6?4:5,wrong=[],present=new Set(before.map(visualSignature));
  const types=['shape','rotation','fill','mark','markPos'];for(const t of types){const d=mutateDesc(correct,rng,t),sig=visualSignature(d);if(sig!==visualSignature(correct)&&!present.has(sig))addVisualUnique(wrong,d)}let guard=0;while(wrong.length<candidateN-1&&guard++<1200){const d=glyph(rng,{shapes:level>=6?DIRECTIONAL:PLAIN_SHAPES,mark:level>=4?'random':'none'}),sig=visualSignature(d);if(sig!==visualSignature(correct)&&!present.has(sig))addVisualUnique(wrong,d)}if(wrong.length<candidateN-1)throw new Error('DISAPPEARED_CANDIDATES');return {before,target,positions,after,afterPos,correct,items:rng.shuffle([{d:correct,correct:true},...wrong.slice(0,candidateN-1).map(d=>({d,correct:false}))]),observeMs:disappearedObserveMs(n),visibleCount:n};
}
function taskWhatDisappeared(c,rng,level){const s=whatDisappearedScenario(rng,level),choices=s.items.map((x,i)=>({html:shapeSvg(x.d,{size:54}),correct:x.correct,label:`Figura ${i+1}`}));let timers=[];const cancel=()=>timers.splice(0).forEach(clearTimeout),run=()=>{cancel();c.root.innerHTML=attentionScene(s.before,s.positions,{disabled:true});const t1=setTimeout(()=>{if(c.locked)return;c.root.innerHTML='<div class="attention-cover"></div>';const t2=setTimeout(()=>{if(c.locked)return;c.root.innerHTML=attentionScene(s.after,s.afterPos,{disabled:true});mountChoiceGrid(c,choices)},reduced()?70:190);timers.push(t2)},s.observeMs);timers.push(t1)};run();c.pauseFn=cancel;c.resumeFn=run;c.cleanup.push(cancel)}

// 27 Sigue al Objetivo -------------------------------------------------------
function followPosAt(o,t){return {x:o.cx+Math.sin(t*o.speed+o.phase)*o.ax,y:o.cy+Math.cos(t*(o.speed*.87)+o.phase*.73)*o.ay}}
function followScenarioFair(objs,duration,level){
  const samples=120,near=level>=8?12:14,critical=8;let nearRun=0,criticalRun=0;
  for(let s=0;s<=samples;s++){const t=duration/1000*s/samples,tp=followPosAt(objs[0],t);let nearCount=0,min=Infinity;for(let i=1;i<objs.length;i++){const p=followPosAt(objs[i],t),d=Math.hypot(tp.x-p.x,tp.y-p.y);min=Math.min(min,d);if(d<near)nearCount++}if(nearCount>1)return false;nearRun=nearCount?nearRun+1:0;criticalRun=min<critical?criticalRun+1:0;if(nearRun>(level>=8?28:17)||criticalRun>7)return false}return true;
}
function followScenario(rng,level){
  const distractors=[0,1,2,2,3,4,4,5,6][level-1],total=1+distractors,duration=[2000,2300,2600,3000,3300,3600,4000,4500,5000][level-1],descs=genUniqueShapes(rng,total,{directional:true,mark:false,simple:true,coarse:true,shapes:['L','T','chevron','triangle','bar']});
  for(let tries=0;tries<120;tries++){
    const starts=safeScatter(rng,total,{xMin:18,xMax:82,yMin:20,yMax:80,aspectBias:1.45}),objs=descs.map((d,i)=>{const maxAx=Math.max(5,Math.min(11+level*.55,Math.min(starts[i].x-8,92-starts[i].x))),maxAy=Math.max(5,Math.min(9+level*.48,Math.min(starts[i].y-10,90-starts[i].y))),ax=rng.float()*Math.max(2,maxAx-5)+5,ay=rng.float()*Math.max(2,maxAy-5)+5,phase=rng.float()*Math.PI*2,cx=starts[i].x-Math.sin(phase)*ax,cy=starts[i].y-Math.cos(phase*.73)*ay;return {d,cx:clamp(cx,8+ax,92-ax),cy:clamp(cy,10+ay,90-ay),phase,speed:.52+level*.065+rng.float()*.14,ax,ay}});
    if(followScenarioFair(objs,duration,level))return {objs,duration};
  }
  throw new Error('FOLLOW_NO_FAIR_SCENARIO');
}
function taskFollowTargetReduced(c,rng,level,s){
  const board=el('div','follow-board reduced-follow');c.root.append(board);const nodes=s.objs.map((o,i)=>{const b=el('button',`follow-object ${i===0?'target intro':''}`);b.type='button';b.innerHTML=shapeSvg(o.d,{size:52});b.setAttribute('aria-label',i===0?'Objetivo':'Distractor');board.append(b);return b});let stage=0,timers=[];const totalStages=2+Math.floor(level/3),positions=()=>safeScatter(rng,nodes.length,{xMin:17,xMax:83,yMin:18,yMax:82});const place=ps=>nodes.forEach((b,i)=>{b.style.left=`${ps[i].x}%`;b.style.top=`${ps[i].y}%`});const cancel=()=>timers.splice(0).forEach(clearTimeout);const next=()=>{if(c.locked)return;place(positions());nodes[0].classList.remove('intro');nodes.forEach((b,i)=>b.onclick=()=>{if(c.locked)return;if(i!==0){c.bad(b);return}stage++;c.sounds?.play('random_tick_fast',.18);if(stage>=totalStages)c.ok();else{nodes[0].classList.add('intro');nodes.forEach(x=>x.disabled=true);const t=setTimeout(()=>{nodes.forEach(x=>x.disabled=false);next()},420);timers.push(t)}})};place(positions());const t=setTimeout(next,650);timers.push(t);c.pauseFn=cancel;c.resumeFn=()=>{cancel();stage=0;nodes.forEach(x=>x.disabled=false);nodes[0].classList.add('intro');place(positions());timers.push(setTimeout(next,650))};c.cleanup.push(cancel);
}
function taskFollowTarget(c,rng,level){
  const s=followScenario(rng,level);if(reduced()){taskFollowTargetReduced(c,rng,level,s);return}
  const board=el('div','follow-board');c.root.append(board);const nodes=s.objs.map((o,i)=>{const b=el('div',`follow-object ${i===0?'target intro':''}`);b.innerHTML=shapeSvg(o.d,{size:52});board.append(b);return b});const blockNative=e=>e.preventDefault();for(const type of ['contextmenu','selectstart','dragstart'])board.addEventListener(type,blockNative);let raf=0,active=false,pid=null,start=0,pointer={x:0,y:0},outsideSince=null,paused=false;
  const place=t=>{for(let i=0;i<s.objs.length;i++){const p=followPosAt(s.objs[i],t);nodes[i].style.left=`${p.x}%`;nodes[i].style.top=`${p.y}%`}};place(0);
  const succeedIfDone=now=>{if(active&&now-start>=s.duration){active=false;cancelAnimationFrame(raf);nodes[0].classList.remove('tracking');c.ok();return true}return false};
  const loop=now=>{if(!active||paused||c.locked)return;if(succeedIfDone(now))return;const elapsed=now-start,t=elapsed/1000;place(t);const r=board.getBoundingClientRect(),tp=followPosAt(s.objs[0],t),tx=r.left+tp.x/100*r.width,ty=r.top+tp.y/100*r.height,d=Math.hypot(pointer.x-tx,pointer.y-ty),tol=Math.max(31,Math.min(r.width,r.height)*.14);if(d>tol){if(outsideSince==null)outsideSince=now;if(now-outsideSince>150){active=false;nodes[0].classList.remove('tracking');c.bad(nodes[0]);return}}else outsideSince=null;raf=requestAnimationFrame(loop)};
  const reset=()=>{active=false;cancelAnimationFrame(raf);outsideSince=null;try{if(pid!=null)board.releasePointerCapture?.(pid)}catch{};pid=null;place(0);nodes[0].classList.remove('tracking');nodes[0].classList.add('intro')};
  board.addEventListener('pointerdown',e=>{if(c.locked||active||paused)return;const r=nodes[0].getBoundingClientRect();if(e.clientX<r.left-14||e.clientX>r.right+14||e.clientY<r.top-14||e.clientY>r.bottom+14)return;e.preventDefault();active=true;pid=e.pointerId;pointer={x:e.clientX,y:e.clientY};outsideSince=null;nodes[0].classList.remove('intro');nodes[0].classList.add('tracking');board.setPointerCapture?.(pid);start=performance.now();raf=requestAnimationFrame(loop)});
  board.addEventListener('pointermove',e=>{if(active&&e.pointerId===pid){e.preventDefault();pointer={x:e.clientX,y:e.clientY}}});
  board.addEventListener('pointerup',e=>{if(!active||e.pointerId!==pid)return;e.preventDefault();const now=performance.now();if(succeedIfDone(now))return;active=false;nodes[0].classList.remove('tracking');c.bad(nodes[0])});
  board.addEventListener('pointercancel',reset);c.pauseFn=()=>{paused=true;reset()};c.resumeFn=()=>{paused=false;reset()};c.cleanup.push(()=>{reset();for(const type of ['contextmenu','selectstart','dragstart'])board.removeEventListener(type,blockNative)});
}

const BUILDERS={
 intruder:taskIntruder,twin:taskTwin,select_all:taskSelectAll,sequence:taskSequence,missing_cell:taskMissingCell,matrix:taskMatrix,
 rotation_match:taskRotation,mirror_match:taskMirror,piece_fit:taskPieceFit,maze_exit:taskMaze,broken_circuit:taskCircuit,missing_bridge:taskBridge,
 family:taskFamily,double_filter:taskDoubleFilter,secret_rule:taskSecretRule,count:taskCount,more:taskMore,balance:taskBalance,
 a_to_b:taskAToB,operator_chain:taskOperatorChain,permutation:taskPermutation,tap_order:taskTapOrder,node_path:taskNodePath,vertex_trace:taskVertexTrace,
 what_changed:taskWhatChanged,what_disappeared:taskWhatDisappeared,follow_target:taskFollowTarget
};

const AUDIT_BUILDERS={
  intruder:intruderScenario,twin:twinScenario,select_all:selectAllScenario,sequence:sequenceScenario,missing_cell:missingCellScenario,matrix:matrixScenario,
  rotation_match:rotationScenario,mirror_match:mirrorScenario,piece_fit:pieceFitScenario,maze_exit:mazeScenario,broken_circuit:circuitScenario,missing_bridge:bridgeScenario,
  family:familyScenario,double_filter:doubleFilterScenario,secret_rule:secretRuleScenario,count:countScenario,more:moreScenario,balance:balanceScenario,
  a_to_b:aToBScenario,operator_chain:chainScenario,permutation:permutationScenario,tap_order:tapOrderScenario,node_path:nodePathScenario,vertex_trace:traceScenario,
  what_changed:whatChangedScenario,what_disappeared:whatDisappearedScenario,follow_target:followScenario
};
export function buildTaskAuditScenario(taskId,level,seed){const fn=AUDIT_BUILDERS[taskId];if(!fn)throw new Error('UNKNOWN_TASK');return fn(seeded(seed,taskId,level),level)}
export const __taskTestInternals={visualSignature,coarseVisualSignature,rotationInvariantVisualSignature,applyOp,applyOps,followPosAt,followScenarioFair,validateTraceRoute,graphConnected,segmentPointDistance,properCross,MASKS};

export function mountTask({root,taskId,level,seed,sounds,onSuccess,onFailure}){
  const meta=TASK_BY_ID[taskId];root.className='game-task-root';root.innerHTML=`<div class="game-task-instruction">${esc(meta?.instruction||'')}</div><div class="game-task-content"></div>`;const content=root.querySelector('.game-task-content'),dynamic=['vertex_trace','what_changed','what_disappeared','follow_target'].includes(taskId),c=new Controller({root:content,onSuccess,onFailure,sounds,dynamic}),rng=seeded(seed,taskId,level);
  if(dynamic&&typeof document!=='undefined'){const visibility=()=>{if(document.hidden)c.pauseForModal();else c.resumeAfterModal()};document.addEventListener('visibilitychange',visibility);c.cleanup.push(()=>document.removeEventListener('visibilitychange',visibility))}
  try{BUILDERS[taskId](c,rng,level)}catch(err){console.error('TASK_BUILD_FAILED',taskId,err);content.innerHTML='<div class="game-task-build-error">No se pudo preparar este mini-task.</div>';setTimeout(()=>onFailure?.({technical:true}),20)}return c;
}
