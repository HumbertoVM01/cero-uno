import { mod, clamp } from './core.js';

function vibrate(ms=8){try{navigator.vibrate?.(ms)}catch{}}
const raf=fn=>requestAnimationFrame(fn);
const caf=id=>id&&cancelAnimationFrame(id);
const easeOutCubic=t=>1-Math.pow(1-t,3);

export class AssetCarousel{
  constructor({root,items,startIndex=0,sounds,onPreview,onConfirm,label='Selecciona',reducedMotion=false}){
    this.root=root;this.items=items;this.index=mod(startIndex,items.length);this.sounds=sounds;this.onPreview=onPreview;this.onConfirm=onConfirm;this.label=label;this.reducedMotion=reducedMotion;
    this.dragging=false;this.moving=false;this.pointerId=null;this.offset=0;this.lastX=0;this.lastT=0;this.velocity=0;this.rafId=0;this.destroyed=false;
    this.keyHandler=e=>this.onKey(e);this.render();this.preview();
  }
  render(){
    this.root.innerHTML=`<div class="game-selector-head"><h2>${this.label}</h2><p>Desliza · centro = selección</p></div>
      <div class="game-carousel" tabindex="0" role="listbox" aria-label="${this.label}">
        <div class="game-carousel-marker" aria-hidden="true"></div><div class="game-carousel-track"></div>
      </div>
      <button class="game-confirm candy-button primary" type="button">Confirmar</button>`;
    this.carousel=this.root.querySelector('.game-carousel');this.track=this.root.querySelector('.game-carousel-track');this.confirm=this.root.querySelector('.game-confirm');
    this.slots=[];
    for(let i=0;i<7;i++){
      const slot=document.createElement('div');slot.className='game-carousel-slot';slot.setAttribute('role','option');
      slot.innerHTML='<img alt="" draggable="false"><span></span>';this.track.append(slot);this.slots.push(slot);
    }
    this.measure();this.syncSlots();this.applyTransform();
    this.resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{this.measure();this.applyTransform()}):null;this.resizeObserver?.observe(this.carousel);
    this.carousel.addEventListener('pointerdown',e=>this.pointerDown(e));this.carousel.addEventListener('pointermove',e=>this.pointerMove(e));this.carousel.addEventListener('pointerup',e=>this.pointerUp(e));this.carousel.addEventListener('pointercancel',e=>this.pointerCancel(e));this.carousel.addEventListener('keydown',this.keyHandler);
    this.confirm.onclick=()=>{if(this.moving||this.dragging)return;this.confirm.disabled=true;this.sounds?.play('ui_press_01',.5);this.onConfirm?.(this.items[this.index],this.index)};
    this.updateDisabled();
  }
  measure(){const w=this.carousel?.clientWidth||260;this.stepPx=Math.max(44,w/5);this.carousel?.style.setProperty('--carousel-slot-px',`${this.stepPx}px`)}
  syncSlots(){
    for(let i=0;i<this.slots.length;i++){
      const d=i-3,idx=mod(this.index+d,this.items.length),item=this.items[idx],slot=this.slots[i],img=slot.querySelector('img'),name=slot.querySelector('span');
      slot.classList.toggle('selected',d===0);slot.dataset.offset=d;slot.setAttribute('aria-selected',String(d===0));img.src=item.src;img.alt=item.name;name.textContent=item.name;
    }
  }
  applyTransform(){if(this.track)this.track.style.transform=`translate3d(${this.offset}px,0,0)`}
  updateDisabled(){if(this.confirm)this.confirm.disabled=this.moving||this.dragging}
  preview(){this.onPreview?.(this.items[this.index],this.index)}
  commitIndex(delta,{sound=true}={}){if(!delta)return;this.index=mod(this.index+delta,this.items.length);this.syncSlots();this.preview();if(sound)this.sounds?.play('random_tick_fast',.19);vibrate(4)}
  normalizeOffset(){
    const half=this.stepPx*.5;let changed=false;
    while(this.offset<=-half){this.offset+=this.stepPx;this.index=mod(this.index+1,this.items.length);changed=true;this.sounds?.play('random_tick_fast',.18);vibrate(4)}
    while(this.offset>=half){this.offset-=this.stepPx;this.index=mod(this.index-1,this.items.length);changed=true;this.sounds?.play('random_tick_fast',.18);vibrate(4)}
    if(changed){this.syncSlots();this.preview()}
  }
  pointerDown(e){if(this.moving||this.destroyed)return;e.preventDefault();caf(this.rafId);this.rafId=0;this.dragging=true;this.pointerId=e.pointerId;this.lastX=e.clientX;this.lastT=performance.now();this.velocity=0;this.carousel.classList.add('dragging');this.carousel.setPointerCapture?.(e.pointerId);this.updateDisabled()}
  pointerMove(e){if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();const now=performance.now(),dx=e.clientX-this.lastX,dt=Math.max(1,now-this.lastT),instant=dx/dt;this.velocity=this.velocity*.68+instant*.32;this.lastX=e.clientX;this.lastT=now;this.offset+=dx;this.normalizeOffset();this.applyTransform()}
  pointerUp(e){if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();this.dragging=false;this.carousel.classList.remove('dragging');try{this.carousel.releasePointerCapture?.(e.pointerId)}catch{};this.pointerId=null;this.startInertia(this.velocity)}
  pointerCancel(e){if(this.pointerId!=null&&e.pointerId!==this.pointerId)return;this.freezeForModal()}
  startInertia(v){
    if(this.reducedMotion||Math.abs(v)<.08){this.velocity=0;this.snapToCenter();return}
    this.moving=true;this.updateDisabled();this.velocity=clamp(v,-2.2,2.2);let last=performance.now();
    const frame=now=>{if(this.destroyed||!this.moving)return;const dt=Math.min(34,Math.max(1,now-last));last=now;this.offset+=this.velocity*dt;this.normalizeOffset();this.applyTransform();this.velocity*=Math.exp(-.0065*dt);if(Math.abs(this.velocity)<.035){this.velocity=0;this.snapToCenter();return}this.rafId=raf(frame)};
    this.rafId=raf(frame);
  }
  snapToCenter(){
    caf(this.rafId);this.rafId=0;const from=this.offset;if(this.reducedMotion||Math.abs(from)<.5){this.offset=0;this.moving=false;this.applyTransform();this.updateDisabled();return}
    this.moving=true;this.updateDisabled();const start=performance.now(),dur=145;
    const frame=now=>{if(this.destroyed)return;const t=clamp((now-start)/dur,0,1);this.offset=from*(1-easeOutCubic(t));this.applyTransform();if(t<1)this.rafId=raf(frame);else{this.offset=0;this.moving=false;this.rafId=0;this.applyTransform();this.updateDisabled();this.sounds?.play('scent_manual_lock',.22)}};this.rafId=raf(frame)
  }
  step(delta){if(this.moving||this.dragging||!delta)return;this.commitIndex(delta);this.offset=0;this.applyTransform()}
  onKey(e){if(this.moving||this.dragging)return;if(e.key==='ArrowRight'){e.preventDefault();this.step(1)}else if(e.key==='ArrowLeft'){e.preventDefault();this.step(-1)}else if(e.key==='Enter'){e.preventDefault();this.confirm.click()}}
  freezeForModal(){caf(this.rafId);this.rafId=0;if(this.dragging){try{this.carousel.releasePointerCapture?.(this.pointerId)}catch{}}this.dragging=false;this.moving=false;this.pointerId=null;this.velocity=0;this.carousel?.classList.remove('dragging');this.normalizeOffset();this.offset=0;this.applyTransform();this.updateDisabled()}
  destroy(){this.destroyed=true;this.freezeForModal();this.resizeObserver?.disconnect();this.root.replaceChildren()}
}

export class GameScentWheel{
  constructor({root,scents,startIndex=0,sounds,onPreview,onConfirm,reducedMotion=false}){
    this.root=root;this.scents=scents;this.index=mod(startIndex,scents.length);this.sounds=sounds;this.onPreview=onPreview;this.onConfirm=onConfirm;this.reducedMotion=reducedMotion;
    this.dragging=false;this.moving=false;this.pointerId=null;this.offset=0;this.velocity=0;this.lastY=0;this.lastT=0;this.rafId=0;this.destroyed=false;this.keyHandler=e=>this.onKey(e);this.render();this.preview();
  }
  render(){
    this.root.innerHTML=`<div class="game-selector-head"><h2>Olor</h2><p>Elige el olor que recuerdas.</p></div>
      <div class="game-scent-wheel" tabindex="0" role="listbox" aria-label="Olores"><div class="game-scent-band"></div><div class="game-scent-track"></div></div>
      <button class="game-confirm candy-button primary" type="button">Confirmar olor</button>`;
    this.wheel=this.root.querySelector('.game-scent-wheel');this.track=this.root.querySelector('.game-scent-track');this.confirm=this.root.querySelector('.game-confirm');
    this.rows=[];for(let i=0;i<9;i++){const row=document.createElement('div');row.className='game-scent-row';row.setAttribute('role','option');this.track.append(row);this.rows.push(row)}
    this.measure();this.syncRows();this.applyTransform();
    this.resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>this.measure()):null;this.resizeObserver?.observe(this.wheel);
    this.wheel.addEventListener('pointerdown',e=>this.down(e));this.wheel.addEventListener('pointermove',e=>this.move(e));this.wheel.addEventListener('pointerup',e=>this.up(e));this.wheel.addEventListener('pointercancel',e=>this.cancel(e));this.wheel.addEventListener('wheel',e=>{e.preventDefault();if(this.moving||this.dragging)return;this.step(e.deltaY>0?1:-1)},{passive:false});this.wheel.addEventListener('keydown',this.keyHandler);
    this.confirm.onclick=()=>{if(this.moving||this.dragging)return;this.confirm.disabled=true;this.sounds?.play('scent_manual_lock',.5);this.onConfirm?.(this.scents[this.index],this.index)};this.updateDisabled();
  }
  measure(){this.stepPx=38;this.wheel?.style.setProperty('--scent-step-px',`${this.stepPx}px`)}
  syncRows(){for(let i=0;i<this.rows.length;i++){const d=i-4,idx=mod(this.index+d,this.scents.length),s=this.scents[idx],row=this.rows[i];row.textContent=s.name;row.dataset.offset=d;row.style.setProperty('--d',d);row.style.setProperty('--abs',Math.abs(d));row.classList.toggle('selected',d===0);row.setAttribute('aria-selected',String(d===0))}}
  applyTransform(){if(this.track)this.track.style.transform=`translate3d(0,${this.offset}px,0)`}
  updateDisabled(){if(this.confirm)this.confirm.disabled=this.moving||this.dragging}
  preview(){this.onPreview?.(this.scents[this.index],this.index)}
  normalizeOffset(){const half=this.stepPx*.5;let changed=false;while(this.offset<=-half){this.offset+=this.stepPx;this.index=mod(this.index+1,this.scents.length);changed=true;this.sounds?.play('scent_tick',.2);vibrate(4)}while(this.offset>=half){this.offset-=this.stepPx;this.index=mod(this.index-1,this.scents.length);changed=true;this.sounds?.play('scent_tick',.2);vibrate(4)}if(changed){this.syncRows();this.preview()}}
  down(e){if(this.moving||this.destroyed)return;e.preventDefault();caf(this.rafId);this.rafId=0;this.dragging=true;this.pointerId=e.pointerId;this.lastY=e.clientY;this.lastT=performance.now();this.velocity=0;this.wheel.classList.add('dragging');this.wheel.setPointerCapture?.(e.pointerId);this.updateDisabled()}
  move(e){if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();const now=performance.now(),dy=e.clientY-this.lastY,dt=Math.max(1,now-this.lastT),instant=dy/dt;this.velocity=this.velocity*.68+instant*.32;this.lastY=e.clientY;this.lastT=now;this.offset+=dy;this.normalizeOffset();this.applyTransform()}
  up(e){if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();this.dragging=false;this.wheel.classList.remove('dragging');try{this.wheel.releasePointerCapture?.(e.pointerId)}catch{};this.pointerId=null;this.startInertia(this.velocity)}
  cancel(e){if(this.pointerId!=null&&e.pointerId!==this.pointerId)return;this.freezeForModal()}
  startInertia(v){if(this.reducedMotion||Math.abs(v)<.075){this.velocity=0;this.snapToCenter();return}this.moving=true;this.updateDisabled();this.velocity=clamp(v,-2.35,2.35);if(Math.abs(this.velocity)>.3)this.sounds?.play('scent_flick_start',.28);let last=performance.now();const frame=now=>{if(this.destroyed||!this.moving)return;const dt=Math.min(34,Math.max(1,now-last));last=now;this.offset+=this.velocity*dt;this.normalizeOffset();this.applyTransform();this.velocity*=Math.exp(-.0062*dt);if(Math.abs(this.velocity)<.032){this.velocity=0;this.snapToCenter();return}this.rafId=raf(frame)};this.rafId=raf(frame)}
  snapToCenter(){caf(this.rafId);this.rafId=0;const from=this.offset;if(this.reducedMotion||Math.abs(from)<.5){this.offset=0;this.moving=false;this.applyTransform();this.updateDisabled();return}this.moving=true;this.updateDisabled();const start=performance.now(),dur=135;const frame=now=>{if(this.destroyed)return;const t=clamp((now-start)/dur,0,1);this.offset=from*(1-easeOutCubic(t));this.applyTransform();if(t<1)this.rafId=raf(frame);else{this.offset=0;this.moving=false;this.rafId=0;this.applyTransform();this.updateDisabled();this.sounds?.play('scent_manual_lock',.35)}};this.rafId=raf(frame)}
  step(d){if(this.moving||this.dragging||!d)return;this.index=mod(this.index+d,this.scents.length);this.offset=0;this.syncRows();this.applyTransform();this.preview();this.sounds?.play('scent_tick',.24);vibrate(5)}
  onKey(e){if(this.moving||this.dragging)return;if(e.key==='ArrowDown'){e.preventDefault();this.step(1)}else if(e.key==='ArrowUp'){e.preventDefault();this.step(-1)}else if(e.key==='Enter'){e.preventDefault();this.confirm.click()}}
  freezeForModal(){caf(this.rafId);this.rafId=0;if(this.dragging){try{this.wheel.releasePointerCapture?.(this.pointerId)}catch{}}this.dragging=false;this.moving=false;this.pointerId=null;this.velocity=0;this.wheel?.classList.remove('dragging');this.normalizeOffset();this.offset=0;this.applyTransform();this.updateDisabled()}
  destroy(){this.destroyed=true;this.freezeForModal();this.resizeObserver?.disconnect();this.root.replaceChildren()}
}
