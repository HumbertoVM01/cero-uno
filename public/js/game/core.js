export const PART_ORDER = ['body','top','leftArm','rightArm','leftLeg','rightLeg','leftEye','rightEye','scentId'];
export const VISUAL_PARTS = PART_ORDER.slice(0,8);
export const PART_LABELS = {
  body:'Cuerpo', top:'Pompón Superior', leftArm:'Brazo Izquierdo', rightArm:'Brazo Derecho',
  leftLeg:'Pierna Izquierda', rightLeg:'Pierna Derecha', leftEye:'Ojo Izquierdo', rightEye:'Ojo Derecho', scentId:'Olor'
};

export const TASKS = [
  ['intruder','Intruso','visual','Toca el diferente.'],
  ['twin','Gemelo','visual','Encuentra el idéntico.'],
  ['select_all','Selecciona Todos','visual','Selecciona todos los que cumplen el criterio.'],
  ['sequence','Sigue la Serie','patterns','¿Qué sigue?'],
  ['missing_cell','Casilla Faltante','patterns','Completa el patrón.'],
  ['matrix','Matriz','patterns','¿Qué completa la matriz?'],
  ['rotation_match','Giro','spatial','Encuentra la misma figura girada.'],
  ['mirror_match','Espejo','spatial','Encuentra su reflejo.'],
  ['piece_fit','Pieza Que Encaja','spatial','¿Qué pieza encaja?'],
  ['maze_exit','Salida del Laberinto','connections','¿A qué salida llega?'],
  ['broken_circuit','Circuito Roto','connections','¿Qué puente repara la conexión?'],
  ['missing_bridge','Puente Faltante','connections','Completa exactamente las conexiones.'],
  ['family','La Familia','classification','¿Cuál pertenece a la misma familia?'],
  ['double_filter','Filtro Doble','classification','Encuentra el que cumple ambos filtros.'],
  ['secret_rule','Regla Secreta','classification','¿Cuál recibe ✓?'],
  ['count','Cuenta','quantity','Cuenta sólo lo indicado.'],
  ['more','¿Cuál Tiene Más?','quantity','¿Cuál grupo tiene más?'],
  ['balance','Balanza','quantity','¿Qué equilibra la balanza?'],
  ['a_to_b','A → B','transformations','Aplica a C la misma transformación de A → B.'],
  ['operator_chain','Cadena de Operadores','transformations','Aplica los operadores en este orden.'],
  ['permutation','Permutación','transformations','¿Cómo quedan?'],
  ['tap_order','Toca en Orden','dexterity','Toca las figuras en el orden mostrado.'],
  ['node_path','Camino por Nodos','dexterity','Sigue el camino desde inicio hasta meta.'],
  ['vertex_trace','Trazo por Vértices','dexterity','Toca el vértice gris y luego los siguientes en el sentido de las flechas.'],
  ['what_changed','¿Qué Cambió?','attention','Compara Antes y Después. Toca la figura que cambió.'],
  ['what_disappeared','¿Qué Desapareció?','attention','Compara Antes y Después. En Antes, toca la figura que desapareció.'],
  ['follow_target','Sigue al Objetivo','attention','Mantén presionado y sigue al objetivo.'],
].map(([id,name,family,instruction])=>({id,name,family,instruction}));

export const TASK_BY_ID = Object.fromEntries(TASKS.map(t=>[t.id,t]));

export function hash32(input){
  const s=String(input); let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  h+=h<<13; h^=h>>>7; h+=h<<3; h^=h>>>17; h+=h<<5;
  return h>>>0;
}
export function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
export class RNG{
  constructor(seed){this.seed=hash32(seed);this.r=mulberry32(this.seed)}
  float(){return this.r()}
  int(min,max){return min+Math.floor(this.float()*(max-min+1))}
  bool(p=.5){return this.float()<p}
  pick(arr){return arr[Math.floor(this.float()*arr.length)]}
  shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(this.float()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  weighted(items,weightFn){const ws=items.map(x=>Math.max(0,Number(weightFn(x))||0));let total=ws.reduce((a,b)=>a+b,0);if(!total)return this.pick(items);let p=this.float()*total;for(let i=0;i<items.length;i++){p-=ws[i];if(p<=0)return items[i]}return items.at(-1)}
}
export function seeded(seed,...parts){return new RNG([seed,...parts].join('|'))}
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const mod=(n,m)=>((n%m)+m)%m;
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function uid(prefix='id'){return `${prefix}-${Math.random().toString(36).slice(2,9)}`}

export function visualFingerprint(a){return VISUAL_PARTS.map(k=>a?.parts?.[k]||'').join('|')}
export function validAllive(a,catalog){
  if(!a||!a.id||!a.parts||!a.scentId)return false;
  const p=new Set(catalog.poms.map(x=>x.id)),g=new Set(catalog.gems.map(x=>x.id)),s=new Set(catalog.scents.map(x=>x.id));
  return ['body','top','leftArm','rightArm','leftLeg','rightLeg'].every(k=>p.has(a.parts[k]))&&['leftEye','rightEye'].every(k=>g.has(a.parts[k]))&&s.has(a.scentId);
}
export function scoreMemory(player,target){return PART_ORDER.reduce((n,k)=>n+(k==='scentId'?player.scentId===target.scentId:player.parts[k]===target.parts[k]?1:0),0)}
export function diffBuild(player,target){const out={};for(const k of VISUAL_PARTS)out[k]=player.parts[k]!==target.parts[k];out.scentId=player.scentId!==target.scentId;return out}
export function skillScore(mistakes){let sum=0;for(let i=1;i<=9;i++)sum+=(i/45)*(1/(1+(mistakes[i-1]||0)));return 100*sum}
export const GAME_SCORE_VERSION=1;
export function speedPointsRaw(elapsedMs){const seconds=Math.max(0,Number(elapsedMs)||0)/1000;return 100*clamp((135-seconds)/90,0,1)}
export function totalScore({memory,skill,elapsed}){const M=clamp((Number(memory)||0)/9,0,1),S=clamp((Number(skill)||0)/100,0,1),speedRaw=speedPointsRaw(elapsed),speed=M*speedRaw;return {memoryPoints:600*M,skillPoints:300*S,speedPoints:speed,total:Math.round(clamp(600*M+300*S+speed,0,1000)),speedRaw}}
export function formatTime(ms){const total=Math.max(0,Math.floor(ms/1000)),m=Math.floor(total/60),s=total%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
export function formatTimeTenths(ms){const total=Math.max(0,Number(ms)||0)/1000,m=Math.floor(total/60),s=total-m*60;return m?`${m}:${s.toFixed(1).padStart(4,'0')}`:`${s.toFixed(1)} s`}

export function chooseRoundTasks(seed,previous=[]){
  const rng=seeded(seed,'round-tasks'),chosen=[],familyCount=new Map(),prev=new Set(previous);
  while(chosen.length<9){
    const eligible=TASKS.filter(t=>!chosen.some(c=>c.id===t.id)&&(familyCount.get(t.family)||0)<2);
    const item=rng.weighted(eligible,t=>prev.has(t.id)?.45:1);chosen.push(item);familyCount.set(item.family,(familyCount.get(item.family)||0)+1);
  }
  let families=new Set(chosen.map(x=>x.family));
  if(families.size<6){
    const missing=[...new Set(TASKS.map(t=>t.family))].filter(f=>!families.has(f));
    for(const fam of missing){
      const replacement=rng.pick(TASKS.filter(t=>t.family===fam&&!chosen.some(c=>c.id===t.id)));if(!replacement)continue;
      const idx=chosen.findIndex((t,i)=>chosen.filter(x=>x.family===t.family).length>1&&i>0);if(idx>=0)chosen[idx]=replacement;
      families=new Set(chosen.map(x=>x.family));if(families.size>=6)break;
    }
  }
  return chosen;
}

export const SHAPES=['circle','square','triangle','diamond','hexagon','cross','bar','L','T','chevron'];
export const DIRS=[0,90,180,270];
export function shapeSymmetry(shape){
  if(['circle','square','diamond','cross'].includes(shape))return 90;
  if(['bar','hexagon'].includes(shape))return 180;
  return 360;
}
export function normalizeRotation(shape,rotation){const sym=shapeSymmetry(shape);return mod(rotation,sym)}

export function shapeDescriptor(rng,{simple=false,directional=false,mark=false,countVisible=!simple}={}){
  const pool=directional?['triangle','L','T','chevron','bar']:SHAPES,shape=rng.pick(pool);
  return {shape,rotation:rng.pick(DIRS),fill:rng.bool(.5)?'solid':'outline',mark:mark?rng.pick(['none','dot','bar','two']):'none',markPos:rng.pick(['top','right','bottom','left']),count:simple?1:rng.int(1,3),countVisible,mirror:false};
}

// Logical descriptor key: useful for state/debugging, not perceptual equality.
export function descKey(d){return [d.shape,mod(d.rotation||0,360),d.fill,d.mark,d.markPos,d.count,d.countVisible?1:0,d.mirror?1:0].join(':')}
export function cloneDesc(d){return JSON.parse(JSON.stringify(d))}

function roundCoord(v){return Math.round(v*10)/10}
function transformPoint(x,y,rotation=0,mirror=false){
  if(mirror)x=-x;const a=mod(rotation,360)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [roundCoord(x*c-y*s),roundCoord(x*s+y*c)];
}
function basePoseKey(d){
  const shape=d.shape,r=mod(d.rotation||0,360),m=!!d.mirror;
  if(['circle','square','diamond','cross'].includes(shape))return shape;
  if(['bar','hexagon'].includes(shape))return `${shape}:${mod(r,180)}`;
  if(['triangle','T'].includes(shape))return `${shape}:${r}`; // both glyphs are symmetric across local Y.
  if(shape==='chevron')return `${shape}:${mod(r+(m?180:0),360)}`; // local X reflection is a 180° rotation for this glyph.
  return `${shape}:${r}:${m?1:0}`; // L is genuinely chiral.
}
function markPoint(pos){return {top:[0,-14],right:[14,0],bottom:[0,14],left:[-14,0]}[pos]||[0,0]}
function countPoints(count){const n=clamp(Number(count)||1,1,6),gap=9,start=-(n-1)*gap/2;return Array.from({length:n},(_,i)=>[start+i*gap,27])}

/** Canonical signature of what shapeSvg actually exposes to the player. */
export function visualSignature(d){
  const parts=[basePoseKey(d),d.fill==='outline'?'o':'s'];
  if(d.mark&&d.mark!=='none'){
    const p=markPoint(d.markPos),q=transformPoint(p[0],p[1],d.rotation,d.mirror);parts.push(`m:${d.mark}:${q[0]},${q[1]}`);
  }else parts.push('m:none');
  if(d.countVisible){
    const pts=countPoints(d.count).map(p=>transformPoint(p[0],p[1],d.rotation,d.mirror)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    parts.push(`c:${pts.map(p=>`${p[0]},${p[1]}`).join(';')}`);
  }else parts.push('c:hidden');
  return parts.join('|');
}

/** Coarser identity for fast/dense tasks: ignores tiny marker position and pip placement. */
export function coarseVisualSignature(d){
  const r=(()=>{const s=d.shape,rot=mod(d.rotation||0,360);if(['circle','square','diamond','cross'].includes(s))return 0;if(['bar','hexagon'].includes(s))return mod(rot,180);return rot})();
  return [d.shape,r,d.fill,d.mark&&d.mark!=='none'?d.mark:'none',d.countVisible?clamp(Number(d.count)||1,1,6):0,d.shape==='L'&&d.mirror?1:0].join(':');
}
export function visualEquals(a,b){return visualSignature(a)===visualSignature(b)}
export function rotationInvariantVisualSignature(d){
  return DIRS.map(delta=>visualSignature({...d,rotation:mod((Number(d.rotation)||0)+delta,360)})).sort()[0];
}
export function rotationInvariantVisualEquals(a,b){return rotationInvariantVisualSignature(a)===rotationInvariantVisualSignature(b)}
export function coarseVisualEquals(a,b){return coarseVisualSignature(a)===coarseVisualSignature(b)}
export function uniqueVisualDescs(descs,{coarse=false}={}){const seen=new Set();return descs.filter(d=>{const k=coarse?coarseVisualSignature(d):visualSignature(d);if(seen.has(k))return false;seen.add(k);return true})}

export function mutateDesc(d,rng,type){
  const x=cloneDesc(d);
  switch(type){
    case 'shape':{const p=SHAPES.filter(s=>s!==x.shape);x.shape=rng.pick(p);x.rotation=0;x.mirror=false;break}
    case 'rotation':{const p=DIRS.filter(r=>visualSignature({...x,rotation:r})!==visualSignature(x));x.rotation=p.length?rng.pick(p):mod((x.rotation||0)+90,360);break}
    case 'fill':x.fill=x.fill==='solid'?'outline':'solid';break;
    case 'mark':x.mark=rng.pick(['dot','bar','two'].filter(m=>m!==x.mark));break;
    case 'markPos':x.markPos=rng.pick(['top','right','bottom','left'].filter(m=>m!==x.markPos));break;
    case 'count':x.countVisible=true;x.count=clamp((Number(x.count)||1)+(rng.bool()?-1:1),1,5);if(x.count===d.count)x.count=d.count>=5?4:(Number(d.count)||1)+1;break;
    case 'mirror':x.mirror=!x.mirror;break;
  }
  return x;
}

function pointFor(pos,r){return {top:[0,-r],right:[r,0],bottom:[0,r],left:[-r,0]}[pos]||[0,0]}
function shapePath(shape,r=30){
  if(shape==='triangle')return `M 0 ${-r} L ${r*.9} ${r*.8} L ${-r*.9} ${r*.8} Z`;
  if(shape==='diamond')return `M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`;
  if(shape==='hexagon'){const pts=[];for(let i=0;i<6;i++){const a=(-90+i*60)*Math.PI/180;pts.push(`${Math.cos(a)*r},${Math.sin(a)*r}`)}return `M ${pts.join(' L ')} Z`}
  if(shape==='cross')return `M ${-r*.32} ${-r} H ${r*.32} V ${-r*.32} H ${r} V ${r*.32} H ${r*.32} V ${r} H ${-r*.32} V ${r*.32} H ${-r} V ${-r*.32} H ${-r*.32} Z`;
  if(shape==='bar')return `M ${-r} ${-r*.28} H ${r} V ${r*.28} H ${-r} Z`;
  if(shape==='L')return `M ${-r*.72} ${-r} H ${-r*.08} V ${r*.35} H ${r} V ${r} H ${-r*.72} Z`;
  if(shape==='T')return `M ${-r} ${-r} H ${r} V ${-r*.36} H ${r*.32} V ${r} H ${-r*.32} V ${-r*.36} H ${-r} Z`;
  if(shape==='chevron')return `M ${-r} ${-r*.65} L 0 0 L ${-r} ${r*.65} L ${-r*.55} ${r} L ${r*.15} 0 L ${-r*.55} ${-r} Z`;
  if(shape==='square')return `M ${-r} ${-r} H ${r} V ${r} H ${-r} Z`;
  return '';
}
export function shapeSvg(desc,{size=86,className='',label=''}={}){
  const r=28,stroke='currentColor',fill=desc.fill==='solid'?'currentColor':'none';
  const base=desc.shape==='circle'?`<circle cx="0" cy="0" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`:`<path d="${shapePath(desc.shape,r)}" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round"/>`;
  const marks=[];const [mx,my]=pointFor(desc.markPos,14);
  if(desc.mark==='dot')marks.push(`<circle cx="${mx}" cy="${my}" r="5" fill="var(--game-accent,#ff74ad)"/>`);
  if(desc.mark==='bar')marks.push(`<rect x="${mx-7}" y="${my-2.5}" width="14" height="5" rx="2.5" fill="var(--game-accent,#ff74ad)"/>`);
  if(desc.mark==='two')marks.push(`<circle cx="${mx-5}" cy="${my}" r="4" fill="var(--game-accent,#ff74ad)"/><circle cx="${mx+5}" cy="${my}" r="4" fill="var(--game-accent,#ff74ad)"/>`);
  if(desc.countVisible){const pts=countPoints(desc.count);for(const [x,y] of pts)marks.push(`<circle class="game-count-pip" cx="${x}" cy="${y}" r="3.2" fill="var(--game-accent2,#67c9ff)"/>`)}
  const aria=String(label||'Figura').replaceAll('&','&amp;').replaceAll('"','&quot;');
  return `<svg class="game-shape ${className}" role="img" aria-label="${aria}" width="${size}" height="${size}" viewBox="-44 -44 88 88"><g transform="rotate(${desc.rotation||0}) scale(${desc.mirror?-1:1},1)">${base}${marks.join('')}</g></svg>`;
}

export function choiceButton(html,{correct=false,value='',label='Opción'}={}){return `<button class="game-choice" type="button" data-correct="${correct?'1':'0'}" data-value="${String(value).replaceAll('"','&quot;')}" aria-label="${label}">${html}</button>`}
export function shuffleWithCorrect(rng,correct,wrong){return rng.shuffle([{...correct,correct:true},...wrong.map(x=>({...x,correct:false}))])}
export function uniqueDescs(descs){const seen=new Set();return descs.filter(d=>{const k=descKey(d);if(seen.has(k))return false;seen.add(k);return true})}

export function buildDemoAllives(catalog,count=12){
  const rng=new RNG('demo-allives'),out=[];
  for(let i=0;i<count;i++){
    const parts={};for(const k of VISUAL_PARTS){const list=k.includes('Eye')?catalog.gems:catalog.poms;parts[k]=rng.pick(list).id}
    out.push({id:`demo-${i}`,subjectName:`Demo ${i+1}`,exhibitedBy:null,parts,scentId:rng.pick(catalog.scents).id,caresses:{day:0,week:0,month:0,year:0,total:0}})
  }
  return out;
}
