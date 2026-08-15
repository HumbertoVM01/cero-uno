import { TASK_BY_ID, RNG, seeded, clamp, mod, sleep, shapeDescriptor, shapeSvg, descKey, cloneDesc, mutateDesc, shuffleWithCorrect, choiceButton, uniqueDescs, DIRS, normalizeRotation } from './core.js';

const el=(tag,cls='')=>{const x=document.createElement(tag);if(cls)x.className=cls;return x};
const reduced=()=>matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function svgWrap(body,view='0 0 320 220',cls='game-diagram'){return `<svg class="${cls}" viewBox="${view}" aria-hidden="true">${body}</svg>`}
function dots(n,desc,size=46){return Array.from({length:n},(_,i)=>shapeSvg(desc,{size})).join('')}

class Controller{
  constructor({root,onSuccess,onFailure,sounds,dynamic=false}){this.root=root;this.onSuccess=onSuccess;this.onFailure=onFailure;this.sounds=sounds;this.dynamic=dynamic;this.locked=false;this.cleanup=[];this.resumeFn=null;this.pauseFn=null}
  ok(){if(this.locked)return;this.locked=true;this.sounds?.play('ui_press_02',.42);this.root.classList.add('task-correct');setTimeout(()=>this.onSuccess?.(),reduced()?60:170)}
  bad(target=null){if(this.locked)return;this.locked=true;this.sounds?.play('validation_missing',.58);target?.classList?.add('wrong');this.root.classList.add('task-wrong');setTimeout(()=>this.onFailure?.(),reduced()?80:220)}
  pauseForModal(){this.pauseFn?.()}
  resumeAfterModal(){this.resumeFn?.()}
  destroy(){this.locked=true;for(const f of this.cleanup.splice(0))try{f()}catch{};this.root.replaceChildren()}
}

function choiceRowPattern(n){
  const exact={2:[2],3:[3],4:[2,2],5:[3,2],6:[3,3],7:[4,3],8:[4,4],9:[3,3,3],10:[4,3,3],11:[4,4,3],12:[4,4,4],13:[5,4,4],14:[5,5,4],15:[5,5,5],16:[4,4,4,4]};
  if(exact[n])return exact[n];const cols=n<=6?3:n<=12?4:5,out=[];let left=n;while(left>0){out.push(Math.min(cols,left));left-=cols}return out;
}
function mountChoiceGrid(c,choices,{multi=false,confirm=false,onEvaluate=null,gridClass='',choiceClass='',rowPattern=null}={}){
  const grid=el('div',`game-choice-grid choices-${choices.length}${gridClass?' '+gridClass:''}`),buttons=[],rows=rowPattern||choiceRowPattern(choices.length);c.root.append(grid);let cursor=0;
  for(const count of rows){
    const row=el('div','game-choice-row');row.style.setProperty('--row-count',count);grid.append(row);
    for(let k=0;k<count&&cursor<choices.length;k++,cursor++){
      const ch=choices[cursor],b=el('button',`game-choice${choiceClass?' '+choiceClass:''}${ch.className?' '+ch.className:''}`);b.type='button';b.innerHTML=ch.html;b.dataset.correct=ch.correct?'1':'0';b.dataset.value=ch.value??'';b.setAttribute('aria-label',ch.label||'Opción');row.append(b);buttons.push(b)
    }
  }
  if(multi){
    const selected=new Set();buttons.forEach((b,i)=>b.onclick=()=>{if(c.locked)return;b.classList.toggle('selected');b.classList.contains('selected')?selected.add(i):selected.delete(i)});
    const conf=el('button','game-task-confirm candy-button primary');conf.textContent='Confirmar';c.root.append(conf);conf.onclick=()=>{if(c.locked||!selected.size)return;const result=onEvaluate?.(selected,choices)??([...selected].every(i=>choices[i].correct)&&choices.every((x,i)=>x.correct===selected.has(i)));result?c.ok():c.bad(conf)};return {buttons,selected,confirm:conf};
  }
  buttons.forEach((b,i)=>b.onclick=()=>{if(c.locked)return;const ok=onEvaluate?onEvaluate(i,choices):choices[i].correct;ok?c.ok():c.bad(b)});return {buttons};
}
function addReference(root,html,cls='game-reference'){const d=el('div',cls);d.innerHTML=html;root.append(d);return d}

function genUniqueShapes(rng,n,{directional=false,mark=false,simple=false}={}){const out=[],seen=new Set();let guard=0;while(out.length<n&&guard++<200){const d=shapeDescriptor(rng,{directional,mark,simple});const k=descKey(d);if(!seen.has(k)){seen.add(k);out.push(d)}}return out}

function safeScatter(rng,n,{xMin=10,xMax=90,yMin=12,yMax=88,aspectBias=1.6}={}){
  const cols=Math.max(2,Math.ceil(Math.sqrt(n*aspectBias))),rows=Math.ceil(n/cols),cells=[];
  const cw=(xMax-xMin)/cols,ch=(yMax-yMin)/rows;
  for(let r=0;r<rows;r++)for(let q=0;q<cols;q++){
    const jx=(rng.float()-.5)*cw*.24,jy=(rng.float()-.5)*ch*.22;
    cells.push({x:xMin+(q+.5)*cw+jx,y:yMin+(r+.5)*ch+jy});
  }
  return rng.shuffle(cells).slice(0,n);
}
function tapOrderPositions(rng,n){
  const patterns={2:[2],3:[3],4:[4],5:[3,2],6:[3,3],7:[4,3],8:[4,4],9:[3,3,3],10:[4,3,3],11:[4,4,3],12:[4,4,4],13:[5,4,4]};
  const rows=patterns[n]||choiceRowPattern(n),out=[],rowCount=rows.length;
  rows.forEach((count,r)=>{const y=rowCount===1?50:16+r*(68/Math.max(1,rowCount-1));const span=count===5?80:count===4?72:count===3?58:42;for(let i=0;i<count;i++){const x=count===1?50:50-span/2+i*(span/(count-1));out.push({x:x+(rng.float()-.5)*2.2,y:y+(rng.float()-.5)*2})}});
  return rng.shuffle(out);
}

/** Hitbox-aware normalized placement for dense interactive fields. */
function packedFieldPositions(rng,n,{xMin=10,xMax=90,yMin=13,yMax=87,jitterX=1.8,jitterY=1.5}={}){
  const patterns={2:[2],3:[3],4:[2,2],5:[3,2],6:[3,3],7:[4,3],8:[4,4],9:[3,3,3],10:[3,4,3],11:[4,3,4],12:[4,4,4],13:[5,4,4]};
  const rows=patterns[n]||choiceRowPattern(n),out=[],rowCount=rows.length;
  rows.forEach((count,r)=>{const y=rowCount===1?50:yMin+r*((yMax-yMin)/Math.max(1,rowCount-1)),step=count===1?0:(xMax-xMin)/(count-1);for(let i=0;i<count;i++){const x=count===1?50:xMin+i*step;out.push({x:x+(rng.float()-.5)*jitterX,y:y+(rng.float()-.5)*jitterY})}});
  return rng.shuffle(out);
}
function attentionPositions(rng,n){return packedFieldPositions(rng,n,{xMin:14,xMax:86,yMin:16,yMax:84,jitterX:1.2,jitterY:1.1})}
function pointDist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function segmentPointDistance(a,b,p){const vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y,l2=vx*vx+vy*vy;if(!l2)return pointDist(a,p);const t=clamp((wx*vx+wy*vy)/l2,0,1),x=a.x+t*vx,y=a.y+t*vy;return Math.hypot(p.x-x,p.y-y)}

// 1 Intruso
function taskIntruder(c,rng,level){const counts=[4,5,6,7,8,9,12,12,16],n=counts[level-1],base=shapeDescriptor(rng,{directional:level>=3,mark:level>=4});const mutation=['shape','fill','rotation','mark','markPos','rotation','mark','markPos','count'][level-1];const intr=mutateDesc(base,rng,mutation);const idx=rng.int(0,n-1);const choices=Array.from({length:n},(_,i)=>({html:shapeSvg(i===idx?intr:base,{size:n>=12?54:66}),correct:i===idx}));mountChoiceGrid(c,choices)}

// 2 Gemelo
function taskTwin(c,rng,level){const n=[4,4,5,5,6,6,8,9,12][level-1],target=shapeDescriptor(rng,{directional:level>=3,mark:level>=4});addReference(c.root,shapeSvg(target,{size:94}),'game-reference target');const wrong=[];const types=['shape','fill','rotation','mark','markPos','mirror','count'];for(let i=0;i<n-1;i++){let d=mutateDesc(target,rng,types[i%Math.min(types.length,2+level)]);if(descKey(d)===descKey(target))d=mutateDesc(d,rng,'shape');wrong.push(d)}const arr=rng.shuffle([{d:target,correct:true},...uniqueDescs(wrong).map(d=>({d,correct:false}))]);while(arr.length<n){const d=mutateDesc(target,rng,'shape');if(!arr.some(x=>descKey(x.d)===descKey(d)))arr.push({d,correct:false})}mountChoiceGrid(c,arr.map(x=>({html:shapeSvg(x.d,{size:n>=9?55:70}),correct:x.correct})))}

// 3 Selecciona Todos
function taskSelectAll(c,rng,level){const n=[4,5,6,7,8,9,12,12,15][level-1];const ruleType=level<5?'shape':level<7?'fill':'combo';const ref=shapeDescriptor(rng,{directional:level>=6,mark:level>=5});addReference(c.root,shapeSvg(ref,{size:86})+'<span class="game-ref-caption">Coinciden con esto</span>');const want=rng.int(1,Math.max(1,Math.floor(n*.45))),items=[];for(let i=0;i<n;i++){let d;if(i<want){d=cloneDesc(ref);if(ruleType==='shape'){d.fill=rng.bool()?'solid':'outline';d.rotation=rng.pick(DIRS)}else if(ruleType==='fill'){d.shape=rng.pick(['triangle','square','L','chevron']);d.fill=ref.fill}else{d.shape=ref.shape;d.fill=ref.fill;d.rotation=rng.pick(DIRS)}}else{d=cloneDesc(ref);d=mutateDesc(d,rng,ruleType==='shape'?'shape':ruleType==='fill'?'fill':rng.pick(['shape','fill']))}items.push({d,correct:i<want})}const shuffled=rng.shuffle(items);mountChoiceGrid(c,shuffled.map(x=>({html:shapeSvg(x.d,{size:n>=12?50:62}),correct:x.correct})),{multi:true})}

// 4 Sigue la Serie
function taskSequence(c,rng,level){
  const base=shapeDescriptor(rng,{directional:true,mark:true});let seq=[],answer;
  if(level===1){const a=base,b=mutateDesc(a,rng,'shape');seq=[a,b,a,b];answer=a}
  else if(level===2){const a=base,b=mutateDesc(a,rng,'shape');seq=[a,a,b,b];answer=a}
  else if(level===3){seq=Array.from({length:4},(_,i)=>({...base,rotation:i*90}));answer={...base,rotation:0}}
  else if(level===4){seq=Array.from({length:4},(_,i)=>({...base,count:i+1}));answer={...base,count:5}}
  else if(level===5){seq=Array.from({length:4},(_,i)=>({...base,rotation:(i%2)*90,fill:i%2?'outline':'solid'}));answer={...base,rotation:0,fill:'solid'}}
  else if(level===6){const a=base,b=mutateDesc(a,rng,'shape');seq=[a,b,b,a,b];answer=b}
  else if(level===7){const a=base,b=mutateDesc(a,rng,'shape');seq=[{...a,rotation:0},{...b,rotation:90},{...a,rotation:180},{...b,rotation:270}];answer={...a,rotation:0}}
  else if(level===8){if(base.mark==='none')base.mark='bar';seq=Array.from({length:4},(_,i)=>({...base,rotation:i*90,mark:i%2?'dot':'bar'}));answer={...base,rotation:0,mark:'bar'}}
  else{seq=Array.from({length:4},(_,i)=>({...base,rotation:i*90,count:1+(i%3),fill:i%2?'outline':'solid'}));answer={...base,rotation:0,count:2,fill:'solid'}}
  addReference(c.root,`<div class="game-sequence-strip">${seq.map(x=>shapeSvg(x,{size:58})).join('<span>→</span>')}<span class="game-question">?</span></div>`);
  const wrong=uniqueDescs(['shape','rotation','fill','markPos','count'].map(t=>mutateDesc(answer,rng,t))).filter(d=>descKey(d)!==descKey(answer)).slice(0,level<3?2:3),arr=rng.shuffle([{d:answer,correct:true},...wrong.map(d=>({d,correct:false}))]);mountChoiceGrid(c,arr.map(x=>({html:shapeSvg(x.d,{size:66}),correct:x.correct})))
}

// 5 Casilla Faltante
function taskMissingCell(c,rng,level){const size=level<=1?[1,3]:level<=4?[2,2]:level<=5?[2,3]:[3,3];const [rows,cols]=size,base=shapeDescriptor(rng,{directional:true,mark:level>=5});const cells=[];for(let r=0;r<rows;r++)for(let q=0;q<cols;q++)cells.push({...base,rotation:(q*90+r*(level>=6?90:0))%360,fill:(r+q)%2?'outline':'solid',count:1+((r+q)%3)});const missing=level===1?2:rng.int(0,cells.length-1),answer=cells[missing];const grid=el('div','game-pattern-grid');grid.style.setProperty('--cols',cols);cells.forEach((d,i)=>{const cell=el('div','game-pattern-cell');cell.innerHTML=i===missing?'<span class="game-question">?</span>':shapeSvg(d,{size:cols===3?52:66});grid.append(cell)});c.root.append(grid);const wrong=uniqueDescs(['rotation','fill','count','shape'].map(t=>mutateDesc(answer,rng,t))).slice(0,level<3?2:3);mountChoiceGrid(c,rng.shuffle([{d:answer,correct:true},...wrong.map(d=>({d,correct:false}))]).map(x=>({html:shapeSvg(x.d,{size:64}),correct:x.correct})))}

// 6 Matriz
function taskMatrix(c,rng,level){const base=shapeDescriptor(rng,{directional:true,mark:true});const op=level<3?'count':level<5?'fill':level<7?'rotation':'combo';const cell=(r,q)=>{let d=cloneDesc(base);if(op==='count')d.count=1+((r+q)%3);if(op==='fill')d.fill=(r+q)%2?'outline':'solid';if(op==='rotation')d.rotation=(r*90+q*90)%360;if(op==='combo'){d.rotation=q*90;d.count=1+r;d.fill=(r+q)%2?'outline':'solid'}return d};const cells=[];for(let r=0;r<3;r++)for(let q=0;q<3;q++)cells.push(cell(r,q));const answer=cells[8];const grid=el('div','game-pattern-grid matrix');grid.style.setProperty('--cols',3);cells.forEach((d,i)=>{const cellEl=el('div','game-pattern-cell');cellEl.innerHTML=i===8?'<span class="game-question">?</span>':shapeSvg(d,{size:48});grid.append(cellEl)});c.root.append(grid);const wrong=uniqueDescs(['rotation','fill','count','shape'].map(t=>mutateDesc(answer,rng,t))).slice(0,3);mountChoiceGrid(c,rng.shuffle([{d:answer,correct:true},...wrong.map(d=>({d,correct:false}))]).map(x=>({html:shapeSvg(x.d,{size:58}),correct:x.correct})))}

// 7 Giro
function taskRotation(c,rng,level){
  const target=shapeDescriptor(rng,{directional:true,mark:level>=5});target.rotation=0;
  const validRots=[90,180,270].filter(r=>normalizeRotation(target.shape,r)!==normalizeRotation(target.shape,0)),rot=rng.pick(validRots.length?validRots:[90]),correct={...target,rotation:rot};addReference(c.root,shapeSvg(target,{size:96}));
  const count=level>=9?8:level>=6?6:level>=3?4:3,wrong=[];for(const r of DIRS.filter(x=>normalizeRotation(target.shape,x)!==normalizeRotation(target.shape,rot)&&normalizeRotation(target.shape,x)!==normalizeRotation(target.shape,0)))wrong.push({...target,rotation:r});wrong.push({...target,rotation:0});if(level>=4&&['L'].includes(target.shape))wrong.push({...correct,mirror:true});
  while(uniqueDescs(wrong).length<count-1)wrong.push(mutateDesc(correct,rng,rng.pick(['shape','markPos','fill'])));mountChoiceGrid(c,rng.shuffle([{d:correct,correct:true},...uniqueDescs(wrong).filter(d=>descKey(d)!==descKey(correct)).slice(0,count-1).map(d=>({d,correct:false}))]).map(x=>({html:shapeSvg(x.d,{size:58}),correct:x.correct})))
}

// 8 Espejo
function taskMirror(c,rng,level){
  const target=shapeDescriptor(rng,{directional:true,mark:true});target.shape='L';target.mirror=false;const axis=level>=7&&rng.bool()?'horizontal':'vertical';
  addReference(c.root,`<div class="mirror-ref">${shapeSvg(target,{size:88})}<span class="mirror-axis ${axis}"></span></div>`);
  const correct={...target,mirror:true,rotation:axis==='horizontal'?mod(180-target.rotation,360):mod(360-target.rotation,360)},count=level>=9?8:level>=6?6:level>=4?4:3,wrong=[{...target,rotation:mod(target.rotation+90,360)},{...target,rotation:mod(target.rotation+180,360)},{...target,mirror:false}];
  while(uniqueDescs(wrong).length<count-1)wrong.push(mutateDesc(correct,rng,rng.pick(['shape','rotation','markPos','fill'])));mountChoiceGrid(c,rng.shuffle([{d:correct,correct:true},...uniqueDescs(wrong).filter(d=>descKey(d)!==descKey(correct)).slice(0,count-1).map(d=>({d,correct:false}))]).map(x=>({html:shapeSvg(x.d,{size:58}),correct:x.correct})))
}

// 9 Pieza Que Encaja
const MASKS=['111010010','110110000','010111010','100111001','110011010','010110011','111001001','101111000'];
function maskSvg(mask,{hole=false,size=92}={}){const s=3,cell=24,body=[];for(let i=0;i<9;i++)if(mask[i]==='1'){const x=(i%3)*cell+8,y=Math.floor(i/3)*cell+8;body.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="5"/>`)}return `<svg class="fit-piece ${hole?'hole':''}" viewBox="0 0 88 88" width="${size}" height="${size}"><g>${body.join('')}</g></svg>`}
function taskPieceFit(c,rng,level){const correct=rng.pick(MASKS),n=level>=9?8:level>=6?6:level>=4?4:3;addReference(c.root,`<div class="fit-board">${maskSvg(correct,{hole:true,size:128})}</div>`);const wrong=rng.shuffle(MASKS.filter(x=>x!==correct)).slice(0,n-1);mountChoiceGrid(c,rng.shuffle([{m:correct,correct:true},...wrong.map(m=>({m,correct:false}))]).map(x=>({html:maskSvg(x.m,{size:60}),correct:x.correct})))}

// 10 Salida del Laberinto
function makeMazeSvg(rng,level){
  const exits=Math.min(4,2+Math.floor((level-1)/3)),cols=4+Math.floor(level/4),exitYs=Array.from({length:exits},(_,i)=>38+i*(144/Math.max(1,exits-1))),correctExit=rng.int(0,exits-1);
  const pts=[];let y=rng.int(62,158);for(let q=0;q<cols;q++){if(q===cols-1)y=exitYs[correctExit];else if(q)y=clamp(y+rng.int(-42,42),32,188);pts.push({x:34+q*(246/(cols-1)),y})}
  let body=`<path class="maze-main" d="${pts.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')} L 302 ${exitYs[correctExit]}"/>`;
  for(let i=1;i<pts.length-1;i++)if(rng.bool(Math.min(.62,level/11))){const p=pts[i],dy=rng.bool()?42:-42,yy=clamp(p.y+dy,22,198);body+=`<path class="maze-decoy" d="M ${p.x} ${p.y} L ${p.x} ${yy} L ${Math.min(292,p.x+34)} ${yy}"/>`}
  const buttons=[];for(let i=0;i<exits;i++){const y0=exitYs[i];body+=`<circle cx="302" cy="${y0}" r="9" class="maze-exit"/><text x="302" y="${y0+4}" text-anchor="middle">${i+1}</text>`;buttons.push({html:`Salida ${i+1}`,correct:i===correctExit})}
  return {svg:svgWrap(body,'0 0 320 220','game-diagram maze'),buttons}
}
function taskMaze(c,rng,level){const x=makeMazeSvg(rng,level);addReference(c.root,x.svg);mountChoiceGrid(c,x.buttons.map(x=>({html:`<strong>${x.html}</strong>`,correct:x.correct})))}

// 11 Circuito roto
function graphReachable(nodeCount,edges,start,target,extra=null){const adj=Array.from({length:nodeCount},()=>[]),all=extra?[...edges,extra]:edges;for(const [a,b] of all){adj[a].push(b);adj[b].push(a)}const seen=new Set([start]),q=[start];while(q.length){const x=q.shift();if(x===target)return true;for(const y of adj[x])if(!seen.has(y)){seen.add(y);q.push(y)}}return false}
function buildCircuitModel(rng,level){
  const n=Math.min(12,5+Math.floor(level*.75)),cols=Math.ceil(n/2),nodes=Array.from({length:n},(_,i)=>({x:38+(i%cols)*(238/Math.max(1,cols-1)),y:58+Math.floor(i/cols)*104}));
  const sEnd=Math.max(2,Math.floor(n*.42)),tStart=Math.min(n-2,sEnd+Math.max(1,Math.floor(n*.18))),S=[...Array(sEnd).keys()],D=[...Array(tStart-sEnd).keys()].map(i=>sEnd+i),T=[...Array(n-tStart).keys()].map(i=>tStart+i),edges=[];
  const chain=arr=>{for(let i=0;i<arr.length-1;i++)edges.push([arr[i],arr[i+1]])};chain(S);chain(D);chain(T);
  const correct=[rng.pick(S),rng.pick(T)],wanted=Math.min(5,2+Math.ceil(level/2)),candidates=[{edge:correct,kind:'correct'}];
  const add=(edge,kind)=>{const [a,b]=edge;if(a===b)return false;const key=[Math.min(a,b),Math.max(a,b)].join('-');if(candidates.some(x=>[Math.min(...x.edge),Math.max(...x.edge)].join('-')===key))return false;if(graphReachable(n,edges,0,n-1,edge))return false;candidates.push({edge,kind});return true};
  let guard=0;while(candidates.length<wanted&&guard++<200){if(D.length&&candidates.length%3===1)add([rng.pick(S),rng.pick(D)],'partial');else if(D.length&&candidates.length%3===2)add([rng.pick(D),rng.pick(T)],'partial');else{const pool=rng.bool()?S:T;if(pool.length>1)add([rng.pick(pool),rng.pick(pool)],'internal')}}
  guard=0;while(candidates.length<wanted&&guard++<200){const pools=[S,T,D].filter(a=>a.length>1),pool=rng.pick(pools),a=rng.pick(pool),b=rng.pick(pool);add([a,b],'internal')}
  if(graphReachable(n,edges,0,n-1))throw new Error('Circuit base graph unexpectedly connected');const valid=candidates.filter(x=>graphReachable(n,edges,0,n-1,x.edge));if(valid.length!==1||valid[0]!==candidates[0])throw new Error('Circuit candidate uniqueness failed');return {n,nodes,edges,candidates,correct:candidates[0]}
}
function taskCircuit(c,rng,level){const model=buildCircuitModel(rng,level),{n,nodes,edges}=model,ordered=rng.shuffle(model.candidates.map((x,i)=>({...x,sourceIndex:i})));let body=nodes.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="9"/><text x="${p.x}" y="${p.y+4}" text-anchor="middle">${i===0?'S':i===nodes.length-1?'T':''}</text>`).join('');for(const [ai,bi] of edges){const a=nodes[ai],b=nodes[bi];body+=`<path d="M ${a.x} ${a.y} L ${b.x} ${b.y}"/>`}ordered.forEach((x,i)=>{const a=nodes[x.edge[0]],b=nodes[x.edge[1]],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;body+=`<path class="circuit-candidate c${i}" d="M ${a.x} ${a.y} L ${b.x} ${b.y}"/><circle class="circuit-label-bg" cx="${mx}" cy="${my}" r="10"/><text class="circuit-label" x="${mx}" y="${my+4}" text-anchor="middle">${i+1}</text>`});addReference(c.root,svgWrap(body,'0 0 320 220','game-diagram circuit'));mountChoiceGrid(c,ordered.map((x,i)=>({html:`<strong>Puente ${i+1}</strong>`,correct:graphReachable(n,edges,0,n-1,x.edge)})))}

// 12 Puente Faltante
const PORT_TILES={NS:'M44 4 V84',EW:'M4 44 H84',NE:'M44 4 V44 H84',ES:'M84 44 H44 V84',SW:'M44 84 V44 H4',WN:'M4 44 H44 V4',T:'M4 44 H84 M44 4 V44',X:'M4 44 H84 M44 4 V84'};
function tileSvg(k,size=62){return `<svg class="bridge-tile" viewBox="0 0 88 88" width="${size}" height="${size}"><rect x="3" y="3" width="82" height="82" rx="14"/><path d="${PORT_TILES[k]}"/></svg>`}
function bridgePorts(k){return {N:k.includes('N')||k==='T'||k==='X',E:k.includes('E')||k==='T'||k==='X',S:k.includes('S')||k==='X',W:k.includes('W')||k==='T'||k==='X'}}
function taskBridge(c,rng,level){const keys=Object.keys(PORT_TILES),correct=rng.pick(level<3?['NS','EW','NE','ES']:keys),n=level>=8?5:level>=4?4:3,ports=bridgePorts(correct);const marks=`${ports.N?'<i class="port n"></i>':''}${ports.E?'<i class="port e"></i>':''}${ports.S?'<i class="port s"></i>':''}${ports.W?'<i class="port w"></i>':''}`;addReference(c.root,`<div class="bridge-context"><div class="bridge-hole">${marks}<b>?</b></div></div>`);const wrong=rng.shuffle(keys.filter(k=>k!==correct)).slice(0,n-1);mountChoiceGrid(c,rng.shuffle([{k:correct,correct:true},...wrong.map(k=>({k,correct:false}))]).map(x=>({html:tileSvg(x.k,56),correct:x.correct})))}

// 13 La Familia
function taskFamily(c,rng,level){const familyShape=rng.pick(['triangle','L','chevron','hexagon']),fill=rng.bool()?'solid':'outline',examples=[];const count=level>=8?4:3;for(let i=0;i<count;i++){const d=shapeDescriptor(rng,{directional:level>=3,mark:level>=5});d.shape=familyShape;if(level>=6)d.fill=fill;examples.push(d)}addReference(c.root,`<div class="family-examples">${examples.map(d=>shapeSvg(d,{size:58})).join('')}</div>`);const correct=shapeDescriptor(rng,{directional:true,mark:level>=5});correct.shape=familyShape;if(level>=6)correct.fill=fill;const n=level>=9?6:level>=6?5:4,wrong=[];for(let i=0;i<n-1;i++){let d=shapeDescriptor(rng,{directional:true,mark:level>=5});if(level>=6&&i===0){d.shape=familyShape;d.fill=fill==='solid'?'outline':'solid'}else d.shape=rng.pick(['circle','square','diamond','T'].filter(s=>s!==familyShape));wrong.push(d)}mountChoiceGrid(c,rng.shuffle([{d:correct,correct:true},...wrong.map(d=>({d,correct:false}))]).map(x=>({html:shapeSvg(x.d,{size:62}),correct:x.correct})))}

// 14 Filtro Doble
function taskDoubleFilter(c,rng,level){const shape=rng.pick(['triangle','L','chevron','hexagon']),fill=rng.bool()?'solid':'outline';addReference(c.root,`<div class="double-filter-cues"><div>${shapeSvg({...shapeDescriptor(rng),shape,fill:'outline'},{size:62})}<span>FORMA</span></div><div class="filter-fill ${fill}"><span>${fill==='solid'?'●':'○'}</span><small>RELLENO</small></div></div>`);const n=[3,4,4,5,6,6,8,9,12][level-1],items=[];const correct=shapeDescriptor(rng,{directional:true,mark:level>=6});correct.shape=shape;correct.fill=fill;items.push({d:correct,correct:true});for(let i=1;i<n;i++){const d=shapeDescriptor(rng,{directional:true,mark:level>=6});if(i%3===0){d.shape=shape;d.fill=fill==='solid'?'outline':'solid'}else if(i%3===1){d.shape=rng.pick(['circle','square','diamond','T'].filter(s=>s!==shape));d.fill=fill}else{d.shape=rng.pick(['circle','square','diamond','T'].filter(s=>s!==shape));d.fill=fill==='solid'?'outline':'solid'}items.push({d,correct:false})}mountChoiceGrid(c,rng.shuffle(items).map(x=>({html:shapeSvg(x.d,{size:n>=10?48:60}),correct:x.correct})))}

// 15 Regla Secreta
function taskSecretRule(c,rng,level){const rule=level<=1?'shape':level<=2?'fill':level<=3?'rotation':level<=4?'count':level<=5?'markPos':level<=6?'combo':level<=8?'relation':'abstract';const ref=shapeDescriptor(rng,{directional:true,mark:true});const matches=d=>{if(rule==='shape')return d.shape===ref.shape;if(rule==='fill')return d.fill===ref.fill;if(rule==='rotation')return mod(d.rotation,360)===mod(ref.rotation,360);if(rule==='count')return d.count===ref.count;if(rule==='markPos')return d.markPos===ref.markPos;if(rule==='combo')return d.shape===ref.shape&&d.fill===ref.fill;if(rule==='relation')return (d.rotation/90+d.count)%2===(ref.rotation/90+ref.count)%2;return (d.count===2)===(d.fill==='solid')};const positives=[],negatives=[];while(positives.length<(level<4?2:3)){const d=shapeDescriptor(rng,{directional:true,mark:true});if(rule==='shape')d.shape=ref.shape;if(rule==='fill')d.fill=ref.fill;if(rule==='rotation')d.rotation=ref.rotation;if(rule==='count')d.count=ref.count;if(rule==='markPos')d.markPos=ref.markPos;if(rule==='combo'){d.shape=ref.shape;d.fill=ref.fill}if(matches(d))positives.push(d)}while(negatives.length<(level<4?2:3)){const d=shapeDescriptor(rng,{directional:true,mark:true});if(!matches(d))negatives.push(d)}addReference(c.root,`<div class="secret-evidence">${positives.map(d=>`<div><b>✓</b>${shapeSvg(d,{size:52})}</div>`).join('')}${negatives.map(d=>`<div><b>✕</b>${shapeSvg(d,{size:52})}</div>`).join('')}</div>`);const n=level>=9?6:level>=6?5:4,items=[];while(items.filter(x=>x.correct).length<1){const d=shapeDescriptor(rng,{directional:true,mark:true});if(matches(d))items.push({d,correct:true})}while(items.length<n){const d=shapeDescriptor(rng,{directional:true,mark:true});if(!matches(d)&&!items.some(x=>descKey(x.d)===descKey(d)))items.push({d,correct:false})}mountChoiceGrid(c,rng.shuffle(items).map(x=>({html:shapeSvg(x.d,{size:58}),correct:x.correct})))}

// 16 Cuenta
function taskCount(c,rng,level){
  const ranges=[[1,3],[3,5],[3,6],[6,8],[6,8],[5,9],[10,12],[10,14],[12,16]],range=ranges[level-1],targetN=rng.int(...range),criterion=level<3?'ALL':level<6?'SHAPE':'SHAPE_ORIENTATION',target=shapeDescriptor(rng,{directional:level>=6});
  const distractors=level<3?0:Math.min(level>=8?4:3,Math.max(2,Math.floor(targetN*.3))),field=el('div','count-field');
  if(criterion!=='ALL')addReference(c.root,`<div class="count-cue">Cuenta: ${shapeSvg(target,{size:46})}</div>`);
  const matches=d=>criterion==='ALL'||(criterion==='SHAPE'?d.shape===target.shape:(d.shape===target.shape&&normalizeRotation(d.shape,d.rotation)===normalizeRotation(target.shape,target.rotation)));
  const items=[];for(let i=0;i<targetN;i++){const d=cloneDesc(target);if(criterion==='SHAPE')d.rotation=rng.pick(DIRS);items.push(d)}
  let guard=0;while(items.length<targetN+distractors&&guard++<200){let d=shapeDescriptor(rng,{directional:level>=6});if(criterion==='SHAPE')d.shape=rng.pick(SHAPE_EXCEPT(target.shape));if(criterion==='SHAPE_ORIENTATION'&&matches(d))d=mutateDesc(d,rng,rng.bool()?'shape':'rotation');if(!matches(d))items.push(d)}
  const positions=safeScatter(rng,items.length,{xMin:6,xMax:94,yMin:8,yMax:92,aspectBias:1.75}),itemSize=level>=8?30:level>=7?34:42;
  rng.shuffle(items).forEach((d,i)=>{const a=el('span','count-item');a.innerHTML=shapeSvg(d,{size:itemSize});a.style.left=`${positions[i].x}%`;a.style.top=`${positions[i].y}%`;field.append(a)});c.root.append(field);
  const vals=new Set([targetN]);for(const d of [-2,-1,1,2])if(targetN+d>0)vals.add(targetN+d);const answerCount=level>=6?5:3;while(vals.size<answerCount){const v=Math.max(1,targetN+rng.int(-4,4));vals.add(v)}
  mountChoiceGrid(c,rng.shuffle([...vals].slice(0,answerCount)).map(v=>({html:`<strong class="number-answer">${v}</strong>`,correct:v===targetN})))
}
function SHAPE_EXCEPT(shape){return ['circle','square','triangle','diamond','hexagon','cross','bar','L','T','chevron'].filter(s=>s!==shape)}

// 17 ¿Cuál Tiene Más?
function groupHtml(n,desc){const cols=n<=6?3:n<=12?4:5,size=n>=12?22:n>=9?24:28;return `<div class="quantity-group" style="--quantity-cols:${cols}">${Array.from({length:n},()=>shapeSvg(desc,{size})).join('')}</div>`}
function taskMore(c,rng,level){const groups=level>=7?4:level>=3?3:2,range=level<4?[2,7]:level<7?[5,10]:[8,13],counts=[];for(let i=0;i<groups;i++)counts.push(rng.int(range[0],range[1]));let max=Math.max(...counts),maxIdx=counts.indexOf(max);for(let i=0;i<counts.length;i++)if(i!==maxIdx&&counts[i]>=max)counts[i]=Math.max(range[0],max-1);if(level>=4){max=Math.max(...counts);maxIdx=counts.indexOf(max);const second=Math.max(...counts.filter((_,i)=>i!==maxIdx));if(max-second>2)counts[maxIdx]=second+rng.int(1,2)}max=Math.max(...counts);if(counts.filter(x=>x===max).length>1){maxIdx=counts.findIndex(x=>x===max);counts[maxIdx]=max+1;max=Math.max(...counts)}const desc=shapeDescriptor(rng,{simple:true}),choices=counts.map((n,i)=>({html:`${groupHtml(n,desc)}<small>Grupo ${i+1}</small>`,correct:n===max,className:'quantity-choice'})),rowPattern=groups===2?[2]:groups===3?[2,1]:[2,2];mountChoiceGrid(c,rng.shuffle(choices),{gridClass:'quantity-choice-grid',choiceClass:'quantity-choice',rowPattern})}

// 18 Balanza
function taskBalance(c,rng,level){
  const A=shapeDescriptor(rng,{simple:true});let B=shapeDescriptor(rng,{simple:true});let guard=0;while(descKey(B)===descKey(A)&&guard++<30)B=shapeDescriptor(rng,{simple:true});
  const mult=level<3?2:rng.int(2,3),answer=rng.int(1,level>=7?3:2),leftCount=mult*answer;
  addReference(c.root,`<div class="balance-equation"><div>${dots(mult,A,38)}</div><span>=</span><div>${shapeSvg(B,{size:44})}</div></div><div class="balance-scale"><div>${dots(leftCount,A,34)}</div><span>⚖</span><div class="game-question">?</div></div>`);
  const vals=new Set([answer,Math.max(1,answer-1),answer+1,answer+2]);mountChoiceGrid(c,rng.shuffle([...vals].slice(0,level>=6?4:3)).map(v=>({html:`${dots(v,B,32)}`,correct:v===answer})))
}

// transformation helpers
function applyOp(d,op){const x=cloneDesc(d);if(op==='ROTATE')x.rotation=mod(x.rotation+90,360);if(op==='MIRROR')x.mirror=!x.mirror;if(op==='FILL')x.fill=x.fill==='solid'?'outline':'solid';if(op==='ADD')x.count=clamp(x.count+1,1,4);if(op==='MOVE')x.markPos={top:'right',right:'bottom',bottom:'left',left:'top'}[x.markPos];return x}
function opGlyph(op){return {ROTATE:'↻',MIRROR:'↔',FILL:'●↔○',ADD:'+•',MOVE:'•↷'}[op]||op}
// 19 A→B
function taskAToB(c,rng,level){
  const ops=['ADD','FILL','ROTATE','MIRROR','MOVE'],op=level<6?ops[(level-1)%ops.length]:rng.pick(ops);
  const makeInput=()=>{const d=shapeDescriptor(rng,{directional:true,mark:true});if(op==='MIRROR'&&!['L','chevron'].includes(d.shape)){d.shape=rng.pick(['L','chevron']);d.rotation=rng.pick(DIRS)}if(op==='MOVE'&&d.mark==='none')d.mark=rng.pick(['dot','bar','two']);if(op==='ADD'&&d.count>=4)d.count=2;return d};
  const a=makeInput(),b=applyOp(a,op),c0=makeInput(),answer=applyOp(c0,op);addReference(c.root,`<div class="a-to-b"><div>${shapeSvg(a,{size:62})}<span>→</span>${shapeSvg(b,{size:62})}</div><div>${shapeSvg(c0,{size:62})}<span>→</span><b>?</b></div></div>`);const wrong=uniqueDescs(['shape','rotation','fill','markPos'].map(t=>mutateDesc(answer,rng,t))).filter(d=>descKey(d)!==descKey(answer)).slice(0,level>=7?4:3);mountChoiceGrid(c,rng.shuffle([{d:answer,correct:true},...wrong.map(d=>({d,correct:false}))]).map(x=>({html:shapeSvg(x.d,{size:58}),correct:x.correct})))
}

// 20 Operator chain
function taskOperatorChain(c,rng,level){
  const initial=shapeDescriptor(rng,{directional:true,mark:true});if(level>=7&&!['L','chevron'].includes(initial.shape))initial.shape=rng.pick(['L','chevron']);if(initial.mark==='none'&&level>=5)initial.mark='dot';
  const count=level<=2?1:level<=5?2:level<=8?3:4,ops=[];let state=initial;
  for(let i=0;i<count;i++){
    let pool=['ROTATE','FILL'];if(state.count<4)pool.push('ADD');if(state.mark!=='none')pool.push('MOVE');if(level>=7&&['L','chevron'].includes(state.shape))pool.push('MIRROR');if(ops.length>0&&pool.length>1)pool=pool.filter(x=>x!==ops.at(-1));
    let op=rng.pick(pool),next=applyOp(state,op),guard=0;while(descKey(next)===descKey(state)&&guard++<12){op=rng.pick(pool);next=applyOp(state,op)}ops.push(op);state=next;
  }
  const answer=state;addReference(c.root,`<div class="operator-chain"><div>${shapeSvg(initial,{size:66})}</div>${ops.map(o=>`<span>↓</span><div class="operator-card">${opGlyph(o)}</div>`).join('')}<span>↓</span><b>?</b></div>`);const wrong=[];let st=initial;for(let i=0;i<ops.length-1;i++){st=applyOp(st,ops[i]);wrong.push(st)}const rev=ops.slice().reverse().reduce((s,o)=>applyOp(s,o),initial);wrong.push(rev,mutateDesc(answer,rng,'rotation'),mutateDesc(answer,rng,'fill'));mountChoiceGrid(c,rng.shuffle([{d:answer,correct:true},...uniqueDescs(wrong).filter(d=>descKey(d)!==descKey(answer)).slice(0,level>=8?4:3).map(d=>({d,correct:false}))]).map(x=>({html:shapeSvg(x.d,{size:56}),correct:x.correct})))
}

// 21 Permutation
function permPositions(n){if(n===6)return [[55,42],[160,42],[265,42],[55,138],[160,138],[265,138]];return Array.from({length:n},(_,i)=>[34+i*(252/Math.max(1,n-1)),94])}
function permMapSvg(perm,n){const pts=permPositions(n),defs='<defs><marker id="pa" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#ff79ae"/></marker></defs>';let body=defs;pts.forEach(p=>body+=`<circle cx="${p[0]}" cy="${p[1]}" r="7" class="perm-dot"/>`);for(let i=0;i<n;i++){const j=perm[i];if(i===j)continue;const a=pts[i],b=pts[j],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,lane=((i<j)?-1:1)*(n===6?12:22),mx=(a[0]+b[0])/2+nx*lane,my=(a[1]+b[1])/2+ny*lane;body+=`<path class="perm-map-arrow" d="M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}" marker-end="url(#pa)"/>`}return svgWrap(body,'0 0 320 180','perm-map-svg')}
function taskPermutation(c,rng,level){const n=level===1?2:level<=3?3:level<=7?4:level===8?5:6,objs=genUniqueShapes(rng,n,{directional:false,mark:false,simple:true}),initial=rng.shuffle(objs.map((_,i)=>i)),identity=[...Array(n).keys()],swap=(a,b)=>{const p=[...identity];[p[a],p[b]]=[p[b],p[a]];return p},shift=k=>identity.map((_,i)=>mod(i+k,n));let p1;if(level===1)p1=swap(0,1);else if(level===2)p1=swap(0,n-1);else if(level===3)p1=shift(1);else if(level===4)p1=shift(rng.bool()?1:-1);else if(level===5){p1=[...identity];[p1[0],p1[1]]=[p1[1],p1[0]];[p1[2],p1[3]]=[p1[3],p1[2]]}else if(level===6)p1=shift(rng.bool()?1:-1);else if(level===7)p1=swap(0,1);else if(level===8)p1=shift(rng.bool()?1:-1);else p1=[1,0,2,4,3,5];const stages=[p1];if(level===7)stages.push(shift(1));if(level===9)stages.push([3,4,5,0,1,2]);const apply=(state,perm)=>{const out=new Array(n);for(let src=0;src<n;src++)out[perm[src]]=state[src];return out};let final=[...initial];for(const p of stages)final=apply(final,p);const arrangement=state=>`<div class="perm-arr ${n===6?'grid':''} n${n}">${state.map(i=>`<span>${shapeSvg(objs[i],{size:n>=5?30:36})}</span>`).join('')}</div>`;addReference(c.root,`<div class="permutation-board"><div class="perm-initial">${arrangement(initial)}</div><div class="perm-stage-stack">${stages.map((p,i)=>`${i?'<b>↓</b>':''}${permMapSvg(p,n)}`).join('')}</div><b class="perm-question">?</b></div>`);const candidates=[final];if(stages.length>1){const stage1=apply(initial,stages[0]);candidates.push(stage1);let rev=[...initial];for(const p of [...stages].reverse())rev=apply(rev,p);if(!candidates.some(a=>a.join(',')===rev.join(',')))candidates.push(rev)}const targetCount=level>=7?4:level>=2?3:2;let guard=0;while(candidates.length<targetCount&&guard++<200){const w=rng.shuffle(initial);if(!candidates.some(a=>a.join(',')===w.join(',')))candidates.push(w)}const choices=rng.shuffle(candidates.map(x=>({html:arrangement(x),correct:x.join(',')===final.join(','),className:'permutation-choice'})));mountChoiceGrid(c,choices,{gridClass:'permutation-choice-grid',choiceClass:'permutation-choice',rowPattern:choices.length===2?[2]:choices.length===3?[2,1]:[2,2]})}

// 22 Toca en Orden
function taskTapOrder(c,rng,level){
  const targets=[2,3,4,4,5,6,7,8,9][level-1],dist=[0,0,0,2,2,2,3,4,4][level-1],descs=genUniqueShapes(rng,targets+dist,{directional:true,mark:level>=7}),sequence=descs.slice(0,targets);
  const refRows=targets>=8?(targets===8?[4,4]:[5,4]):[targets],refParts=[];let refCursor=0;for(const rowN of refRows){const row=sequence.slice(refCursor,refCursor+rowN);refParts.push(`<div class="tap-sequence-row">${row.map((d,i)=>`${i?'<span>→</span>':''}${shapeSvg(d,{size:targets>6?32:40})}`).join('')}</div>`);refCursor+=rowN}addReference(c.root,`<div class="tap-sequence">${refParts.join('')}</div>`);
  const field=el('div','tap-order-field'),tokens=rng.shuffle(descs.map((d,i)=>({d,seq:i<targets?i:null}))),positions=tapOrderPositions(rng,tokens.length),visualSize=targets<=4?64:targets<=6?58:48;
  tokens.forEach((x,i)=>{const b=el('button','tap-target');b.type='button';b.innerHTML=shapeSvg(x.d,{size:visualSize});b.style.left=`${positions[i].x}%`;b.style.top=`${positions[i].y}%`;b.dataset.seq=x.seq??'';field.append(b)});c.root.append(field);
  let expected=0;field.onclick=e=>{const b=e.target.closest('.tap-target');if(!b||c.locked||b.classList.contains('consumed'))return;const seq=b.dataset.seq===''?null:Number(b.dataset.seq);if(seq===expected){b.classList.add('consumed');expected++;c.sounds?.play('random_tick_fast',.18);if(expected===targets)c.ok()}else c.bad(b)}
}

// 23 Camino por Nodos
function taskNodePath(c,rng,level){
  const routeLen=[2,3,4,4,5,5,6,6,8][level-1],branches=level<3?0:Math.min(4,1+Math.floor((level-3)/2));
  const route=Array.from({length:routeLen+1},(_,i)=>({id:`r${i}`,x:30+i*(250/routeLen),y:110+rng.int(-48,48)}));route[0].y=110;route.at(-1).y=110;
  const nodes=[...route],edges=[];for(let i=0;i<route.length-1;i++)edges.push([route[i],route[i+1]]);
  const clearPoint=(p,min=31)=>nodes.every(n=>pointDist(p,n)>=min);
  for(let i=0;i<branches;i++){
    const attach=route[rng.int(1,route.length-2)];let b=null;
    for(let tries=0;tries<36&&!b;tries++){
      const candidate={id:`b${i}`,x:clamp(attach.x+rng.int(-58,58),24,296),y:clamp(attach.y+(rng.bool()?1:-1)*rng.int(48,82),24,196)};
      if(clearPoint(candidate,32))b=candidate;
    }
    if(!b)continue;nodes.push(b);edges.push([attach,b]);
  }
  let body=edges.map(([a,b])=>`<path d="M${a.x},${a.y} L${b.x},${b.y}"/>`).join('');
  body+=nodes.map((n,i)=>`<circle class="node ${i===0?'start':i===route.length-1?'goal':''}" data-id="${n.id}" cx="${n.x}" cy="${n.y}" r="10"/>`).join('');
  const board=el('div','node-path-wrap');board.innerHTML=svgWrap(body,'0 0 320 220','game-diagram node-path');c.root.append(board);let expected=1;
  board.addEventListener('click',e=>{const node=e.target.closest('.node');if(!node||c.locked)return;const id=node.dataset.id;if(id===route[Math.max(0,expected-1)].id||node.classList.contains('visited'))return;if(id===route[expected]?.id){node.classList.add('visited');c.sounds?.play('random_tick_fast',.16);expected++;if(expected===route.length)c.ok()}else c.bad(node)})
}

// 24 Trazo por Vértices
function taskVertexTrace(c,rng,level){
  let correct=[2,3,3,4,4,5,6,6,6][level-1],total=[2,3,3,4,4,7,6,8,9][level-1],closed=level===3,cross=level===5,pts=[];
  if(cross){pts=[{x:52,y:40},{x:268,y:180},{x:52,y:180},{x:268,y:40}];correct=4;total=4}
  else{
    const crossing=(a,b,c,d)=>{const orient=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);return (o1*o2<0)&&(o3*o4<0)};
    for(let tries=0;tries<80;tries++){
      const raw=safeScatter(rng,total,{xMin:12,xMax:88,yMin:12,yMax:88,aspectBias:1.45}).map(p=>({x:22+p.x/100*276,y:18+p.y/100*184}));
      const seqTry=Array.from({length:correct},(_,i)=>i),segments=[];for(let i=0;i<seqTry.length-1;i++)segments.push([raw[seqTry[i]],raw[seqTry[i+1]]]);if(closed)segments.push([raw[seqTry.at(-1)],raw[0]]);
      let fair=true;
      for(let i=0;i<segments.length&&fair;i++)for(let j=0;j<raw.length;j++){
        const endpoint=j===seqTry[i]||j===seqTry[i+1]||(closed&&i===segments.length-1&&(j===seqTry.at(-1)||j===0));
        if(!endpoint&&segmentPointDistance(segments[i][0],segments[i][1],raw[j])<23){fair=false;break}
      }
      if(fair&&level<=4){for(let i=0;i<segments.length&&fair;i++)for(let j=i+1;j<segments.length;j++){if(Math.abs(i-j)<=1)continue;if(closed&&i===0&&j===segments.length-1)continue;if(crossing(...segments[i],...segments[j])){fair=false;break}}}
      if(fair){pts=raw;break}
    }
    if(!pts.length)pts=safeScatter(rng,total,{xMin:12,xMax:88,yMin:12,yMax:88,aspectBias:1.45}).map(p=>({x:22+p.x/100*276,y:18+p.y/100*184}));
  }
  const seq=Array.from({length:correct},(_,i)=>i);if(closed)seq.push(0);
  const path=seq.map((i,j)=>`${j?'L':'M'}${pts[i].x},${pts[i].y}`).join(' ');
  const ref=svgWrap(`<path class="trace-ref" d="${path}"/>${pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i===0?8:6}" class="${i===0?'trace-start':''}"/>`).join('')}`,'0 0 320 220','game-diagram trace-reference');addReference(c.root,ref);
  const field=el('div','trace-input');field.innerHTML=svgWrap(`${pts.map((p,i)=>`<circle data-i="${i}" cx="${p.x}" cy="${p.y}" r="${i===0?10:8}" class="trace-node ${i===0?'start':''}"/>`).join('')}<path class="live-trace" d=""/>`,'0 0 320 220','game-diagram trace-live');c.root.append(field);
  const svg=field.querySelector('svg'),live=field.querySelector('.live-trace');let active=false,pid=null,step=0,last={x:0,y:0};
  const toLocal=e=>{const r=svg.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*320,y:(e.clientY-r.top)/r.height*220}};
  const hitT=(a,b,p,radius)=>{const vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;if(!l2)return pointDist(a,p)<=radius?0:null;const t=clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/l2,0,1),q={x:a.x+t*vx,y:a.y+t*vy};return pointDist(q,p)<=radius?t:null};
  const reset=()=>{active=false;step=0;live.setAttribute('d','');if(pid!=null)try{svg.releasePointerCapture(pid)}catch{};pid=null};
  const renderLive=p=>{const completed=seq.slice(0,step+1).map((i,j)=>`${j?'L':'M'}${pts[i].x},${pts[i].y}`).join(' ');live.setAttribute('d',`${completed} L${p.x},${p.y}`)};
  const processSweep=(a,b)=>{
    const hits=[];for(let i=0;i<total;i++){const t=hitT(a,b,pts[i],i===seq[step+1]?25:20);if(t!=null)hits.push({i,t})}hits.sort((x,y)=>x.t-y.t);
    for(const h of hits){const expected=seq[step+1];if(expected==null)return 'done';if(h.i===expected){step++;c.sounds?.play('random_tick_fast',.14);if(step===seq.length-1){active=false;c.ok();return 'done'}continue}const completedIds=new Set(seq.slice(0,step+1));if(completedIds.has(h.i))continue;active=false;c.bad();return 'fail'}return 'ok'
  };
  svg.addEventListener('pointerdown',e=>{if(c.locked)return;const p=toLocal(e);if(pointDist(p,pts[0])>28)return;e.preventDefault();active=true;pid=e.pointerId;step=0;last=p;svg.setPointerCapture?.(pid);live.setAttribute('d',`M${pts[0].x},${pts[0].y} L${p.x},${p.y}`)});
  svg.addEventListener('pointermove',e=>{if(!active||e.pointerId!==pid||c.locked)return;e.preventDefault();const p=toLocal(e),status=processSweep(last,p);if(status==='ok')renderLive(p);last=p});
  svg.addEventListener('pointerup',e=>{if(!active||e.pointerId!==pid||c.locked)return;const p=toLocal(e),status=processSweep(last,p);if(status==='done'||c.locked)return;active=false;c.bad()});
  svg.addEventListener('pointercancel',reset);c.pauseFn=()=>reset();c.resumeFn=()=>reset();c.cleanup.push(reset)
}

// 25 Qué cambió
function attentionScene(descs,positions){return `<div class="attention-scene">${descs.map((d,i)=>`<button class="attention-object" data-i="${i}" type="button" style="left:${positions[i].x}%;top:${positions[i].y}%">${shapeSvg(d,{size:48})}</button>`).join('')}</div>`}
function taskWhatChanged(c,rng,level){
  const n=[3,4,4,5,5,6,6,8,10][level-1],before=genUniqueShapes(rng,n,{directional:level>=3,mark:level>=5}),target=rng.int(0,n-1);if(level===5&&before[target].mark==='none')before[target].mark='dot';
  const slotCount=n+(level===2?2:0),slots=attentionPositions(rng,slotCount),beforePos=slots.slice(0,n),afterPos=beforePos.map(x=>({...x})),after=before.map(cloneDesc);
  if(level===2){const candidates=slots.slice(n).filter(p=>pointDist(p,beforePos[target])>24);afterPos[target]={...(candidates[0]||slots[n])}}
  else if(level===7){after[target]=mutateDesc(after[target],rng,'fill');after[target]=mutateDesc(after[target],rng,'rotation')}
  else{const type=['shape','shape','rotation','shape','markPos','rotation','fill','markPos','mark'][level-1];after[target]=mutateDesc(after[target],rng,type)}
  let timers=[];const cancel=()=>timers.splice(0).forEach(clearTimeout);
  const run=()=>{cancel();c.root.innerHTML=attentionScene(before,beforePos);c.root.classList.add('attention-before');const t1=setTimeout(()=>{if(c.locked)return;c.root.innerHTML='<div class="attention-cover"></div>';const t2=setTimeout(()=>{if(c.locked)return;c.root.classList.remove('attention-before');c.root.innerHTML=attentionScene(after,afterPos);c.root.querySelectorAll('.attention-object').forEach(b=>b.onclick=()=>Number(b.dataset.i)===target?c.ok():c.bad(b))},reduced()?70:190);timers.push(t2)},(1600+level*90)*3);timers.push(t1)};
  run();c.pauseFn=cancel;c.resumeFn=run;c.cleanup.push(cancel)
}

// 26 Qué desapareció
function taskWhatDisappeared(c,rng,level){
  const n=[3,4,5,5,6,6,7,8,9][level-1],before=genUniqueShapes(rng,n,{directional:level>=6,mark:level>=4}),target=rng.int(0,n-1),positions=attentionPositions(rng,n),after=before.filter((_,i)=>i!==target),afterPos=positions.filter((_,i)=>i!==target),candidateN=level<=2?3:level<=6?4:5,correct=before[target],wrong=[];
  for(const t of ['shape','rotation','fill','count','mark',...(correct.mark!=='none'?['markPos']:[])]){const d=mutateDesc(correct,rng,t),k=descKey(d);if(!before.some(x=>descKey(x)===k)&&!wrong.some(x=>descKey(x)===k))wrong.push(d)}
  let guard=0;while(wrong.length<candidateN-1&&guard++<250){const d=shapeDescriptor(rng,{directional:level>=6,mark:level>=4}),k=descKey(d);if(k!==descKey(correct)&&!before.some(x=>descKey(x)===k)&&!wrong.some(x=>descKey(x)===k))wrong.push(d)}
  const candidateSet=rng.shuffle([{d:correct,correct:true},...wrong.slice(0,candidateN-1).map(d=>({d,correct:false}))]).map(x=>({html:shapeSvg(x.d,{size:54}),correct:x.correct}));
  let timers=[];const cancel=()=>timers.splice(0).forEach(clearTimeout);
  const run=()=>{cancel();c.root.innerHTML=attentionScene(before,positions);const t1=setTimeout(()=>{if(c.locked)return;c.root.innerHTML='<div class="attention-cover"></div>';const t2=setTimeout(()=>{if(c.locked)return;c.root.innerHTML=attentionScene(after,afterPos);c.root.querySelectorAll('.attention-object').forEach(b=>b.disabled=true);mountChoiceGrid(c,candidateSet)},reduced()?70:190);timers.push(t2)},1600+level*90);timers.push(t1)};
  run();c.pauseFn=cancel;c.resumeFn=run;c.cleanup.push(cancel)
}

// 27 Sigue al Objetivo
function followPosAt(o,t){return {x:clamp(o.x+(Math.sin(t*o.speed+o.phase)-Math.sin(o.phase))*o.ax,8,92),y:clamp(o.y+(Math.cos(t*(o.speed*.87)+o.phase*.7)-Math.cos(o.phase*.7))*o.ay,10,90)}}
function followScenarioFair(objs,duration,level){const steps=100,dt=duration/steps/1000;let fullOverlapRun=0,lastCritical=-99;for(let k=0;k<=steps;k++){const t=k*dt,tp=followPosAt(objs[0],t);let close=0,full=false;for(let i=1;i<objs.length;i++){const p=followPosAt(objs[i],t),dx=(p.x-tp.x)*4,dy=(p.y-tp.y)*2.35,d=Math.hypot(dx,dy);if(d<42)close++;if(d<27)full=true}fullOverlapRun=full?fullOverlapRun+1:0;if(fullOverlapRun>Math.ceil(.19/(dt||.05)))return false;if(close>=2)return false;if(close===1){if(t-lastCritical<.24&&level<8)return false;lastCritical=t}}return true}
function buildFollowScenario(rng,level,total,duration,descs){for(let attempt=0;attempt<60;attempt++){const starts=packedFieldPositions(rng,total,{xMin:22,xMax:78,yMin:23,yMax:77,jitterX:3,jitterY:3}),objs=descs.map((d,i)=>({d,x:starts[i].x,y:starts[i].y,phase:rng.float()*Math.PI*2,speed:.52+level*.065+rng.float()*.14,ax:rng.int(6,Math.min(16,8+level)),ay:rng.int(5,Math.min(13,7+level))}));if(followScenarioFair(objs,duration,level))return objs}const starts=packedFieldPositions(rng,total,{xMin:24,xMax:76,yMin:27,yMax:73,jitterX:0,jitterY:0});return descs.map((d,i)=>({d,x:starts[i].x,y:starts[i].y,phase:i*1.37,speed:.5+level*.045,ax:6+Math.min(level,6),ay:5+Math.min(level,5)}))}
function taskFollowTarget(c,rng,level){const distractors=[0,1,2,2,3,4,4,5,6][level-1],total=1+distractors,duration=[2000,2300,2600,3000,3300,3600,4000,4500,5000][level-1],descs=genUniqueShapes(rng,total,{directional:level>=6,mark:level>=6}),objs=buildFollowScenario(rng,level,total,duration,descs),board=el('div','follow-board');c.root.append(board);const nodes=objs.map((o,i)=>{const b=el('div',`follow-object ${i===0?'target':''}`);b.innerHTML=shapeSvg(o.d,{size:52});b.style.left=`${o.x}%`;b.style.top=`${o.y}%`;board.append(b);return b});nodes[0].classList.add('intro');let raf=0,active=false,pid=null,start=0,pointer={x:0,y:0},outsideSince=null,paused=false;const place=t=>{for(let i=0;i<objs.length;i++){const p=followPosAt(objs[i],t);nodes[i].style.left=`${p.x}%`;nodes[i].style.top=`${p.y}%`}};place(0);const loop=now=>{if(!active||paused||c.locked)return;const elapsed=now-start,t=elapsed/1000;place(t);const r=board.getBoundingClientRect(),tp=followPosAt(objs[0],t),tx=r.left+tp.x/100*r.width,ty=r.top+tp.y/100*r.height,d=Math.hypot(pointer.x-tx,pointer.y-ty),tol=Math.max(31,r.width*.087);if(d>tol){if(outsideSince==null)outsideSince=now;if(now-outsideSince>150){active=false;c.bad(nodes[0]);return}}else outsideSince=null;if(elapsed>=duration){active=false;c.ok();return}raf=requestAnimationFrame(loop)};const startTracking=e=>{if(c.locked||active||paused)return;const r=nodes[0].getBoundingClientRect();if(e.clientX<r.left-14||e.clientX>r.right+14||e.clientY<r.top-14||e.clientY>r.bottom+14)return;e.preventDefault();active=true;pid=e.pointerId;pointer={x:e.clientX,y:e.clientY};outsideSince=null;nodes[0].classList.remove('intro');board.setPointerCapture?.(pid);start=performance.now();raf=requestAnimationFrame(loop)};board.addEventListener('pointerdown',startTracking);board.addEventListener('pointermove',e=>{if(active&&e.pointerId===pid){e.preventDefault();pointer={x:e.clientX,y:e.clientY}}});board.addEventListener('pointerup',e=>{if(active&&e.pointerId===pid){active=false;c.bad(nodes[0])}});board.addEventListener('pointercancel',()=>{active=false;cancelAnimationFrame(raf);outsideSince=null;place(0);nodes[0].classList.add('intro')});const resetSame=()=>{active=false;cancelAnimationFrame(raf);outsideSince=null;try{if(pid!=null)board.releasePointerCapture?.(pid)}catch{};pid=null;place(0);nodes[0].classList.add('intro')};c.pauseFn=()=>{paused=true;resetSame()};c.resumeFn=()=>{paused=false;resetSame()};c.cleanup.push(()=>{cancelAnimationFrame(raf);active=false})}

function attachTaskAutoFit(content,c,{enabled=true}={}){
  if(!enabled)return;
  let rafId=0;
  const fit=()=>{rafId=0;if(c.locked||!content.isConnected)return;content.classList.remove('task-fit');content.style.removeProperty('--task-fit-scale');const h=content.clientHeight,w=content.clientWidth;if(!h||!w)return;const needH=content.scrollHeight,needW=content.scrollWidth,ratio=Math.min(1,h/Math.max(h,needH),w/Math.max(w,needW));if(ratio<.995){const scale=clamp(ratio*.985,.68,1);content.style.setProperty('--task-fit-scale',scale.toFixed(3));content.classList.add('task-fit')}};
  const schedule=()=>{if(rafId)return;rafId=requestAnimationFrame(fit)};
  const mo=typeof MutationObserver!=='undefined'?new MutationObserver(schedule):null;mo?.observe(content,{childList:true,subtree:true});
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;ro?.observe(content);schedule();
  c.cleanup.push(()=>{if(rafId)cancelAnimationFrame(rafId);mo?.disconnect();ro?.disconnect()});
}

const BUILDERS={
 intruder:taskIntruder,twin:taskTwin,select_all:taskSelectAll,sequence:taskSequence,missing_cell:taskMissingCell,matrix:taskMatrix,
 rotation_match:taskRotation,mirror_match:taskMirror,piece_fit:taskPieceFit,maze_exit:taskMaze,broken_circuit:taskCircuit,missing_bridge:taskBridge,
 family:taskFamily,double_filter:taskDoubleFilter,secret_rule:taskSecretRule,count:taskCount,more:taskMore,balance:taskBalance,
 a_to_b:taskAToB,operator_chain:taskOperatorChain,permutation:taskPermutation,tap_order:taskTapOrder,node_path:taskNodePath,vertex_trace:taskVertexTrace,
 what_changed:taskWhatChanged,what_disappeared:taskWhatDisappeared,follow_target:taskFollowTarget
};

export const __taskTestInternals={choiceRowPattern,packedFieldPositions,attentionPositions,graphReachable,buildCircuitModel,followScenarioFair,buildFollowScenario};

export function mountTask({root,taskId,level,seed,sounds,onSuccess,onFailure}){
  const meta=TASK_BY_ID[taskId];root.className='game-task-root';root.innerHTML=`<div class="game-task-instruction">${meta?.instruction||''}</div><div class="game-task-content"></div>`;const content=root.querySelector('.game-task-content');const c=new Controller({root:content,onSuccess,onFailure,sounds,dynamic:['vertex_trace','what_changed','what_disappeared','follow_target'].includes(taskId)});const rng=seeded(seed,taskId,level);try{BUILDERS[taskId](c,rng,level)}catch(err){console.error('TASK_BUILD_FAILED',taskId,err);content.innerHTML='<div class="game-task-build-error">No se pudo preparar este mini-task.</div>';setTimeout(()=>onFailure?.({technical:true}),20)}return c;
}
