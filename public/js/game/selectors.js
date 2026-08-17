import { mod, clamp } from './core.js';

const raf=fn=>requestAnimationFrame(fn);
const caf=id=>id&&cancelAnimationFrame(id);
const easeOutCubic=t=>1-Math.pow(1-t,3);
const easeOutQuint=t=>1-Math.pow(1-t,5);

function haptic(sounds,ms=5){
  if(!sounds?.enabled)return;
  try{navigator.vibrate?.(ms)}catch{}
}
export function circularDelta(index,position,count){
  let d=index-mod(position,count);
  if(d>count/2)d-=count;
  if(d<-count/2)d+=count;
  return d;
}
function lerp(a,b,t){return a+(b-a)*t}
function sampleStops(stops,x){
  const a=Math.max(0,Math.min(stops.length-1,x));
  const i=Math.floor(a),j=Math.min(stops.length-1,i+1),t=a-i;
  return lerp(stops[i],stops[j],t);
}

/**
 * Horizontal circular selector for the 18 poms / 13 gems.
 * `position` is the only geometric source of truth. The item nearest position
 * is the provisional selection; after inertia the reel always snaps to an
 * integer so the selected item is exactly centered under the marker.
 */
export class AssetCarousel{
  constructor({root,items,startIndex=0,sounds,onPreview,onConfirm,label='Selecciona',reducedMotion=false}){
    this.root=root;this.items=items;this.position=mod(startIndex,items.length);this.selectedIndex=mod(Math.round(this.position),items.length);
    this.sounds=sounds;this.onPreview=onPreview;this.onConfirm=onConfirm;this.label=label;this.reducedMotion=reducedMotion;
    this.dragging=false;this.moving=false;this.pointerId=null;this.lastX=0;this.lastT=0;this.velocity=0;this.rafId=0;this.destroyed=false;this.releasePosition=0;
    this.keyHandler=e=>this.onKey(e);
    this.visibilityHandler=()=>{if(document.hidden)this.freezeForModal()};
    this.lostCaptureHandler=e=>{if(this.dragging&&(this.pointerId==null||e.pointerId===this.pointerId)){this.dragging=false;this.pointerId=null;this.velocity=0;this.carousel?.classList.remove('dragging');this.snapToCenter()}};
    this.render();this.preview(true);document.addEventListener('visibilitychange',this.visibilityHandler);
  }
  render(){
    this.root.innerHTML=`<div class="game-selector-head"><h2>${this.label}</h2><p>Desliza · centro = selección</p></div>
      <div class="game-carousel" tabindex="0" role="listbox" aria-label="${this.label}">
        <div class="game-carousel-marker" aria-hidden="true"></div><div class="game-carousel-track"></div>
      </div>
      <button class="game-confirm candy-button primary" type="button">Confirmar</button>`;
    this.carousel=this.root.querySelector('.game-carousel');this.track=this.root.querySelector('.game-carousel-track');this.confirm=this.root.querySelector('.game-confirm');
    this.nodes=this.items.map((item,i)=>{
      const slot=document.createElement('div');slot.className='game-carousel-slot';slot.setAttribute('role','option');slot.dataset.index=String(i);
      slot.innerHTML=`<span class="game-carousel-rainbow" aria-hidden="true"></span><img alt="" draggable="false">`;
      const img=slot.querySelector('img');img.src=item.src;img.alt=item.name||'';this.track.append(slot);return slot;
    });
    this.measure();this.paint();
    this.resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{this.measure();this.paint()}):null;this.resizeObserver?.observe(this.carousel);
    this.carousel.addEventListener('pointerdown',e=>this.pointerDown(e));this.carousel.addEventListener('pointermove',e=>this.pointerMove(e));this.carousel.addEventListener('pointerup',e=>this.pointerUp(e));this.carousel.addEventListener('pointercancel',e=>this.pointerCancel(e));this.carousel.addEventListener('lostpointercapture',this.lostCaptureHandler);this.carousel.addEventListener('keydown',this.keyHandler);
    this.confirm.onclick=()=>{if(this.moving||this.dragging)return;this.confirm.disabled=true;this.sounds?.play('ui_press_01',.5);this.onConfirm?.(this.items[this.selectedIndex],this.selectedIndex)};
    this.updateDisabled();
  }
  measure(){
    const w=this.carousel?.clientWidth||360;
    // Five settled slots must fit even on narrow mobile viewports without overlap.
    this.stepPx=clamp(w/5.15,68,90);
    this.carousel?.style.setProperty('--carousel-slot-px',`${this.stepPx}px`);
  }
  updateSelected({sound=true,force=false}={}){
    const next=mod(Math.round(this.position),this.items.length);
    if(!force&&next===this.selectedIndex)return;
    this.selectedIndex=next;
    if(sound){this.sounds?.play('random_tick_fast',.18);haptic(this.sounds,4)}
    this.preview();
  }
  paint(){
    if(!this.nodes)return;
    for(let i=0;i<this.nodes.length;i++){
      const node=this.nodes[i],d=circularDelta(i,this.position,this.items.length),ad=Math.abs(d);
      // Exactly five assets are visible at rest (center + 2 on each side).
      // A sixth may briefly enter at the edge while crossing the half-step so the reel never pops.
      if(ad>2.55){node.style.visibility='hidden';continue}
      node.style.visibility='visible';
      const scale=sampleStops([1,.79,.59,.52],ad);
      node.style.setProperty('--slot-x',`${d*this.stepPx}px`);
      node.style.setProperty('--slot-scale',String(scale));
      node.style.zIndex=String(20-Math.round(ad*3));
      const selected=i===this.selectedIndex;
      node.classList.toggle('selected',selected);node.setAttribute('aria-selected',String(selected));
    }
  }
  updateDisabled(){if(this.confirm)this.confirm.disabled=this.moving||this.dragging}
  preview(force=false){if(force)this.updateSelected({sound:false,force:true});this.onPreview?.(this.items[this.selectedIndex],this.selectedIndex)}
  stopMotion(){caf(this.rafId);this.rafId=0;this.moving=false;this.velocity=0}
  pointerDown(e){
    if(this.destroyed)return;e.preventDefault();this.stopMotion();this.dragging=true;this.pointerId=e.pointerId;this.lastX=e.clientX;this.lastT=performance.now();this.velocity=0;this.carousel.classList.add('dragging');this.carousel.setPointerCapture?.(e.pointerId);this.updateDisabled();
  }
  pointerMove(e){
    if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();const now=performance.now(),dx=e.clientX-this.lastX,dt=Math.max(1,now-this.lastT);
    const instant=-(dx/this.stepPx)/dt;this.velocity=this.velocity*.62+instant*.38;this.position-=dx/this.stepPx;this.lastX=e.clientX;this.lastT=now;this.updateSelected();this.paint();
  }
  pointerUp(e){
    if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();this.dragging=false;this.carousel.classList.remove('dragging');try{this.carousel.releasePointerCapture?.(e.pointerId)}catch{};this.pointerId=null;this.startInertia(this.velocity);
  }
  pointerCancel(e){if(this.pointerId!=null&&e.pointerId!==this.pointerId)return;this.freezeForModal()}
  startInertia(v){
    if(this.reducedMotion||Math.abs(v)<.001){this.snapToCenter();return}
    this.moving=true;this.updateDisabled();this.velocity=clamp(v,-.065,.065);this.releasePosition=this.position;let last=performance.now();
    const frame=now=>{
      if(this.destroyed||!this.moving)return;const dt=Math.min(34,Math.max(1,now-last));last=now;let next=this.position+this.velocity*dt;
      const travel=next-this.releasePosition;if(Math.abs(travel)>6){next=this.releasePosition+Math.sign(travel)*6;this.velocity=0}
      this.position=next;this.updateSelected();this.paint();this.velocity*=Math.exp(-.0055*dt);
      if(Math.abs(this.velocity)<.00095||Math.abs(this.position-this.releasePosition)>=5.999){this.velocity=0;this.snapToCenter();return}
      this.rafId=raf(frame)
    };
    this.rafId=raf(frame);
  }
  snapToCenter(target=Math.round(this.position)){
    caf(this.rafId);this.rafId=0;const from=this.position,to=target,distance=Math.abs(to-from);
    if(this.reducedMotion||distance<.001){this.position=to;this.updateSelected({sound:false});this.paint();this.moving=false;this.updateDisabled();return}
    this.moving=true;this.updateDisabled();const start=performance.now(),dur=clamp(185+distance*45,185,240);
    const frame=now=>{
      if(this.destroyed)return;const t=clamp((now-start)/dur,0,1),e=easeOutQuint(t);this.position=from+(to-from)*e;this.updateSelected();this.paint();
      if(t<1)this.rafId=raf(frame);else{this.position=to;this.updateSelected({sound:false});this.paint();this.moving=false;this.rafId=0;this.updateDisabled();this.sounds?.play('scent_manual_lock',.22)}
    };this.rafId=raf(frame);
  }
  step(delta){if(this.dragging)return;this.stopMotion();this.moving=true;this.updateDisabled();this.snapToCenter(Math.round(this.position)+delta)}
  onKey(e){if(this.dragging)return;if(e.key==='ArrowRight'){e.preventDefault();this.step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();this.step(-1)}else if(e.key==='Enter'&&!this.moving){e.preventDefault();this.confirm.click()}}
  freezeForModal(){
    caf(this.rafId);this.rafId=0;if(this.dragging){try{this.carousel.releasePointerCapture?.(this.pointerId)}catch{}}this.dragging=false;this.moving=false;this.pointerId=null;this.velocity=0;this.carousel?.classList.remove('dragging');this.position=Math.round(this.position);this.updateSelected({sound:false});this.paint();this.updateDisabled();
  }
  destroy(){this.destroyed=true;this.freezeForModal();document.removeEventListener('visibilitychange',this.visibilityHandler);this.carousel?.removeEventListener('lostpointercapture',this.lostCaptureHandler);this.resizeObserver?.disconnect();this.root.replaceChildren()}
}

/** Vertical game scent wheel. It uses the creator's seven-row hierarchy, but
 * strong flicks only add momentum and never randomize selection. */
export class GameScentWheel{
  constructor({root,scents,startIndex=0,sounds,onPreview,onConfirm,reducedMotion=false}){
    this.root=root;this.scents=scents;this.position=mod(startIndex,scents.length);this.selectedIndex=mod(Math.round(this.position),scents.length);this.sounds=sounds;this.onPreview=onPreview;this.onConfirm=onConfirm;this.reducedMotion=reducedMotion;
    this.dragging=false;this.moving=false;this.pointerId=null;this.velocity=0;this.lastY=0;this.lastT=0;this.rafId=0;this.destroyed=false;this.releasePosition=0;this.keyHandler=e=>this.onKey(e);this.render();this.preview(true);
  }
  render(){
    this.root.innerHTML=`<div class="game-selector-head"><h2>Olor</h2><p>Elige el olor que recuerdas.</p></div>
      <div class="game-scent-wheel" tabindex="0" role="listbox" aria-label="Olores"><div class="game-scent-band"></div><div class="game-scent-track"></div></div>
      <button class="game-confirm candy-button primary" type="button">Confirmar olor</button>`;
    this.wheel=this.root.querySelector('.game-scent-wheel');this.track=this.root.querySelector('.game-scent-track');this.confirm=this.root.querySelector('.game-confirm');
    this.rows=this.scents.map((s,i)=>{const row=document.createElement('div');row.className='game-scent-row';row.setAttribute('role','option');row.dataset.index=String(i);row.textContent=s.name;this.track.append(row);return row});
    this.measure();this.paint();
    this.resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{this.measure();this.paint()}):null;this.resizeObserver?.observe(this.wheel);
    this.wheel.addEventListener('pointerdown',e=>this.down(e));this.wheel.addEventListener('pointermove',e=>this.move(e));this.wheel.addEventListener('pointerup',e=>this.up(e));this.wheel.addEventListener('pointercancel',e=>this.cancel(e));
    this.wheel.addEventListener('wheel',e=>{e.preventDefault();if(this.dragging)return;this.step(e.deltaY>0?1:-1)},{passive:false});this.wheel.addEventListener('keydown',this.keyHandler);
    this.confirm.onclick=()=>{if(this.moving||this.dragging)return;this.confirm.disabled=true;this.sounds?.play('scent_manual_lock',.5);this.onConfirm?.(this.scents[this.selectedIndex],this.selectedIndex)};this.updateDisabled();
  }
  measure(){this.stepPx=52;this.wheel?.style.setProperty('--scent-step-px',`${this.stepPx}px`)}
  updateSelected({sound=true,force=false}={}){
    const next=mod(Math.round(this.position),this.scents.length);if(!force&&next===this.selectedIndex)return;this.selectedIndex=next;
    if(sound){this.sounds?.play('scent_tick',.25);haptic(this.sounds,4)}this.preview();
  }
  paint(){
    const scales=[1,.91,.78,.64],opacities=[1,.78,.48,.20];
    for(let i=0;i<this.rows.length;i++){
      const row=this.rows[i],d=circularDelta(i,this.position,this.scents.length),ad=Math.abs(d);
      if(ad>3.65){row.style.visibility='hidden';continue}
      row.style.visibility='visible';const scale=sampleStops(scales,ad),opacity=sampleStops(opacities,ad);
      row.style.setProperty('--scent-y',`${d*this.stepPx}px`);row.style.setProperty('--scent-scale',String(scale));row.style.setProperty('--scent-opacity',String(opacity));row.style.setProperty('--scent-tilt',`${d*-7}deg`);
      const selected=i===this.selectedIndex;row.classList.toggle('selected',selected);row.setAttribute('aria-selected',String(selected));
    }
  }
  updateDisabled(){if(this.confirm)this.confirm.disabled=this.moving||this.dragging}
  preview(force=false){if(force)this.updateSelected({sound:false,force:true});this.onPreview?.(this.scents[this.selectedIndex],this.selectedIndex)}
  stopMotion(){caf(this.rafId);this.rafId=0;this.moving=false;this.velocity=0}
  down(e){if(this.destroyed)return;e.preventDefault();this.stopMotion();this.dragging=true;this.pointerId=e.pointerId;this.lastY=e.clientY;this.lastT=performance.now();this.velocity=0;this.wheel.classList.add('dragging');this.wheel.setPointerCapture?.(e.pointerId);this.updateDisabled()}
  move(e){if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();const now=performance.now(),dy=e.clientY-this.lastY,dt=Math.max(1,now-this.lastT);const instant=-(dy/this.stepPx)/dt;this.velocity=this.velocity*.64+instant*.36;this.position-=dy/this.stepPx;this.lastY=e.clientY;this.lastT=now;this.updateSelected();this.paint()}
  up(e){if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();this.dragging=false;this.wheel.classList.remove('dragging');try{this.wheel.releasePointerCapture?.(e.pointerId)}catch{};this.pointerId=null;this.startInertia(this.velocity)}
  cancel(e){if(this.pointerId!=null&&e.pointerId!==this.pointerId)return;this.freezeForModal()}
  startInertia(v){
    if(this.reducedMotion||Math.abs(v)<.001){this.snap();return}this.moving=true;this.updateDisabled();this.velocity=clamp(v,-.065,.065);this.releasePosition=this.position;let last=performance.now();
    const frame=now=>{if(this.destroyed||!this.moving)return;const dt=Math.min(34,Math.max(1,now-last));last=now;let next=this.position+this.velocity*dt;const travel=next-this.releasePosition;if(Math.abs(travel)>18){next=this.releasePosition+Math.sign(travel)*18;this.velocity=0}this.position=next;this.updateSelected();this.paint();this.velocity*=Math.exp(-.0055*dt);if(Math.abs(this.velocity)<.00095||Math.abs(this.position-this.releasePosition)>=17.999){this.velocity=0;this.snap();return}this.rafId=raf(frame)};this.rafId=raf(frame)
  }
  snap(target=Math.round(this.position)){
    caf(this.rafId);this.rafId=0;const from=this.position,to=target,d=Math.abs(to-from);if(this.reducedMotion||d<.001){this.position=to;this.updateSelected({sound:false});this.paint();this.moving=false;this.updateDisabled();return}
    this.moving=true;this.updateDisabled();const start=performance.now(),dur=clamp(185+d*40,185,240);const frame=now=>{const t=clamp((now-start)/dur,0,1),e=easeOutQuint(t);this.position=from+(to-from)*e;this.updateSelected();this.paint();if(t<1)this.rafId=raf(frame);else{this.position=to;this.updateSelected({sound:false});this.paint();this.moving=false;this.rafId=0;this.updateDisabled();this.sounds?.play('scent_manual_lock',.25)}};this.rafId=raf(frame)
  }
  step(delta){if(this.dragging)return;this.stopMotion();this.moving=true;this.updateDisabled();this.snap(Math.round(this.position)+delta)}
  onKey(e){if(this.dragging)return;if(e.key==='ArrowDown'){e.preventDefault();this.step(1)}else if(e.key==='ArrowUp'){e.preventDefault();this.step(-1)}else if(e.key==='Enter'&&!this.moving){e.preventDefault();this.confirm.click()}}
  freezeForModal(){caf(this.rafId);this.rafId=0;if(this.dragging){try{this.wheel.releasePointerCapture?.(this.pointerId)}catch{}}this.dragging=false;this.moving=false;this.pointerId=null;this.velocity=0;this.wheel?.classList.remove('dragging');this.position=Math.round(this.position);this.updateSelected({sound:false});this.paint();this.updateDisabled()}
  destroy(){this.destroyed=true;this.freezeForModal();this.resizeObserver?.disconnect();this.root.replaceChildren()}
}
