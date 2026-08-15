import { mod, clamp } from './core.js';

function vibrate(ms=8){try{navigator.vibrate?.(ms)}catch{}}

export class AssetCarousel{
  constructor({root,items,startIndex=0,sounds,onPreview,onConfirm,label='Selecciona',reducedMotion=false}){
    this.root=root;this.items=items;this.index=mod(startIndex,items.length);this.sounds=sounds;this.onPreview=onPreview;this.onConfirm=onConfirm;this.label=label;this.reducedMotion=reducedMotion;
    this.dragging=false;this.moving=false;this.pointerId=null;this.offset=0;this.lastX=0;this.lastT=0;this.velocity=0;this.destroyed=false;this.keyHandler=e=>this.onKey(e);
    this.render();this.preview();
  }
  render(){
    this.root.innerHTML=`<div class="game-selector-head"><h2>${this.label}</h2><p>Desliza · centro = selección</p></div>
      <div class="game-carousel" tabindex="0" role="listbox" aria-label="${this.label}">
        <div class="game-carousel-marker" aria-hidden="true"></div><div class="game-carousel-track"></div>
      </div>
      <button class="game-confirm candy-button primary" type="button">Confirmar</button>`;
    this.carousel=this.root.querySelector('.game-carousel');this.track=this.root.querySelector('.game-carousel-track');this.confirm=this.root.querySelector('.game-confirm');
    this.carousel.addEventListener('pointerdown',e=>this.pointerDown(e));this.carousel.addEventListener('pointermove',e=>this.pointerMove(e));this.carousel.addEventListener('pointerup',e=>this.pointerUp(e));this.carousel.addEventListener('pointercancel',e=>this.pointerCancel(e));this.carousel.addEventListener('keydown',this.keyHandler);
    this.confirm.onclick=()=>{if(this.moving||this.dragging)return;this.confirm.disabled=true;this.sounds?.play('ui_press_01',.5);this.onConfirm?.(this.items[this.index],this.index)};
    this.paint();
  }
  paint(){
    const slots=[];for(let d=-2;d<=2;d++){const idx=mod(this.index+d,this.items.length),item=this.items[idx];slots.push(`<div class="game-carousel-slot ${d===0?'selected':''}" role="option" aria-selected="${d===0}" data-offset="${d}"><img src="${item.src}" alt="${item.name}" draggable="false"><span>${item.name}</span></div>`)}
    this.track.innerHTML=slots.join('');this.track.style.transform=`translateX(${this.offset}px)`;this.confirm.disabled=this.moving||this.dragging;
  }
  preview(){this.onPreview?.(this.items[this.index],this.index)}
  step(delta,{sound=true}={}){if(!delta)return;this.index=mod(this.index+delta,this.items.length);this.offset=0;this.paint();this.preview();if(sound)this.sounds?.play('random_tick_fast',.22);vibrate(5)}
  pointerDown(e){if(this.moving)return;e.preventDefault();this.dragging=true;this.pointerId=e.pointerId;this.lastX=e.clientX;this.lastT=performance.now();this.velocity=0;this.offset=0;this.carousel.setPointerCapture?.(e.pointerId);this.confirm.disabled=true}
  pointerMove(e){if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();const now=performance.now(),dx=e.clientX-this.lastX,dt=Math.max(1,now-this.lastT);this.velocity=dx/dt;this.lastX=e.clientX;this.lastT=now;this.offset=clamp(this.offset+dx,-90,90);const stepPx=68;if(this.offset<=-stepPx){this.index=mod(this.index+1,this.items.length);this.offset+=stepPx;this.sounds?.play('random_tick_fast',.2);vibrate(4);this.preview()}else if(this.offset>=stepPx){this.index=mod(this.index-1,this.items.length);this.offset-=stepPx;this.sounds?.play('random_tick_fast',.2);vibrate(4);this.preview()}this.paint()}
  pointerUp(e){if(!this.dragging||e.pointerId!==this.pointerId)return;this.dragging=false;try{this.carousel.releasePointerCapture?.(e.pointerId)}catch{};const v=this.velocity;this.offset=0;const extra=clamp(Math.round(-v*3.4),-6,6);this.animateSteps(extra)}
  pointerCancel(e){if(e.pointerId!==this.pointerId)return;this.dragging=false;this.offset=0;this.velocity=0;this.paint();this.snap()}
  async animateSteps(steps){this.moving=true;this.paint();const dir=Math.sign(steps),n=Math.abs(steps);for(let i=0;i<n;i++){await new Promise(r=>setTimeout(r,this.reducedMotion?18:55+i*12));if(this.destroyed)return;this.step(dir,{sound:true})}this.moving=false;this.paint();this.sounds?.play('scent_manual_lock',.24)}
  snap(){this.moving=false;this.paint()}
  onKey(e){if(this.moving||this.dragging)return;if(e.key==='ArrowRight'){e.preventDefault();this.step(1)}if(e.key==='ArrowLeft'){e.preventDefault();this.step(-1)}if(e.key==='Enter'){e.preventDefault();this.confirm.click()}}
  freezeForModal(){if(this.dragging){try{this.carousel.releasePointerCapture?.(this.pointerId)}catch{}}this.dragging=false;this.moving=false;this.velocity=0;this.offset=0;this.paint()}
  destroy(){this.destroyed=true;this.freezeForModal();this.root.replaceChildren()}
}

export class GameScentWheel{
  constructor({root,scents,startIndex=0,sounds,onPreview,onConfirm,reducedMotion=false}){
    this.root=root;this.scents=scents;this.index=mod(startIndex,scents.length);this.sounds=sounds;this.onPreview=onPreview;this.onConfirm=onConfirm;this.reducedMotion=reducedMotion;
    this.dragging=false;this.moving=false;this.pointerId=null;this.offset=0;this.velocity=0;this.lastY=0;this.lastT=0;this.destroyed=false;this.keyHandler=e=>this.onKey(e);this.render();this.preview();
  }
  render(){this.root.innerHTML=`<div class="game-selector-head"><h2>Olor</h2><p>Elige el olor que recuerdas.</p></div>
    <div class="game-scent-wheel" tabindex="0" role="listbox" aria-label="Olores"><div class="game-scent-band"></div><div class="game-scent-track"></div></div>
    <button class="game-confirm candy-button primary" type="button">Confirmar olor</button>`;
    this.wheel=this.root.querySelector('.game-scent-wheel');this.track=this.root.querySelector('.game-scent-track');this.confirm=this.root.querySelector('.game-confirm');
    this.wheel.addEventListener('pointerdown',e=>this.down(e));this.wheel.addEventListener('pointermove',e=>this.move(e));this.wheel.addEventListener('pointerup',e=>this.up(e));this.wheel.addEventListener('pointercancel',e=>this.cancel(e));this.wheel.addEventListener('wheel',e=>{e.preventDefault();if(this.moving||this.dragging)return;this.step(e.deltaY>0?1:-1)},{passive:false});this.wheel.addEventListener('keydown',this.keyHandler);
    this.confirm.onclick=()=>{if(this.moving||this.dragging)return;this.confirm.disabled=true;this.sounds?.play('scent_manual_lock',.52);this.onConfirm?.(this.scents[this.index],this.index)};this.paint()}
  paint(){const rows=[];for(let d=-3;d<=3;d++){const idx=mod(this.index+d,this.scents.length),s=this.scents[idx],abs=Math.abs(d);rows.push(`<div class="game-scent-row ${d===0?'selected':''}" role="option" aria-selected="${d===0}" style="--d:${d};--abs:${abs}">${s.name}</div>`)}this.track.innerHTML=rows.join('');this.track.style.transform=`translateY(${this.offset}px)`;this.confirm.disabled=this.moving||this.dragging}
  preview(){this.onPreview?.(this.scents[this.index],this.index)}
  step(d){if(!d)return;this.index=mod(this.index+d,this.scents.length);this.offset=0;this.paint();this.preview();this.sounds?.play('scent_tick',.28);vibrate(5)}
  down(e){if(this.moving)return;e.preventDefault();this.dragging=true;this.pointerId=e.pointerId;this.lastY=e.clientY;this.lastT=performance.now();this.velocity=0;this.offset=0;this.wheel.setPointerCapture?.(e.pointerId);this.confirm.disabled=true}
  move(e){if(!this.dragging||e.pointerId!==this.pointerId)return;e.preventDefault();const now=performance.now(),dy=e.clientY-this.lastY,dt=Math.max(1,now-this.lastT);this.velocity=dy/dt;this.lastY=e.clientY;this.lastT=now;this.offset=clamp(this.offset+dy,-70,70);const stepPx=48;if(this.offset<=-stepPx){this.index=mod(this.index+1,this.scents.length);this.offset+=stepPx;this.preview();this.sounds?.play('scent_tick',.24);vibrate(4)}else if(this.offset>=stepPx){this.index=mod(this.index-1,this.scents.length);this.offset-=stepPx;this.preview();this.sounds?.play('scent_tick',.24);vibrate(4)}this.paint()}
  up(e){if(!this.dragging||e.pointerId!==this.pointerId)return;this.dragging=false;try{this.wheel.releasePointerCapture?.(e.pointerId)}catch{};const extra=clamp(Math.round(-this.velocity*4),-9,9);this.offset=0;this.animate(extra)}
  cancel(e){if(e.pointerId!==this.pointerId)return;this.freezeForModal()}
  async animate(steps){this.moving=true;this.paint();const n=Math.abs(steps),dir=Math.sign(steps);if(n)this.sounds?.play('scent_flick_start',.35);for(let i=0;i<n;i++){await new Promise(r=>setTimeout(r,this.reducedMotion?16:34+i*9));if(this.destroyed)return;this.step(dir)}this.moving=false;this.paint();this.sounds?.play('scent_manual_lock',.45)}
  onKey(e){if(this.moving||this.dragging)return;if(e.key==='ArrowDown'){e.preventDefault();this.step(1)}if(e.key==='ArrowUp'){e.preventDefault();this.step(-1)}if(e.key==='Enter'){e.preventDefault();this.confirm.click()}}
  freezeForModal(){if(this.dragging){try{this.wheel.releasePointerCapture?.(this.pointerId)}catch{}}this.dragging=false;this.moving=false;this.velocity=0;this.offset=0;this.paint()}
  destroy(){this.destroyed=true;this.freezeForModal();this.root.replaceChildren()}
}
