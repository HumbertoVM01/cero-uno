import { API } from './api.js';
import { sounds } from './audio.js';
import { AlliveView, REACTIONS, preloadCatalogAssets, glowMaskSrc } from './allive.js';
import { CardMaker } from './card.js';
import { initGamePage } from './game/game.js';

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rand=a=>a[Math.floor(Math.random()*a.length)];
const fmt=n=>new Intl.NumberFormat('es-MX').format(Number(n||0));
const visitorToken=(()=>{let t=localStorage.getItem('allive-visitor');if(!t){t=crypto.randomUUID();localStorage.setItem('allive-visitor',t)}return t})();
let catalog, cardMaker, creatorView, gameController;
const pomParts=new Set(['body','top','leftArm','rightArm','leftLeg','rightLeg']);
const partNames={body:'Cuerpo',top:'Pompón Superior',leftArm:'Brazo Izquierdo',rightArm:'Brazo Derecho',leftLeg:'Pierna Izquierda',rightLeg:'Pierna Derecha',leftEye:'Ojo Izquierdo',rightEye:'Ojo Derecho'};

const creator={parts:{},scentId:null,selected:'body',lastSelected:'body',scentIndex:0,busy:false};
const museum={view:'random',items:[],total:0,start:1,seed:Math.random(),busy:false,fast:false,scrollTimer:null,lastScrollTop:0,lastScrollTime:performance.now(),stages:[],focusedId:null,lastRank:new Map(),cooldownUntil:0,liveTimer:null,presenceTimer:null,liveTicks:0};

document.addEventListener('pointerdown',()=>sounds.unlock(),{capture:true,passive:true});

async function init(){
  const catalogPromise=fetch('/data/catalog.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Catalog ${r.status}`);return r.json()});
  const soundPromise=sounds.preloadCritical();
  catalog=await catalogPromise;
  preloadCatalogAssets(catalog);
  await soundPromise;
  cardMaker=new CardMaker($('#trading-card-canvas'),catalog);initSound();initNav();initCreator();initCardDialog();initMuseum();gameController=initGamePage({catalog,API,sounds,navigate});await loadHome();
  const params=new URLSearchParams(location.search);const page=params.get('page');const allive=params.get('allive');if(page==='create')navigate('create',false);else if(page==='game')navigate('game',false);else if(page==='caress'||allive){navigate('caress',false);if(allive)await openSharedAllive(allive)}else navigate('home',false);
}

function initSound(){const b=$('#sound-toggle');const paint=()=>{const on=sounds.enabled;b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Silenciar sonidos':'Activar sonidos');b.title=on?'Sonido Activado':'Sonido Silenciado'};paint();b.onclick=()=>{sounds.setEnabled(!sounds.enabled);paint();if(sounds.enabled)sounds.play('ui_press_01',.55)}}
function initNav(){$$('.nav-link').forEach(b=>b.addEventListener('click',()=>{sounds.play('nav_tab',.4);navigate(b.dataset.page)}));window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search).get('page')||'home';navigate(p,false)})}
function navigate(page,push=true){if(!['home','create','caress','game'].includes(page))page='home';$$('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===page));document.body.classList.toggle('game-mode',page==='game');$$('.main-nav .nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===page));if(push){const u=new URL(location.href);if(page==='home')u.search='';else{u.search='';u.searchParams.set('page',page)}history.pushState({},'',u)}if(page==='caress'){startPresence();startLive()}else{stopPresence();stopLive()}window.scrollTo({top:0,behavior:'smooth'})}

function randomCreatorState(){for(const k of Object.keys(partNames)){creator.parts[k]=rand(pomParts.has(k)?catalog.poms:catalog.gems).id}creator.scentIndex=Math.floor(Math.random()*catalog.scents.length);creator.scentId=catalog.scents[creator.scentIndex].id}
function creatorData(){return {parts:{...creator.parts},scentId:creator.scentId,subjectName:$('#subject-name').value.trim(),exhibitedBy:$('#exhibited-by').value.trim()||null}}
function initCreator(){
  randomCreatorState();
  creatorView=new AlliveView($('#creator-allive'),catalog,creatorData(),{interactive:true,onPartClick:selectPart});
  creatorView.select('body');
  initAssetCase();updateAssetCaseContext();renderScentWheel();renderScentInfo();
  $('#random-part').onclick=randomizePart;$('#random-allive').onclick=randomizeAllive;$('#random-scent').onclick=()=>randomizeScent(true);$('#creator-photo').onclick=()=>openCreatorCard();$('#exhibit-allive').onclick=exhibitCreator;setupScentGestures();$('#subject-name').addEventListener('input',clearCreatorMessage);$('#exhibited-by').addEventListener('input',clearCreatorMessage)
}
function clearCreatorMessage(){const m=$('#creator-message');m.textContent='';m.classList.remove('bump')}
function message(text){const m=$('#creator-message');m.textContent=text;m.classList.remove('bump');void m.offsetWidth;m.classList.add('bump')}
function selectPart(key){
  if(creator.busy)return;
  if(!key){creator.selected=null;creatorView.select(null);$('#display-case-title').textContent='Selecciona Una Parte';updateAssetCaseContext();return}
  creator.selected=key;creator.lastSelected=key;creatorView.select(key);$('#display-case-title').textContent=partNames[key];
  sounds.playVariant(pomParts.has(key)?'pom_touch':'gem_touch',2,.65);updateAssetCaseContext();
}
function initAssetCase(){
  const box=$('#asset-case');box.replaceChildren();
  for(const [kind,items] of [['pom',catalog.poms],['gem',catalog.gems]]){
    const group=document.createElement('div');group.className='asset-case-group';group.dataset.kind=kind;
    for(const item of items){
      const b=document.createElement('button');b.className='asset-choice';b.dataset.asset=item.id;b.dataset.kind=kind;b.title=item.name;
      const glow=document.createElement('span');glow.className='choice-glow';
      const glowImg=document.createElement('img');glowImg.className='choice-glow-copy';glowImg.alt='';glowImg.draggable=false;glow.append(glowImg);
      glowMaskSrc(item.src).then(src=>glowImg.src=src);
      const img=document.createElement('img');img.src=item.src;img.alt=item.name;img.decoding='async';img.draggable=false;
      b.append(glow,img);
      b.onclick=()=>{const key=creator.selected;if(!key)return;const expected=pomParts.has(key)?'pom':'gem';if(expected!==kind)return;setPart(key,item.id,true)};
      group.append(b)
    }
    box.append(group)
  }
}
function updateAssetCaseContext(){
  const display=$('.display-case'),box=$('#asset-case'),randomButton=$('#random-part');
  if(!creator.selected){
    display.classList.add('idle');box.setAttribute('aria-hidden','true');randomButton.hidden=true;randomButton.disabled=true;
    $$('.asset-case-group',box).forEach(g=>g.hidden=true);
    return;
  }
  display.classList.remove('idle');box.removeAttribute('aria-hidden');randomButton.hidden=false;randomButton.disabled=false;
  const key=creator.selected,kind=pomParts.has(key)?'pom':'gem';
  const scale=key==='body'?0.9:key==='top'?0.782:pomParts.has(key)?0.611:0.621;
  $$('.asset-case-group',box).forEach(g=>{g.hidden=g.dataset.kind!==kind;if(!g.hidden)$$('.asset-choice',g).forEach(b=>{b.style.setProperty('--choice-scale',String(scale));b.classList.toggle('selected',b.dataset.asset===creator.parts[key])})});
}
function syncAssetCaseSelection(){
  const key=creator.selected;if(!key){updateAssetCaseContext();return}
  const kind=pomParts.has(key)?'pom':'gem',current=creator.parts[key];
  $$('.asset-case-group',$('#asset-case')).forEach(g=>{if(g.dataset.kind===kind)$$('.asset-choice',g).forEach(b=>b.classList.toggle('selected',b.dataset.asset===current))})
}
async function setPart(key,id,withSound=false){
  creator.parts[key]=id;const committed=await creatorView.updatePart(key,id);if(withSound&&committed)sounds.playVariant(pomParts.has(key)?'pom_place':'gem_place',2,.72);syncAssetCaseSelection();clearCreatorMessage()
}
async function randomizePart(){
  if(creator.busy||!creator.selected)return;creator.busy=true;
  const key=creator.selected,items=pomParts.has(key)?catalog.poms:catalog.gems,final=rand(items).id;
  sounds.play('random_start',.58);creatorView.setPartRandomizing(key,true);
  const delays=[45,55,70,90,130,180,240];
  for(let i=0;i<delays.length;i++){
    const id=i===delays.length-1?final:rand(items).id;creator.parts[key]=id;await creatorView.updatePart(key,id);syncAssetCaseSelection();sounds.play(i<2?'random_tick_fast':i<5?'random_tick_medium':'random_tick_slow',.35);await sleep(delays[i])
  }
  sounds.play(pomParts.has(key)?'pom_random_land':'gem_random_land',.72);creatorView.setPartRandomizing(key,false);syncAssetCaseSelection();creator.busy=false;clearCreatorMessage()
}
async function randomizeAllive(){
  if(creator.busy)return;creator.busy=true;const selectedBefore=creator.selected;
  sounds.play('random_start',.64);creatorView.setAllRandomizing(true);
  const keys=Object.keys(partNames),final={};for(const k of keys)final[k]=rand(pomParts.has(k)?catalog.poms:catalog.gems).id;
  const delays=[50,55,65,80,100,130,165,210];
  for(let i=0;i<delays.length;i++){
    const updates=[];
    for(const k of keys){const id=i===delays.length-1?final[k]:rand(pomParts.has(k)?catalog.poms:catalog.gems).id;creator.parts[k]=id;updates.push(creatorView.updatePart(k,id))}
    await Promise.all(updates);syncAssetCaseSelection();sounds.play(i<3?'random_tick_fast':i<6?'random_tick_medium':'random_tick_slow',.30);await sleep(delays[i])
  }
  sounds.play('pom_random_land',.35);await sleep(80);sounds.play('gem_random_land',.52);await sleep(80);sounds.play('allive_random_finish',.72);
  creatorView.setAllRandomizing(false);creatorView.select(selectedBefore);creator.selected=selectedBefore;updateAssetCaseContext();creator.busy=false;clearCreatorMessage()
}

function wrapIndex(i){const n=catalog.scents.length;return ((i%n)+n)%n}
function setScentIndex(i,{sound=false}={}){creator.scentIndex=wrapIndex(i);creator.scentId=catalog.scents[creator.scentIndex].id;if(sound)sounds.play('scent_tick',.34);renderScentWheel();renderScentInfo();clearCreatorMessage()}
function renderScentWheel(){const track=$('#scent-wheel-track');track.replaceChildren();for(let d=-3;d<=3;d++){const idx=wrapIndex(creator.scentIndex+d),s=catalog.scents[idx];const r=document.createElement('div');r.className='scent-row'+(d===0?' active':'');r.textContent=s.name;const abs=Math.abs(d);const y=d*52,scale=[1,.91,.78,.64][abs],op=[1,.78,.48,.2][abs];r.style.transform=`translateY(${y}px) scale(${scale}) perspective(300px) rotateX(${d*-7}deg)`;r.style.opacity=op;track.append(r)}}
function renderScentInfo(){const s=catalog.scents[creator.scentIndex];$('#scent-info').innerHTML=`<h3>${s.name}</h3><p><strong>Cómo huele:</strong> ${s.description}</p><p class="notes"><strong>Notas:</strong> ${s.notes.join(' · ')}</p>`}
function setupScentGestures(){const wheel=$('#scent-wheel');let dragging=false,startY=0,startIndex=0,lastY=0,lastT=0,velocity=0,lastRendered=creator.scentIndex;wheel.addEventListener('pointerdown',e=>{if(creator.busy)return;dragging=true;wheel.setPointerCapture(e.pointerId);startY=lastY=e.clientY;startIndex=creator.scentIndex;lastT=performance.now();velocity=0});wheel.addEventListener('pointermove',e=>{if(!dragging)return;const now=performance.now(),dy=e.clientY-lastY;velocity=dy/Math.max(1,now-lastT);lastY=e.clientY;lastT=now;const steps=Math.round(-(e.clientY-startY)/43);const idx=wrapIndex(startIndex+steps);if(idx!==lastRendered){lastRendered=idx;setScentIndex(idx,{sound:true})}});const end=async e=>{if(!dragging)return;dragging=false;try{wheel.releasePointerCapture(e.pointerId)}catch{}if(Math.abs(velocity)>1.05){await randomizeScent(true)}else sounds.play('scent_manual_lock',.58)};wheel.addEventListener('pointerup',end);wheel.addEventListener('pointercancel',()=>dragging=false);wheel.addEventListener('wheel',e=>{e.preventDefault();if(creator.busy)return;setScentIndex(creator.scentIndex+(e.deltaY>0?1:-1),{sound:true});clearTimeout(wheel._lockTimer);wheel._lockTimer=setTimeout(()=>sounds.play('scent_manual_lock',.5),140)},{passive:false})}
async function randomizeScent(fromFlick=false){if(creator.busy)return;creator.busy=true;sounds.play('scent_flick_start',.6);sounds.loop('scent_spin_loop',.26);const total=18+Math.floor(Math.random()*14),dir=Math.random()>.5?1:-1;for(let i=0;i<total;i++){const progress=i/(total-1);const delay=25+Math.pow(progress,2.7)*150;setScentIndex(creator.scentIndex+dir,{sound:false});if(progress>.55){sounds.stopLoop('scent_spin_loop');sounds.play(progress>.82?'scent_tick':'random_tick_fast',.26)}await sleep(delay)}sounds.stopLoop('scent_spin_loop');sounds.play('scent_random_lock',.68);creator.busy=false}

async function openCreatorCard(){const name=$('#subject-name').value.trim();if(!name){sounds.play('validation_missing',.7);message('Dinos De Qué Es Tu ALLIVE Para Poder Tomar Su Foto');$('#subject-name').focus();return}sounds.play('photo_card',.58);await takePhoto(creatorData(),name,$('#exhibited-by').value.trim()||null)}
async function exhibitCreator(){if(creator.busy)return;const data=creatorData();if(!data.subjectName){sounds.play('validation_missing',.72);message('Dinos De Qué Es Tu ALLIVE Para Poder Exhibirlo');$('#subject-name').focus();return}creator.busy=true;clearCreatorMessage();sounds.play('ui_press_01',.5);try{const result=await API.exhibit({subjectName:data.subjectName,exhibitedBy:data.exhibitedBy,parts:data.parts,scentId:data.scentId});sounds.play('exhibit_transition',.64);creatorView.stage.classList.add('caressed');await sleep(450);sounds.play('exhibit_arrival',.75);await sleep(180);navigate('caress');museum.focusedId=result.allive.id;await openSharedAllive(result.allive.id)}catch(e){if(e.status===409){sounds.play('duplicate_allive',.72);message('Éste ALLIVE Ya Ha Sido Exhibido Anteriormente')}else if(e.data?.error==='DATABASE_NOT_CONFIGURED'){message('Conecta Neon Para Poder Exhibir ALLIVES')}else{message('No Se Pudo Exhibir El ALLIVE. Intenta De Nuevo.')}}finally{creatorView.stage.classList.remove('caressed');creator.busy=false}}

function initCardDialog(){const d=$('#card-dialog');$('#card-close').onclick=$('#card-back').onclick=()=>d.close();$('#card-save').onclick=async()=>{sounds.play('ui_press_02',.5);const r=await cardMaker.save();const note=$('#card-save-note');if(r.mode==='share')note.textContent='Se abrió el menú del dispositivo. En iPhone puedes elegir Guardar Imagen para ponerla en Fotos.';else if(r.mode==='download')note.textContent='El navegador guardó la ficha como imagen.';else note.textContent=''}}
async function showCard(data,name,exhibitedBy){$('#card-save-note').textContent='';await cardMaker.render(data,{subjectName:name,exhibitedBy});const d=$('#card-dialog');if(!d.open)d.showModal()}
async function takePhoto(data,name,exhibitedBy){await showCard(data,name,exhibitedBy);const result=await cardMaker.save();const note=$('#card-save-note');if(result.mode==='share')note.textContent='Se abrió el menú del dispositivo. En iPhone puedes elegir Guardar Imagen para ponerla en Fotos.';else if(result.mode==='download')note.textContent='La ficha se guardó como imagen.';else if(result.mode==='cancel')note.textContent='La ficha está lista. Puedes guardarla cuando quieras.'}

async function loadHome(){const zone=$('#home-champions');try{const {items}=await API.home();zone.replaceChildren();if(!items.length){zone.innerHTML='<div class="champion" style="grid-column:1/-1;padding:35px"><strong>El Museo Está Esperando Sus Primeros ALLIVES</strong></div>';return}items.forEach((a,i)=>{const wrap=document.createElement('article');wrap.className='champion';const slot=document.createElement('div');wrap.append(slot);wrap.insertAdjacentHTML('beforeend',`<div class="champion-name">ALLIVE De ${escapeHtml(a.subjectName)}</div><div class="champion-count">♡ ${fmt(a.caresses.total)} caricias</div>`);zone.append(wrap);const v=new AlliveView(slot,catalog,a,{hero:true,heroType:REACTIONS[i%REACTIONS.length]});setTimeout(()=>v.caress(REACTIONS[i%REACTIONS.length],false),220+i*160)})}catch{zone.innerHTML='<div class="champion" style="grid-column:1/-1;padding:35px"><strong>Conecta Neon Para Activar La Exhibición</strong></div>'}}

function initMuseum(){
  $$('.ranking-tab').forEach(b=>b.onclick=async()=>{sounds.play('nav_tab',.4);museum.view=b.dataset.view;museum.seed=Math.random();museum.focusedId=null;const u=new URL(location.href);u.searchParams.set('page','caress');u.searchParams.delete('allive');history.replaceState({},'',u);paintViewTabs();$('#museum-scroller').scrollTop=0;await loadMuseum(1)});
  $('#refresh-random').onclick=async()=>{if(museum.view!=='random')return;sounds.play('refresh_allives',.6);museum.seed=Math.random();await loadMuseum(1,{animate:true})};
  $('#jump-top').onclick=async()=>{sounds.play('ui_press_01',.4);const s=$('#museum-scroller');s.scrollTop=0;await loadMuseum(1)};
  $('#jump-bottom').onclick=async()=>{sounds.play('ui_press_02',.4);const s=$('#museum-scroller');s.scrollTop=s.scrollHeight;await loadMuseum(Math.max(1,museum.total))};
  const s=$('#museum-scroller');s.addEventListener('scroll',onMuseumScroll,{passive:true});paintViewTabs();loadMuseum(1)
}
function paintViewTabs(){$$('.ranking-tab').forEach(b=>b.classList.toggle('active',b.dataset.view===museum.view));$('#refresh-random').style.visibility=museum.view==='random'?'visible':'hidden';const jumps= museum.view==='random'?'none':'grid';$('.jump-controls').style.display=jumps}
function rowHeight(){return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-h'))||194}
function stageHeight(){const sc=$('#museum-scroller');return Math.max(sc.clientHeight,Math.min(20_000_000,museum.total*rowHeight()))}
function positionFromScroll(){if(museum.total<=1)return 1;const sc=$('#museum-scroller'),max=Math.max(1,sc.scrollHeight-sc.clientHeight);return 1+Math.round((sc.scrollTop/max)*(museum.total-1))}
function windowTopFor(start,len){if(museum.total<=len)return 0;const H=stageHeight(),usable=Math.max(0,H-len*rowHeight());return ((start-1)/Math.max(1,museum.total-len))*usable}
async function loadMuseum(position=1,{animate=true,realtime=false}={}){if(museum.busy||museum.fast)return;museum.busy=true;try{const limit=museum.view==='random'?5:15;const data=await API.list(museum.view,position,limit,museum.view==='random'?museum.seed:undefined);museum.total=data.total;museum.start=data.position||1;museum.items=data.items;renderMuseum({animate});if(!realtime&&museum.focusedId)focusLoadedAllive()}catch(e){if(e.data?.error==='DATABASE_NOT_CONFIGURED'){museum.total=0;museum.items=[];renderMuseum({animate:false})}}finally{museum.busy=false}}
function renderMuseum({animate=true}={}){const oldRects=new Map();$$('.exhibit-card',$('#virtual-window')).forEach(el=>oldRects.set(el.dataset.id,el.getBoundingClientRect()));museum.stages.forEach(v=>v.destroy());museum.stages=[];const stage=$('#virtual-stage'),win=$('#virtual-window'),empty=$('#museum-empty');stage.style.height=`${stageHeight()}px`;win.replaceChildren();empty.hidden=!!museum.items.length;if(!museum.items.length){$('#view-location').textContent='';return}win.style.top=`${windowTopFor(museum.start,museum.items.length)}px`;museum.items.forEach((a,index)=>win.append(buildExhibitCard(a,index)));$('#view-location').textContent=museum.view==='random'?`${museum.items.length} ALLIVES al azar`:`#${museum.start}–#${Math.min(museum.total,museum.start+museum.items.length-1)} de ${fmt(museum.total)}`;
  if(animate){requestAnimationFrame(()=>{$$('.exhibit-card',win).forEach(el=>{const old=oldRects.get(el.dataset.id);if(!old)return;const now=el.getBoundingClientRect(),dy=old.top-now.top;if(Math.abs(dy)>1){el.style.transition='none';el.style.transform=`translateY(${dy}px)`;requestAnimationFrame(()=>{el.style.transition='';el.style.transform=''})}})})}
}
function scentBy(id){return catalog.scents.find(s=>s.id===id)||{name:id,description:'',notes:[]}}
function activeKey(){return ['day','week','month','year'].includes(museum.view)?museum.view:'total'}
function buildExhibitCard(a,index){const card=document.createElement('article');card.className='exhibit-card'+(museum.focusedId===a.id?' focused':'');card.dataset.id=a.id;const slot=document.createElement('div');slot.className='card-allive';card.append(slot);const v=new AlliveView(slot,catalog,a);museum.stages.push(v);const scent=scentBy(a.scentId),rank=a.historicalRank||a.rank;const rankLabel=['random','recent'].includes(museum.view)?`#${fmt(rank)} Histórico`:`#${fmt(a.rank)}`;const newBadge=a.isNew?'<span class="new-badge">✦ Nuevo</span>':'';const exhib=a.exhibitedBy?`Exhibido Por ${escapeHtml(a.exhibitedBy)}`:'Exhibido Por Alguien Anónimo';
  const main=document.createElement('div');main.className='card-main';main.innerHTML=`<div class="rank-line"><span class="rank-badge" data-rank>${rankLabel}</span><span class="rank-change" data-rank-change></span>${newBadge}</div><h3 class="allive-title">ALLIVE De ${escapeHtml(a.subjectName)}</h3><div class="scent-line">Olor · ${escapeHtml(scent.name)}</div><p class="scent-description">${escapeHtml(scent.description)}</p><div class="scent-notes">Notas: ${escapeHtml(scent.notes.join(' · '))}</div><div class="exhibitor">${exhib}</div>`;card.append(main);
  const side=document.createElement('div');side.className='card-stats';const ak=activeKey();side.innerHTML=`${stat('24 Horas',a.caresses.day,'day'===ak,'day')}${stat('7 Días',a.caresses.week,'week'===ak,'week')}${stat('30 Días',a.caresses.month,'month'===ak,'month')}${stat('365 Días',a.caresses.year,'year'===ak,'year')}${stat('Totales',a.caresses.total,'total'===ak,'total')}<div class="heart-count">♡ <span data-heart-total>${fmt(a.caresses.total)}</span></div><div class="card-actions"><button class="caress-button">♡ Acariciar</button><button class="photo-button">Tomar Foto</button><button class="share-button">Compartir</button></div>`;card.append(side);
  $('.caress-button',side).onclick=()=>caressCard(a,card,v);$('.photo-button',side).onclick=async()=>{sounds.play('photo_card',.58);await takePhoto(a,a.subjectName,a.exhibitedBy||null)};$('.share-button',side).onclick=()=>shareAllive(a);museum.lastRank.set(a.id,rank);return card}
function stat(label,n,active,key){return `<div class="stat-row${active?' active':''}" data-stat="${key}"><span>${label}</span><strong>${fmt(n)}</strong></div>`}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
async function caressCard(a,card,view){const now=Date.now();if(now<museum.cooldownUntil)return;museum.cooldownUntil=now+1000;startCooldownUI();sounds.play('caress_contact',.62);const reaction=view.caress();setTimeout(()=>sounds.playVariant('affection',3,.6),70);setTimeout(()=>sounds.play(`reaction_${reaction}`,.36),320);try{const data=await API.caress({alliveId:a.id,visitorToken,actionId:crypto.randomUUID()});museum.cooldownUntil=new Date(data.nextAllowedAt).getTime();a.caresses=data.caresses;const currentRank=museum.view==='random'||museum.view==='recent'?a.historicalRank:a.rank;updateCardNumbers(card,a,currentRank,currentRank);void liveTick()}catch(e){if(e.status===429&&e.data?.nextAllowedAt){museum.cooldownUntil=new Date(e.data.nextAllowedAt).getTime()}else{museum.cooldownUntil=Date.now();startCooldownUI();console.error('CARESS_NOT_REGISTERED',e);const b=$('.caress-button',card);if(b){const old=b.textContent;b.textContent='Intenta De Nuevo';setTimeout(()=>{if(Date.now()>=museum.cooldownUntil)b.textContent='♡ Acariciar'},900)}}}}
function startCooldownUI(){const tick=()=>{const left=Math.max(0,museum.cooldownUntil-Date.now());$$('.caress-button').forEach(b=>{b.disabled=left>0;b.classList.toggle('cooling',left>0);b.textContent=left>0?`♡ Acariciar ${(left/1000).toFixed(1)}`:'♡ Acariciar'});if(left>0)setTimeout(tick,80)};tick()}
function updateCardNumbers(card,a,oldRank,newRank){for(const k of ['day','week','month','year','total']){$(`[data-stat="${k}"] strong`,card).textContent=fmt(a.caresses[k])}$('[data-heart-total]',card).textContent=fmt(a.caresses.total);if(newRank&&oldRank&&newRank!==oldRank){const change=oldRank-newRank,el=$('[data-rank-change]',card);el.textContent=change>0?`↑${change}`:`↓${Math.abs(change)}`;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800);$('[data-rank]',card).textContent=['random','recent'].includes(museum.view)?`#${fmt(newRank)} Histórico`:`#${fmt(newRank)}`}}
async function shareAllive(a){sounds.play('ui_press_01',.45);const u=new URL(location.origin+location.pathname);u.searchParams.set('page','caress');u.searchParams.set('allive',a.id);const payload={title:`ALLIVE De ${a.subjectName}`,text:`Acaricia mi ALLIVE De ${a.subjectName} en Museo De ALLIVES`,url:u.href};if(navigator.share){try{await navigator.share(payload);return}catch(e){if(e.name==='AbortError')return}}try{await navigator.clipboard.writeText(u.href)}catch{}}
function onMuseumScroll(){if(museum.view==='random')return;const sc=$('#museum-scroller'),now=performance.now(),dt=Math.max(1,now-museum.lastScrollTime),speed=Math.abs(sc.scrollTop-museum.lastScrollTop)/dt;museum.lastScrollTop=sc.scrollTop;museum.lastScrollTime=now;if(speed>1.25)museum.fast=true;clearTimeout(museum.scrollTimer);museum.scrollTimer=setTimeout(async()=>{museum.fast=false;await loadMuseum(positionFromScroll(),{animate:false})},220)}
async function liveTick(){if(document.hidden||museum.fast||!$('#page-caress').classList.contains('active')||!museum.items.length)return;try{const snap=await API.snapshot(museum.items.map(x=>x.id),museum.view);let needsRefresh=false;for(const s of snap.items){const a=museum.items.find(x=>x.id===s.id);if(!a)continue;const rankView=['day','week','month','year','all'].includes(museum.view);const old=rankView?a.rank:a.historicalRank;a.caresses=s.caresses;a.historicalRank=s.historicalRank;if(rankView){if(!s.qualifies){needsRefresh=true;continue}a.rank=s.activeRank}else a.rank=s.historicalRank;const card=$(`.exhibit-card[data-id="${s.id}"]`);if(card)updateCardNumbers(card,a,old,rankView?a.rank:a.historicalRank)}if(['day','week','month','year','all'].includes(museum.view))reorderLoadedCards();museum.liveTicks++;if(needsRefresh||museum.liveTicks%10===0)await loadMuseum(positionFromScroll(),{animate:true,realtime:true})}catch{}}

function reorderLoadedCards(){const win=$('#virtual-window');const cards=new Map($$('.exhibit-card',win).map(el=>[el.dataset.id,el]));const oldRects=new Map([...cards].map(([id,el])=>[id,el.getBoundingClientRect()]));museum.items.sort((a,b)=>(a.rank??1e15)-(b.rank??1e15));for(const a of museum.items){const el=cards.get(a.id);if(el)win.append(el)}requestAnimationFrame(()=>{for(const [id,el] of cards){const old=oldRects.get(id),now=el.getBoundingClientRect();if(!old)continue;const dy=old.top-now.top;if(Math.abs(dy)>1){el.style.transition='none';el.style.transform=`translateY(${dy}px)`;requestAnimationFrame(()=>{el.style.transition='';el.style.transform=''})}}})}

function startLive(){if(!museum.liveTimer)museum.liveTimer=setInterval(liveTick,1000)}function stopLive(){clearInterval(museum.liveTimer);museum.liveTimer=null}
async function presenceTick(){try{const d=await API.presence(visitorToken);$('#presence-count').textContent=fmt(d.active)}catch{}}
function startPresence(){presenceTick();if(!museum.presenceTimer)museum.presenceTimer=setInterval(presenceTick,30000)}function stopPresence(){clearInterval(museum.presenceTimer);museum.presenceTimer=null}
async function openSharedAllive(id){museum.view='all';museum.focusedId=id;const u=new URL(location.href);u.search='';u.searchParams.set('page','caress');u.searchParams.set('allive',id);history.replaceState({},'',u);paintViewTabs();try{const {allive}=await API.get(id);const rank=allive.historicalRank||1;await loadMuseum(rank,{animate:false});focusLoadedAllive()}catch{await loadMuseum(1)}}
function focusLoadedAllive(){if(!museum.focusedId)return;const card=$(`.exhibit-card[data-id="${museum.focusedId}"]`);if(!card)return;const sc=$('#museum-scroller');const top=parseFloat($('#virtual-window').style.top||0)+card.offsetTop-sc.clientHeight/2+card.clientHeight/2;sc.scrollTop=Math.max(0,top);card.classList.add('focused');setTimeout(()=>card.classList.remove('focused'),2600)}

document.addEventListener('visibilitychange',()=>{if(document.hidden)sounds.stopAllLoops()});
init().catch(err=>{console.error(err);document.body.insertAdjacentHTML('beforeend','<div style="position:fixed;inset:auto 20px 20px;background:white;padding:16px;border-radius:18px;z-index:9999">No se pudo iniciar Museo De ALLIVES.</div>')});
