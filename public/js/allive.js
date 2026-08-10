const DEF={
  body:{cls:'body',x:500,y:555,size:520,z:20,type:'pom'},
  top:{cls:'top',x:500,y:300,size:299,z:40,type:'pom'},
  leftArm:{cls:'left-arm',x:240,y:555,size:169,z:10,type:'pom'},
  rightArm:{cls:'right-arm',x:760,y:555,size:169,z:10,type:'pom'},
  leftLeg:{cls:'left-leg',x:344,y:758,size:169,z:10,type:'pom'},
  rightLeg:{cls:'right-leg',x:656,y:758,size:169,z:10,type:'pom'},
  leftEye:{cls:'left-eye',x:389,y:555,size:176.8,z:30,type:'gem'},
  rightEye:{cls:'right-eye',x:611,y:555,size:176.8,z:30,type:'gem'},
};
const REACTIONS=['jump','wave','dance','excited','sidehop','shimmy'];
const imageCache=new Map();
const alphaCache=new Map();
const glowMaskCache=new Map();
const ALPHA_SIZE=128;
const GLOW_MASK_SIZE=192;

function absSrc(src){try{return new URL(src,location.href).href}catch{return src}}
function loadImage(src){
  const key=absSrc(src);
  if(imageCache.has(key))return imageCache.get(key);
  const job=new Promise(resolve=>{
    const img=new Image();img.decoding='async';img.src=src;
    const done=async()=>{try{if(img.decode)await img.decode()}catch{}resolve(img)};
    if(img.complete&&img.naturalWidth)done();else{img.onload=done;img.onerror=()=>resolve(null)}
  });
  imageCache.set(key,job);return job;
}
async function alphaMap(src){
  const key=absSrc(src);if(alphaCache.has(key))return alphaCache.get(key);
  const job=(async()=>{
    const img=await loadImage(src);if(!img)return null;
    const c=document.createElement('canvas');c.width=c.height=ALPHA_SIZE;const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.clearRect(0,0,ALPHA_SIZE,ALPHA_SIZE);ctx.drawImage(img,0,0,ALPHA_SIZE,ALPHA_SIZE);
    const rgba=ctx.getImageData(0,0,ALPHA_SIZE,ALPHA_SIZE).data,alpha=new Uint8Array(ALPHA_SIZE*ALPHA_SIZE);
    for(let i=0,j=3;i<alpha.length;i++,j+=4)alpha[i]=rgba[j];
    return alpha;
  })();alphaCache.set(key,job);return job;
}
// Build a clean binary silhouette for glows. This deliberately discards faint
// transparent pixels around exported PNG bounds, so Safari can never reveal a
// square image box when drop-shadows are applied.
export async function glowMaskSrc(src){
  const key=absSrc(src);if(glowMaskCache.has(key))return glowMaskCache.get(key);
  const job=(async()=>{
    const img=await loadImage(src);if(!img)return src;
    const c=document.createElement('canvas');c.width=c.height=GLOW_MASK_SIZE;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
    const image=ctx.getImageData(0,0,c.width,c.height),d=image.data;
    // Use an intentionally firm threshold: the real fuzzy edge stays visible in
    // the foreground PNG; the glow is generated from the solid inner silhouette.
    for(let i=0;i<d.length;i+=4){const a=d[i+3];if(a>=72){d[i]=255;d[i+1]=255;d[i+2]=255;d[i+3]=255}else{d[i]=d[i+1]=d[i+2]=d[i+3]=0}}
    ctx.putImageData(image,0,0);return c.toDataURL('image/png');
  })();glowMaskCache.set(key,job);return job;
}
export function preloadCatalogAssets(catalog){
  const srcs=[...catalog.poms,...catalog.gems].map(x=>x.src);
  return Promise.allSettled(srcs.map(async src=>{await loadImage(src);glowMaskSrc(src)}));
}

export class AlliveView{
  constructor(container,catalog,data,{interactive=false,onPartClick=null,hero=false,heroType='dance'}={}){
    this.container=container;this.catalog=catalog;this.data=data;this.interactive=interactive;this.onPartClick=onPartClick;this.selected=null;this.hero=hero;this.heroType=heroType;
    this.partEls=new Map();this.topFollow=0;this.lastT=performance.now();this.reaction=null;this.destroyed=false;
    this.stage=document.createElement('div');this.stage.className=`allive-stage${interactive?' interactive':''}`;container.replaceChildren(this.stage);
    for(const [key,d] of Object.entries(DEF)){
      const el=document.createElement('div');el.className=`allive-part part-${d.cls}`;el.dataset.part=key;el.style.left=`${d.x/10}%`;el.style.top=`${d.y/10}%`;el.style.width=`${d.size/10}%`;el.style.height=`${d.size/10}%`;
      const glow=document.createElement('div');glow.className='rainbow-glow';
      const glowImg=document.createElement('img');glowImg.className='glow-copy';glowImg.alt='';glowImg.draggable=false;glowImg.decoding='async';glow.append(glowImg);
      const img=document.createElement('img');img.className='real-part';img.alt='';img.draggable=false;img.decoding='async';
      el.append(glow,img);this.stage.append(el);this.partEls.set(key,{el,img,glow,glowImg,d,src:''});
    }
    if(interactive)this.stage.addEventListener('click',e=>this.pickAt(e.clientX,e.clientY));
    this.setData(data);this.raf=requestAnimationFrame(t=>this.frame(t));
    if(hero)this.startHeroLoop();
  }
  assetSrc(key,id){const type=DEF[key].type;const list=type==='pom'?this.catalog.poms:this.catalog.gems;return list.find(x=>x.id===id)?.src||''}
  setGlowSource(p,src){const token=(p.glowToken||0)+1;p.glowToken=token;glowMaskSrc(src).then(mask=>{if(p.glowToken===token)p.glowImg.src=mask})}
  setData(data){this.data=data;for(const key of Object.keys(DEF)){const src=this.assetSrc(key,data.parts[key]);const p=this.partEls.get(key);p.src=src;p.img.src=src;this.setGlowSource(p,src);loadImage(src);alphaMap(src)}}
  async updatePart(key,id){
    this.data.parts[key]=id;const src=this.assetSrc(key,id);const p=this.partEls.get(key);if(!src||p.src===src)return true;
    const token=(p.updateToken||0)+1;p.updateToken=token;
    await loadImage(src); // Keep the old asset visible until the replacement is decoded.
    if(p.updateToken!==token)return false;
    p.src=src;p.img.src=src;this.setGlowSource(p,src);alphaMap(src);return true;
  }
  select(key){this.selected=key||null;for(const [k,p] of this.partEls)p.el.classList.toggle('selected',k===this.selected)}
  setPartRandomizing(key,v){const p=this.partEls.get(key);if(p)p.el.classList.toggle('randomizing',!!v)}
  setAllRandomizing(v){this.stage.classList.toggle('randomizing',!!v)}
  async pickAt(clientX,clientY){
    if(!this.interactive)return;
    const order=Object.keys(DEF).sort((a,b)=>DEF[b].z-DEF[a].z);
    for(const key of order){
      const p=this.partEls.get(key),rect=p.el.getBoundingClientRect();
      if(clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom)continue;
      const map=await alphaMap(p.src);if(!map)continue;
      const x=Math.max(0,Math.min(ALPHA_SIZE-1,Math.floor((clientX-rect.left)/Math.max(1,rect.width)*ALPHA_SIZE)));
      const y=Math.max(0,Math.min(ALPHA_SIZE-1,Math.floor((clientY-rect.top)/Math.max(1,rect.height)*ALPHA_SIZE)));
      if(map[y*ALPHA_SIZE+x]>=36){this.onPartClick?.(key);return}
    }
    this.onPartClick?.(null); // Empty space inside the stage deselects everything.
  }
  caress(type=REACTIONS[Math.floor(Math.random()*REACTIONS.length)],glow=true){if(glow)this.stage.classList.add('caressed');this.reaction={type,start:performance.now(),duration:{jump:760,wave:760,dance:880,excited:680,sidehop:860,shimmy:720}[type]||760};if(glow)setTimeout(()=>this.stage.classList.remove('caressed'),900);return type}
  startHeroLoop(){this.heroTimer=setInterval(()=>{if(!document.hidden)this.caress(this.heroType,false)},1450);setTimeout(()=>this.caress(this.heroType,false),260)}
  reactionOffset(key,t){if(!this.reaction)return {x:0,y:0,sx:1,sy:1};const r=this.reaction;let p=(t-r.start)/r.duration;if(p>=1){this.reaction=null;return {x:0,y:0,sx:1,sy:1}}p=Math.max(0,p);const s=Math.sin(Math.PI*p),s2=Math.sin(Math.PI*2*p),s4=Math.sin(Math.PI*4*p);const out={x:0,y:0,sx:1,sy:1};
    if(r.type==='jump'){if(key==='body'||key.includes('Eye'))out.y=-.065*s;if(key.includes('Arm')){out.y=-.055*s;out.x+=(key==='leftArm'?-1:1)*.025*s}if(key.includes('Leg')){out.y=-.045*s;out.sy=1-.12*Math.sin(Math.PI*Math.min(1,p*2))}if(key==='top')out.y=-.085*Math.sin(Math.PI*Math.max(0,p-.08));if(p>.62){const land=Math.sin(Math.PI*Math.min(1,(p-.62)/.38));if(key==='body')out.sy=1-.06*land}}
    if(r.type==='wave'){const side=Math.floor(r.start)%2?'rightArm':'leftArm';if(key===side){out.y=-.07*s;out.x+=(side==='leftArm'?-1:1)*.035*s4}if(key==='body'||key.includes('Eye'))out.x=(side==='leftArm'?1:-1)*.012*s;if(key==='top')out.x=(side==='leftArm'?1:-1)*.018*s}
    if(r.type==='dance'){if(key==='body'||key.includes('Eye'))out.x=.028*s2;if(key==='top')out.x=.04*Math.sin(Math.PI*2*p-.45);if(key.includes('Arm')){const side=key==='leftArm'?-1:1;out.y=-.025*(1+side*Math.sin(Math.PI*2*p));out.x=side*.018*s2}if(key.includes('Leg'))out.sy=1-.04*Math.abs(s2)}
    if(r.type==='excited'){const pulse=Math.sin(Math.PI*4*p)*Math.sin(Math.PI*p);if(key==='body'){out.sx=1+.045*pulse;out.sy=1+.045*pulse}if(key.includes('Arm'))out.x+=(key==='leftArm'?-1:1)*.03*Math.abs(pulse);if(key==='top')out.y=-.025*Math.abs(pulse);if(key.includes('Leg'))out.y=.012*Math.abs(pulse)}
    if(r.type==='sidehop'){const hop=Math.sin(Math.PI*p);const dir=Math.floor(r.start)%2?-1:1;if(key==='body'||key.includes('Eye')){out.x=.045*dir*s2;out.y=-.035*hop}if(key.includes('Arm')){out.x=.05*dir*s2;out.y=-.025*hop}if(key.includes('Leg'))out.y=-.02*hop;if(key==='top'){out.x=.055*dir*Math.sin(Math.PI*2*p-.2);out.y=-.05*hop}}
    if(r.type==='shimmy'){const sh=Math.sin(Math.PI*6*p)*Math.sin(Math.PI*p);if(key==='body'||key.includes('Eye'))out.x=.018*sh;if(key.includes('Arm'))out.x=.032*sh;if(key==='top')out.x=.04*Math.sin(Math.PI*6*p-.35)*Math.sin(Math.PI*p)}
    return out;
  }
  frame(t){
    if(this.destroyed)return;const dt=Math.min(50,t-this.lastT);this.lastT=t;const B=this.stage.clientWidth*.52||1;
    // Same life cycle for every ALLIVE; slightly more visible than v1, still subtle.
    const breath=(1-Math.cos((t/4800)*Math.PI*2))/2;
    const bodyY=-.0084*B*breath,bodySx=1+.007*breath,bodySy=1+.0165*breath;
    const weight=Math.sin((t/9600)*Math.PI*2),bodyX=.0052*B*weight;
    this.topFollow+=(bodyY-this.topFollow)*Math.min(1,dt/115);
    for(const [key,p] of this.partEls){
      let x=0,y=0,sx=1,sy=1;
      if(key==='body'){x=bodyX;y=bodyY;sx=bodySx;sy=bodySy}
      else if(key.includes('Eye')){x=bodyX;y=bodyY}
      else if(key.includes('Arm')){const side=key==='leftArm'?-1:1;x=bodyX+side*.009*B*breath;y=bodyY-.0082*B*breath}
      else if(key.includes('Leg')){const side=key==='leftLeg'?-1:1;x=bodyX*.45+side*.0025*B*weight;y=bodyY*.25;sy=1-.015*Math.max(0,side*weight)}
      else if(key==='top'){x=bodyX*.65;y=this.topFollow-.008*B*breath+.0055*B*Math.sin((t/4800)*Math.PI*2-.35)}
      const r=this.reactionOffset(key,t);x+=r.x*B;y+=r.y*B;sx*=r.sx;sy*=r.sy;
      p.el.style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) scale(${sx},${sy})`;
    }
    this.raf=requestAnimationFrame(tt=>this.frame(tt));
  }
  destroy(){this.destroyed=true;cancelAnimationFrame(this.raf);clearInterval(this.heroTimer)}
}
export {REACTIONS};
