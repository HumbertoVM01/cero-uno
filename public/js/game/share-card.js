const cache=new Map();
async function loadImage(src){if(cache.has(src))return cache.get(src);const p=new Promise((resolve,reject)=>{const im=new Image();im.decoding='async';im.onload=()=>resolve(im);im.onerror=reject;im.src=src});cache.set(src,p);return p}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function font(size,weight=900){return `${weight} ${size}px "Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif`}
function fit(ctx,text,max,start,min=24){let s=start;while(s>min){ctx.font=font(s);if(ctx.measureText(text).width<=max)return s;s-=2}return s}

export class GameShareCard{
  constructor(catalog){this.catalog=catalog;this.canvas=document.createElement('canvas');this.canvas.width=1200;this.canvas.height=1500;this.blob=null}
  asset(key,id){const gems=key.includes('Eye');return (gems?this.catalog.gems:this.catalog.poms).find(x=>x.id===id)?.src||''}
  async drawAllive(ctx,data,x,y,size){
    const scale=size/1000,defs={body:[500,555,520],top:[500,300,299],leftArm:[240,555,169],rightArm:[760,555,169],leftLeg:[344,758,169],rightLeg:[656,758,169],leftEye:[389,555,176.8],rightEye:[611,555,176.8]},order=['leftArm','rightArm','leftLeg','rightLeg','body','leftEye','rightEye','top'];
    for(const key of order){const [cx,cy,s]=defs[key],src=this.asset(key,data.parts[key]);if(!src)continue;const im=await loadImage(src),w=s*scale;ctx.drawImage(im,x+cx*scale-w/2,y+cy*scale-w/2,w,w)}
  }
  async render({player,target,total,memory,skill,elapsedLabel,name=''}){
    const c=this.canvas,ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);
    const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#fff7ec');bg.addColorStop(.48,'#ffeaf4');bg.addColorStop(1,'#eee8ff');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const foil=ctx.createLinearGradient(90,60,W-90,H-80);['#ff4f99','#ffdf59','#53e6a5','#5baeff','#bd79ff','#ff4f99'].forEach((v,i,a)=>foil.addColorStop(i/(a.length-1),v));ctx.strokeStyle=foil;ctx.lineWidth=26;rr(ctx,48,48,W-96,H-96,70);ctx.stroke();
    ctx.fillStyle='#2a2430';ctx.textAlign='center';ctx.font=font(48);ctx.fillText('MUSEO DE ALLIVES',W/2,135);ctx.font=font(92);ctx.fillText('EL PEDIDO',W/2,235);
    if(name){const s=fit(ctx,name,W-240,48,28);ctx.font=font(s,850);ctx.fillStyle='#6d5b68';ctx.fillText(name,W/2,300)}
    const panelY=350,panelW=470,panelH=640,gap=42,leftX=(W-panelW*2-gap)/2,rightX=leftX+panelW+gap;
    for(const [x,label,data] of [[leftX,'PEDIDO',target],[rightX,'TU ALLIVE',player]]){ctx.fillStyle='rgba(255,255,255,.78)';rr(ctx,x,panelY,panelW,panelH,48);ctx.fill();ctx.fillStyle='#7b6573';ctx.font=font(30);ctx.fillText(label,x+panelW/2,panelY+58);await this.drawAllive(ctx,data,x+38,panelY+75,panelW-76)}
    ctx.fillStyle='#2a2430';ctx.font=font(92);ctx.fillText(`${total}`,W/2,1095);ctx.fillStyle='#9a7f91';ctx.font=font(25);ctx.fillText('SCORE TOTAL',W/2,1138);
    const metrics=[[`MEMORIA`,`${memory}/9`],[`SKILL`,`${skill.toFixed(1)}%`],[`TIEMPO`,elapsedLabel]];const mw=270,mg=28,mx=(W-(mw*3+mg*2))/2;metrics.forEach(([label,value],i)=>{const x=mx+i*(mw+mg);ctx.fillStyle='rgba(255,255,255,.72)';rr(ctx,x,1185,mw,120,28);ctx.fill();ctx.fillStyle='#8d7584';ctx.font=font(20);ctx.fillText(label,x+mw/2,1223);ctx.fillStyle='#2a2430';ctx.font=font(38);ctx.fillText(value,x+mw/2,1272)});
    ctx.fillStyle='#564a53';ctx.font=font(31,800);ctx.fillText('Logré este score en Pedido, en el Museo de ALLIVES',W/2,1370);ctx.fillStyle='#ff4f99';ctx.font=font(34);ctx.fillText('museodeallives.netlify.app',W/2,1422);
    this.blob=await new Promise(resolve=>c.toBlob(resolve,'image/png',1));return this.blob;
  }
  async share(filename='Pedido_ALLIVES.png'){
    if(!this.blob)return {mode:'none'};const file=new File([this.blob],filename,{type:'image/png'});
    if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:'Mi resultado en El Pedido'});return {mode:'share'}}catch(e){if(e.name==='AbortError')return {mode:'cancel'}}}
    const url=URL.createObjectURL(this.blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);return {mode:'download'};
  }
}
