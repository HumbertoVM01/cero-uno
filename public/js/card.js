const cache=new Map();
async function loadImage(src){if(cache.has(src))return cache.get(src);const p=new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src});cache.set(src,p);return p}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function fitText(ctx,text,maxWidth,startSize,minSize=30){let s=startSize;while(s>minSize){ctx.font=`900 ${s}px "Arial Rounded MT Bold","Trebuchet MS",sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;s-=2}return s}
function wrap(ctx,text,maxWidth){const words=String(text).split(/\s+/);const lines=[];let line='';for(const w of words){const test=line?`${line} ${w}`:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test}if(line)lines.push(line);return lines}
export class CardMaker{
  constructor(canvas,catalog){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.catalog=catalog;this.blob=null;this.filename='ALLIVE.png'}
  scent(id){return this.catalog.scents.find(s=>s.id===id)}
  src(type,id){return (type==='pom'?this.catalog.poms:this.catalog.gems).find(x=>x.id===id)?.src}
  async drawAllive(data,x,y,size){const ctx=this.ctx;const scale=size/1000;const def={body:['pom',500,555,520],top:['pom',500,300,338],leftArm:['pom',240,555,169],rightArm:['pom',760,555,169],leftLeg:['pom',344,758,169],rightLeg:['pom',656,758,169],leftEye:['gem',389,555,192.4],rightEye:['gem',611,555,192.4]};const order=['leftArm','rightArm','leftLeg','rightLeg','body','leftEye','rightEye','top'];for(const key of order){const [type,cx,cy,s]=def[key];const src=this.src(type,data.parts[key]);const im=await loadImage(src);const w=s*scale;ctx.drawImage(im,x+(cx*scale)-w/2,y+(cy*scale)-w/2,w,w)}}
  async render(data,{subjectName,exhibitedBy=null}={}){const c=this.canvas,ctx=this.ctx;ctx.clearRect(0,0,c.width,c.height);const W=c.width,H=c.height;
    const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#fff7ec');bg.addColorStop(.5,'#fffdf8');bg.addColorStop(1,'#f8efff');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const foil=ctx.createLinearGradient(80,70,W-70,H-80);['#ff78ae','#ffd65e','#7ce6a6','#68c8ff','#a985ff','#ff78ae'].forEach((v,i,a)=>foil.addColorStop(i/(a.length-1),v));ctx.strokeStyle=foil;ctx.lineWidth=34;roundRect(ctx,42,42,W-84,H-84,86);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.86)';ctx.lineWidth=9;roundRect(ctx,67,67,W-134,H-134,66);ctx.stroke();
    ctx.fillStyle='#2a2430';ctx.textAlign='left';ctx.font='900 42px "Arial Rounded MT Bold","Trebuchet MS",sans-serif';ctx.fillText('MUSEO DE ALLIVES',115,155);
    const title=`ALLIVE De ${subjectName||data.subjectName||''}`;const fs=fitText(ctx,title,W-230,86,45);ctx.font=`900 ${fs}px "Arial Rounded MT Bold","Trebuchet MS",sans-serif`;ctx.fillText(title,115,250);
    ctx.save();ctx.shadowColor='rgba(80,55,72,.14)';ctx.shadowBlur=35;ctx.fillStyle='rgba(255,255,255,.76)';roundRect(ctx,110,310,W-220,900,68);ctx.fill();ctx.restore();
    await this.drawAllive(data,300,340,900);
    const scent=this.scent(data.scentId);let y=1315;ctx.fillStyle='#9a7f91';ctx.font='900 27px system-ui,sans-serif';ctx.fillText('OLOR',115,y);y+=55;ctx.fillStyle='#2a2430';ctx.font='900 54px "Arial Rounded MT Bold","Trebuchet MS",sans-serif';for(const line of wrap(ctx,scent?.name||'',W-230)){ctx.fillText(line,115,y);y+=60}
    y+=20;ctx.fillStyle='#9a7f91';ctx.font='900 27px system-ui,sans-serif';ctx.fillText('CÓMO HUELE',115,y);y+=50;ctx.fillStyle='#574e58';ctx.font='500 31px system-ui,sans-serif';for(const line of wrap(ctx,scent?.description||'',W-230).slice(0,4)){ctx.fillText(line,115,y);y+=42}
    y+=20;ctx.fillStyle='#9a7f91';ctx.font='900 27px system-ui,sans-serif';ctx.fillText('NOTAS',115,y);y+=48;ctx.fillStyle='#574e58';ctx.font='700 29px system-ui,sans-serif';for(const line of wrap(ctx,(scent?.notes||[]).join(' · '),W-230).slice(0,2)){ctx.fillText(line,115,y);y+=40}
    if(exhibitedBy){y=Math.max(y+35,1900);ctx.fillStyle='#9a7f91';ctx.font='900 25px system-ui,sans-serif';ctx.fillText('EXHIBIDO POR',115,y);ctx.fillStyle='#2a2430';ctx.font='900 34px "Arial Rounded MT Bold","Trebuchet MS",sans-serif';ctx.fillText(exhibitedBy,115,y+45)}
    ctx.textAlign='right';ctx.fillStyle='#9a7f91';ctx.font='800 24px system-ui,sans-serif';ctx.fillText('ALLIVE',W-115,H-105);ctx.textAlign='left';
    this.blob=await new Promise(res=>c.toBlob(res,'image/png',1));const safe=(subjectName||data.subjectName||'ALLIVE').replace(/[^\p{L}\p{N}]+/gu,'_').replace(/^_|_$/g,'').slice(0,60);this.filename=`ALLIVE_De_${safe||'ALLIVE'}.png`;return this.blob
  }
  async save(){if(!this.blob)return {mode:'none'};const file=new File([this.blob],this.filename,{type:'image/png'});if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:this.filename});return {mode:'share'}}catch(e){if(e.name==='AbortError')return {mode:'cancel'}}}const url=URL.createObjectURL(this.blob);const a=document.createElement('a');a.href=url;a.download=this.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);return {mode:'download'}}
}
