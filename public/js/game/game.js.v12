import { PART_ORDER, VISUAL_PARTS, PART_LABELS, TASK_BY_ID, chooseRoundTasks, seeded, visualFingerprint, validAllive, scoreMemory, diffBuild, skillScore, formatTime, buildDemoAllives, sleep } from './core.js';
import { GameAllive, blankBuild } from './views.js';
import { AssetCarousel, GameScentWheel } from './selectors.js';
import { mountTask } from './tasks.js';
import { preloadCatalogAssets } from '../allive.js';

const $=(s,r=document)=>r.querySelector(s);
const isReduced=()=>matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function initGamePage({catalog,API,sounds,navigate}){
  const root=document.getElementById('allives-game-root');
  if(!root)return null;
  const game=new AllivesGame({root,catalog,API,sounds,navigate});
  game.mount();return game;
}

class AllivesGame{
  constructor({root,catalog,API,sounds,navigate}){
    this.root=root;this.catalog=catalog;this.API=API;this.sounds=sounds;this.navigate=navigate;
    this.mode='start';this.roundNo=0;this.round=null;this.activeTask=null;this.activeSelector=null;this.taskAttempt=0;this.previousTasks=[];this.nextRequested=false;this.nextRoundPromise=null;this.nextRoundError=null;this.clientExitComplete=false;this.timerRAF=0;this.destroyers=[];this.abort=new AbortController();
  }
  mount(){this.showStart()}
  clear(){cancelAnimationFrame(this.timerRAF);this.activeTask?.destroy?.();this.activeTask=null;this.activeSelector?.destroy?.();this.activeSelector=null;for(const d of this.destroyers.splice(0))try{d()}catch{};this.root.replaceChildren();this.roundScene=null;this.clientView=null;this.smallView=null}
  frame(content='',cls=''){this.root.innerHTML=`<div class="allives-game-frame ${cls}">${content}</div>`;this.frameEl=this.root.firstElementChild;return this.frameEl}
  button(label,cls='primary'){return `<button class="candy-button ${cls}" type="button">${label}</button>`}

  showStart(){
    this.clear();this.mode='start';const f=this.frame(`<div class="game-start-decor" aria-hidden="true"></div><div class="game-start-card"><p class="eyebrow">Museo De ALLIVES</p><h1>El Pedido</h1><p>Memoriza un ALLIVE del Museo. Resuelve mini-tasks y reconstruye cada parte sin volver a mirar el pedido.</p><div class="game-start-actions">${this.button('Jugar')} ${this.button('Cómo jugar','secondary')} ${this.button('Volver al Museo','secondary')}</div></div>`,'game-start-screen');
    const [play,how,back]=f.querySelectorAll('.game-start-actions button');play.onclick=()=>this.beginGame();how.onclick=()=>this.showHowTo(0);back.onclick=()=>this.navigate('home');
    this.loadPeekers(f.querySelector('.game-start-decor'));
  }
  async loadPeekers(zone){
    try{let items=[];try{items=(await this.API.list('random',1,7,Math.random())).items||[]}catch{};if(items.length<5)items=buildDemoAllives(this.catalog,7);const slots=[[7,12],[76,10],[3,50],[80,54],[18,76],[68,78],[42,4]];items.slice(0,7).forEach((a,i)=>{const s=document.createElement('div');s.className='game-peeker';s.style.left=`${slots[i][0]}%`;s.style.top=`${slots[i][1]}%`;zone.append(s);const v=new GameAllive(s,this.catalog,a,{hero:true,heroType:['wave','dance','shimmy'][i%3]});this.destroyers.push(()=>v.destroy())})}catch{}
  }
  showHowTo(page){
    this.clear();this.mode='howto';const pages=[
      {title:'Memoriza',body:'Memoriza el ALLIVE y su olor.<br><strong>Tú decides cuándo estás listo.</strong>',demo:'memorize'},
      {title:'Reconstruye',body:'Resuelve un mini-task. Después elige la parte que recuerdas.<br><strong>Repite hasta completar el ALLIVE.</strong>',demo:'rebuild'},
      {title:'Resultados',body:'Memoria cuenta las 8 partes y el olor. SkillScore mide tus intentos en los mini-tasks. El tiempo empieza al tocar <strong>Listo</strong> y termina al confirmar el olor.',demo:'results'}
    ],p=pages[page];const f=this.frame(`<div class="game-how-card"><p class="eyebrow">Cómo jugar · ${page+1}/3</p><h1>${p.title}</h1><p>${p.body}</p><div class="game-how-demo"></div><div class="game-how-actions">${page?this.button('Atrás','secondary'):this.button('Atrás','secondary')} ${page<2?this.button('Siguiente'):this.button('Jugar')}</div></div>`,'game-how-screen');
    const [back,next]=f.querySelectorAll('.game-how-actions button');back.onclick=()=>page?this.showHowTo(page-1):this.showStart();next.onclick=()=>page<2?this.showHowTo(page+1):this.beginGame();this.renderHowDemo(f.querySelector('.game-how-demo'),p.demo);
  }
  renderHowDemo(zone,type){
    const demo=buildDemoAllives(this.catalog,2);if(type==='memorize'){const slot=document.createElement('div');slot.className='tutorial-allive';zone.append(slot);const v=new GameAllive(slot,this.catalog,demo[0]);this.destroyers.push(()=>v.destroy());const s=this.catalog.scents.find(x=>x.id===demo[0].scentId);zone.insertAdjacentHTML('beforeend',`<div class="tutorial-scent">Olor: <strong>${s?.name||''}</strong></div>`)}
    if(type==='rebuild'){zone.innerHTML=`<div class="tutorial-task"><span>○</span><span>○</span><span class="odd">△</span><span>○</span></div><div class="tutorial-arrow">↓ mini-task primero · selector después ↓</div><div class="tutorial-carousel">${this.catalog.poms.slice(0,5).map((x,i)=>`<img class="${i===2?'selected':''}" src="${x.src}" alt="">`).join('')}</div>`}
    if(type==='results'){zone.innerHTML='<div class="tutorial-results"><div><b>Memoria</b><strong>7/9</strong></div><div><b>Tiempo</b><strong>01:42</strong></div><div><b>SkillScore</b><strong>84.2%</strong></div></div>'}
  }
  async beginGame(){
    this.clear();this.mode='loading';this.frame('<div class="game-loading"><div class="game-spinner"></div><strong>Preparando el pedido…</strong></div>','game-loading-screen');
    try{await preloadCatalogAssets(this.catalog);const draft=await this.prepareRound(`round-${Date.now()}-${Math.random()}`);this.roundNo=1;await this.startRound(draft)}catch(e){console.error(e);this.showLoadError('No pudimos cargar el juego.',()=>this.beginGame())}
  }
  async prepareRound(seed){
    const local=/localhost|127\.0\.0\.1/.test(location.hostname)||new URLSearchParams(location.search).has('gameDemo');let items=[];
    try{const data=await this.API.list('random',1,12,seededNumber(seed));items=(data.items||[]).filter(a=>validAllive(a,this.catalog))}catch(e){if(!local)throw e}
    if(items.length<2&&local)items=buildDemoAllives(this.catalog,16);
    if(items.length<2)throw new Error('NOT_ENOUGH_ALLIVES');
    const rng=seeded(seed,'pair'),clients=rng.shuffle(items);let client,target;
    outer:for(const c of clients){for(const t of rng.shuffle(items)){if(c.id!==t.id&&visualFingerprint(c)!==visualFingerprint(t)){client=c;target=t;break outer}}}
    if(!client||!target)throw new Error('NO_SAFE_PAIR');
    return {seed,client,target};
  }
  async startRound(draft){
    this.clear();this.mode='memorize';this.nextRequested=false;this.nextRoundError=null;this.clientExitComplete=false;this.round={...draft,player:blankBuild(this.catalog),preview:blankBuild(this.catalog),committed:new Set(),mistakes:Array(9).fill(0),tasks:chooseRoundTasks(draft.seed,this.previousTasks),step:0,startAt:null,endAt:null,result:null};this.previousTasks=this.round.tasks.map(t=>t.id);this.renderRoundShell();this.showMemorize();
    const nextSeed=`${draft.seed}|next|${this.roundNo+1}`;this.nextRoundPromise=this.prepareRound(nextSeed).catch(e=>{this.nextRoundError=e;return null});
  }
  renderRoundShell(){
    const f=this.frame(`<div class="game-scene"><img class="game-scene-bg" src="/assets/game/shop-background.jpeg" alt=""><div class="game-customer-group"><div class="game-customer"></div></div><img class="game-counter" src="/assets/game/counter.png" alt=""><div class="game-small-build"></div></div><button class="game-exit" type="button">Salir</button><div class="game-timer" hidden>00:00</div><main class="game-workspace"></main><div class="game-control-zone"></div><div class="game-modal-layer"></div>`,'game-round-screen');
    this.roundScene=f.querySelector('.game-scene');this.workspace=f.querySelector('.game-workspace');this.controls=f.querySelector('.game-control-zone');this.timerEl=f.querySelector('.game-timer');this.modalLayer=f.querySelector('.game-modal-layer');f.querySelector('.game-exit').onclick=()=>this.openExitModal();
    const cSlot=f.querySelector('.game-customer'),sSlot=f.querySelector('.game-small-build');this.clientView=new GameAllive(cSlot,this.catalog,this.round.client,{className:'customer-allive'});const partial={...this.round.player,parts:{...blankBuild(this.catalog).parts,...this.round.player.parts}};this.smallView=new GameAllive(sSlot,this.catalog,partial,{visibleParts:[]});this.destroyers.push(()=>this.clientView?.destroy(),()=>this.smallView?.destroy());requestAnimationFrame(()=>f.querySelector('.game-customer-group').classList.add('visible'));
  }
  scentName(id){return this.catalog.scents.find(s=>s.id===id)?.name||id||'—'}
  showMemorize(){
    this.mode='memorize';this.workspace.innerHTML='<div class="memorize-panel"><p class="eyebrow">Pedido</p><h2>Memoriza el ALLIVE y su olor.</h2><div class="memorize-target"></div><div class="memorize-scent"></div><p>Tú decides cuándo estás listo.</p></div>';this.controls.innerHTML=this.button('Listo');const slot=$('.memorize-target',this.workspace);const v=new GameAllive(slot,this.catalog,this.round.target);this.destroyers.push(()=>v.destroy());$('.memorize-scent',this.workspace).innerHTML=`Olor: <strong>${this.scentName(this.round.target.scentId)}</strong>`;this.controls.querySelector('button').onclick=()=>{this.sounds.play('ui_press_01',.55);v.destroy();this.round.startAt=performance.now();this.timerEl.hidden=false;this.startTimer();this.runTaskForStep()}
  }
  startTimer(){cancelAnimationFrame(this.timerRAF);const tick=()=>{if(!this.round?.startAt||this.round.endAt)return;this.timerEl.textContent=formatTime(performance.now()-this.round.startAt);this.timerRAF=requestAnimationFrame(tick)};tick()}
  runTaskForStep(){
    const step=this.round.step;if(step>8)return;this.mode='task';this.activeSelector?.destroy?.();this.activeSelector=null;this.workspace.innerHTML='<div class="task-host"></div>';this.controls.replaceChildren();const meta=this.round.tasks[step];this.taskAttempt=this.taskAttempt||0;const seed=`${this.round.seed}|slot:${step}|attempt:${this.taskAttempt}`;
    this.activeTask=mountTask({root:this.workspace.querySelector('.task-host'),taskId:meta.id,level:step+1,seed,sounds:this.sounds,onSuccess:()=>{this.activeTask?.destroy?.();this.activeTask=null;this.taskAttempt=0;if(step<8)this.showPartSelector(PART_ORDER[step]);else this.showScentSelector()},onFailure:info=>{if(info?.technical){this.invalidateRound('No pudimos preparar un mini-task.');return}this.round.mistakes[step]++;this.taskAttempt++;this.runTaskForStep()}})
  }
  currentVisible(activeKey=null){const keys=VISUAL_PARTS.filter(k=>this.round.committed.has(k));if(activeKey&&VISUAL_PARTS.includes(activeKey)&&!keys.includes(activeKey))keys.push(activeKey);return keys}
  syncBuildViews(activeKey=null){const data={parts:{...blankBuild(this.catalog).parts,...this.round.preview.parts},scentId:this.round.preview.scentId};const keys=this.currentVisible(activeKey);this.smallView.setBuild(data,keys);if(this.bigBuild)this.bigBuild.setBuild(data,keys)}
  showPartSelector(key){
    this.mode='selector';this.workspace.innerHTML=`<div class="build-preview"><div class="big-build"></div></div><div class="selector-host"></div>`;this.controls.replaceChildren();const bigSlot=this.workspace.querySelector('.big-build');const data={parts:{...blankBuild(this.catalog).parts,...this.round.player.parts},scentId:null};this.round.preview={parts:{...data.parts},scentId:null};this.bigBuild=new GameAllive(bigSlot,this.catalog,data,{visibleParts:this.currentVisible(key)});this.destroyers.push(()=>this.bigBuild?.destroy());const items=key.includes('Eye')?this.catalog.gems:this.catalog.poms,rng=seeded(this.round.seed,'selector',key),start=rng.int(0,items.length-1);
    this.activeSelector=new AssetCarousel({root:this.workspace.querySelector('.selector-host'),items,startIndex:start,sounds:this.sounds,label:PART_LABELS[key],reducedMotion:isReduced(),onPreview:item=>{this.round.preview.parts[key]=item.id;this.syncBuildViews(key)},onConfirm:item=>{this.round.player.parts[key]=item.id;this.round.preview.parts[key]=item.id;this.round.committed.add(key);this.syncBuildViews();this.activeSelector.destroy();this.activeSelector=null;this.bigBuild?.destroy();this.bigBuild=null;this.round.step++;this.runTaskForStep()}})
  }
  showScentSelector(){
    this.mode='scent';this.workspace.innerHTML='<div class="selector-host scent-host"></div>';this.controls.replaceChildren();const rng=seeded(this.round.seed,'scent-selector'),start=rng.int(0,this.catalog.scents.length-1);this.activeSelector=new GameScentWheel({root:this.workspace.querySelector('.selector-host'),scents:this.catalog.scents,startIndex:start,sounds:this.sounds,reducedMotion:isReduced(),onPreview:s=>{this.round.preview.scentId=s.id},onConfirm:s=>{const logicalEnd=performance.now();this.round.player.scentId=s.id;this.round.preview.scentId=s.id;this.round.endAt=logicalEnd;cancelAnimationFrame(this.timerRAF);this.timerEl.textContent=formatTime(this.round.endAt-this.round.startAt);this.activeSelector.destroy();this.activeSelector=null;this.completeRound()}})
  }
  completeRound(){
    this.mode='results';const memory=scoreMemory(this.round.player,this.round.target),skill=skillScore(this.round.mistakes),elapsed=this.round.endAt-this.round.startAt,diffs=diffBuild(this.round.player,this.round.target);this.round.result={player:{parts:{...this.round.player.parts},scentId:this.round.player.scentId},target:this.round.target,memory,skill,elapsed,diffs};this.showResults();this.animateDelivery();
  }
  showResults(){
    const r=this.round.result;this.workspace.innerHTML=`<div class="results-panel"><div class="result-builds"><div><b>TU ALLIVE</b><div class="result-player"></div><span class="result-scent ${r.diffs.scentId?'different':''}">${this.scentName(r.player.scentId)}</span></div><div><b>PEDIDO</b><div class="result-target"></div><span class="result-scent">${this.scentName(r.target.scentId)}</span></div></div><div class="result-metrics"><div><span>Memoria</span><strong>${r.memory}/9</strong></div><div><span>Tiempo</span><strong>${formatTime(r.elapsed)}</strong></div><div><span>SkillScore</span><strong>${r.skill.toFixed(1)}%</strong></div></div><button class="candy-button primary result-next" type="button">Siguiente</button></div>`;this.controls.replaceChildren();const pv=new GameAllive(this.workspace.querySelector('.result-player'),this.catalog,r.player),tv=new GameAllive(this.workspace.querySelector('.result-target'),this.catalog,r.target);this.destroyers.push(()=>pv.destroy(),()=>tv.destroy());for(const [k,bad] of Object.entries(r.diffs)){if(k==='scentId'||!bad)continue;pv.view.partEls.get(k)?.el.classList.add('result-different')}
    this.workspace.querySelector('.result-next').onclick=()=>{if(this.nextRequested)return;this.nextRequested=true;this.workspace.querySelector('.result-next').disabled=true;this.maybeAdvance()}
  }
  async animateDelivery(){
    const small=this.frameEl.querySelector('.game-small-build'),cust=this.frameEl.querySelector('.game-customer-group'),arm=this.clientView?.view?.partEls?.get('rightArm')?.img;small.classList.add('pickup-ready');await sleep(isReduced()?120:360);arm?.classList.add('pickup-arm-img');small.classList.add('picked-up');await sleep(isReduced()?120:420);cust.classList.add('celebrate');await sleep(isReduced()?220:760);cust.classList.remove('celebrate');cust.classList.add('exit');small.classList.add('exit-with-client');await sleep(isReduced()?250:620);cust.classList.remove('visible');this.clientExitComplete=true;this.clientView?.destroy();this.clientView=null;this.smallView?.destroy();this.smallView=null;small.remove();this.maybeAdvance()
  }
  async maybeAdvance(){
    if(!this.nextRequested||!this.clientExitComplete||this.advancing)return;this.advancing=true;const next=await this.nextRoundPromise;if(!next){this.advancing=false;this.showNextRoundError();return}this.roundNo++;this.round=null;this.advancing=false;await this.startRound(next)
  }
  showNextRoundError(){
    const old=this.workspace.innerHTML;this.workspace.innerHTML=`<div class="game-error-inline"><h2>No pudimos cargar el siguiente pedido.</h2><p>Comprueba tu conexión e inténtalo de nuevo.</p>${this.button('Reintentar')} ${this.button('Volver al inicio','secondary')}</div>`;const [retry,home]=this.workspace.querySelectorAll('button');retry.onclick=async()=>{try{this.nextRoundPromise=this.prepareRound(`${Date.now()}-retry-next`);this.nextRoundError=null;const next=await this.nextRoundPromise;if(!next)throw new Error();this.roundNo++;await this.startRound(next)}catch{this.showNextRoundError()}};home.onclick=()=>this.showStart()
  }
  openExitModal(){
    if(!['memorize','task','selector','scent'].includes(this.mode)||this.modalLayer.querySelector('.game-exit-modal'))return;this.activeTask?.pauseForModal?.();this.activeSelector?.freezeForModal?.();const modal=document.createElement('div');modal.className='game-exit-modal';modal.innerHTML=`<div role="dialog" aria-modal="true" aria-labelledby="exit-title"><h2 id="exit-title">¿Salir del juego?</h2><p>Perderás esta partida actual.</p><div>${this.button('Cancelar','secondary')} ${this.button('Salir')}</div></div>`;this.modalLayer.append(modal);const [cancel,exit]=modal.querySelectorAll('button');cancel.focus();const close=()=>{modal.remove();this.activeTask?.resumeAfterModal?.()};cancel.onclick=close;exit.onclick=()=>{cancelAnimationFrame(this.timerRAF);this.round=null;this.showStart()};modal.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const buttons=[cancel,exit],i=buttons.indexOf(document.activeElement),next=e.shiftKey?(i<=0?1:i-1):(i>=1?0:i+1);e.preventDefault();buttons[next].focus()}};
  }
  invalidateRound(message){cancelAnimationFrame(this.timerRAF);this.round=null;this.showLoadError(message,()=>this.beginGame())}
  showLoadError(title,retryFn){
    this.clear();this.mode='error';const f=this.frame(`<div class="game-error-screen"><div class="game-error-icon">!</div><h1>${title}</h1><p>Comprueba tu conexión e inténtalo de nuevo.</p><div>${this.button('Reintentar')} ${this.button('Volver al inicio','secondary')}</div></div>`,'game-error');const [retry,home]=f.querySelectorAll('button');retry.onclick=retryFn;home.onclick=()=>this.showStart()
  }
}

function seededNumber(seed){const r=seeded(seed,'api-seed').float();return Math.min(.999999,Math.max(0,r))}
