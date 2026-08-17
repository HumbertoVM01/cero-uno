import { versionAsset } from './build.js';
const FILES = [
'affection_01','affection_02','affection_03','allive_random_finish','caress_contact','duplicate_allive','exhibit_arrival','exhibit_transition','gem_place_01','gem_place_02','gem_random_land','gem_touch_01','gem_touch_02','nav_tab','photo_card','pom_place_01','pom_place_02','pom_random_land','pom_touch_01','pom_touch_02','random_start','random_tick_fast','random_tick_medium','random_tick_slow','reaction_dance','reaction_excited','reaction_jump','reaction_shimmy','reaction_sidehop','reaction_wave','refresh_allives','scent_flick_start','scent_manual_lock','scent_random_lock','scent_spin_loop','scent_tick','ui_press_01','ui_press_02','validation_missing'
];

const CRITICAL = [
  'ui_press_01','ui_press_02','nav_tab',
  'pom_touch_01','pom_touch_02','pom_place_01','pom_place_02',
  'gem_touch_01','gem_touch_02','gem_place_01','gem_place_02',
  'random_start','random_tick_fast','random_tick_medium','random_tick_slow','pom_random_land','gem_random_land','allive_random_finish',
  'scent_tick','scent_manual_lock','scent_flick_start','scent_spin_loop','scent_random_lock'
];

class SoundManager {
  constructor(){
    this.enabled = localStorage.getItem('allive-sound') !== 'off';
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
    this.pending = new Map();
    this.loops = new Map();
    this.warmed = false;
    this.configureAmbientSession();
  }

  configureAmbientSession(){
    // Safari/iOS exposes Audio Session on newer versions. Ambient lets site SFX
    // coexist with music/podcasts from other apps instead of taking over playback.
    try{
      if(navigator.audioSession && 'type' in navigator.audioSession){
        navigator.audioSession.type = 'ambient';
      }
    }catch{}
  }

  ensureContext(){
    if(this.ctx) return this.ctx;
    this.configureAmbientSession();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return null;
    try{this.ctx = new Ctx({latencyHint:'interactive'})}catch{this.ctx = new Ctx()}
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  async load(name){
    if(this.buffers.has(name)) return this.buffers.get(name);
    if(this.pending.has(name)) return this.pending.get(name);
    const job = (async()=>{
      const ctx = this.ensureContext();
      if(!ctx) return null;
      const res = await fetch(versionAsset(`/assets/sounds/${name}.wav`), {cache:'no-cache'});
      if(!res.ok) throw new Error(`No se pudo cargar sonido: ${name}`);
      const bytes = await res.arrayBuffer();
      const buffer = await ctx.decodeAudioData(bytes.slice(0));
      this.buffers.set(name,buffer);
      this.pending.delete(name);
      return buffer;
    })().catch(err=>{this.pending.delete(name);console.warn(err);return null});
    this.pending.set(name,job);
    return job;
  }

  async preloadCritical(){
    this.ensureContext();
    await Promise.all(CRITICAL.map(n=>this.load(n)));
    // Remaining effects decode quietly after the tactile core is ready.
    this.preloadRest();
  }

  preloadRest(){
    const rest = FILES.filter(n=>!this.buffers.has(n)&&!this.pending.has(n));
    Promise.all(rest.map(n=>this.load(n))).catch(()=>{});
  }

  async unlock(){
    if(!this.enabled) return;
    const ctx = this.ensureContext();
    if(!ctx) return;
    this.configureAmbientSession();
    try{
      if(ctx.state !== 'running') await ctx.resume();
      if(!this.warmed && ctx.state === 'running'){
        // One silent frame primes Web Audio on iOS without taking over media playback.
        const b = ctx.createBuffer(1,1,ctx.sampleRate);
        const s = ctx.createBufferSource();
        const g = ctx.createGain();
        g.gain.value = 0;
        s.buffer = b; s.connect(g); g.connect(this.master); s.start();
        this.warmed = true;
      }
    }catch{}
  }

  setEnabled(v){
    this.enabled = !!v;
    localStorage.setItem('allive-sound',v?'on':'off');
    if(!v) this.stopAllLoops();
    else this.unlock();
  }

  play(name,volume=1){
    if(!this.enabled) return null;
    const ctx = this.ensureContext();
    const buffer = this.buffers.get(name);
    if(!ctx || !buffer){
      // Start loading, but do not fire a late sound after the interaction has passed.
      this.load(name);
      return null;
    }
    if(ctx.state !== 'running') this.unlock();
    try{
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0,Math.min(1,volume));
      source.buffer = buffer;
      source.connect(gain); gain.connect(this.master);
      source.start(ctx.currentTime);
      return source;
    }catch{return null}
  }

  playVariant(prefix,count,volume=1){
    return this.play(`${prefix}_${String(1+Math.floor(Math.random()*count)).padStart(2,'0')}`,volume);
  }

  loop(name,volume=.55){
    if(!this.enabled) return null;
    this.stopLoop(name);
    const ctx=this.ensureContext(), buffer=this.buffers.get(name);
    if(!ctx || !buffer){this.load(name);return null}
    if(ctx.state!=='running') this.unlock();
    try{
      const source=ctx.createBufferSource(), gain=ctx.createGain();
      gain.gain.value=Math.max(0,Math.min(1,volume));
      source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(this.master);source.start(ctx.currentTime);
      this.loops.set(name,{source,gain});
      return source;
    }catch{return null}
  }

  stopLoop(name){
    const item=this.loops.get(name);
    if(item){try{item.source.stop()}catch{};try{item.source.disconnect();item.gain.disconnect()}catch{};this.loops.delete(name)}
  }
  stopAllLoops(){for(const k of [...this.loops.keys()])this.stopLoop(k)}
}

export const sounds = new SoundManager();
