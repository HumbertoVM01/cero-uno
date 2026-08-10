const FILES = [
'affection_01','affection_02','affection_03','allive_random_finish','caress_contact','duplicate_allive','exhibit_arrival','exhibit_transition','gem_place_01','gem_place_02','gem_random_land','gem_touch_01','gem_touch_02','nav_tab','photo_card','pom_place_01','pom_place_02','pom_random_land','pom_touch_01','pom_touch_02','random_start','random_tick_fast','random_tick_medium','random_tick_slow','reaction_dance','reaction_excited','reaction_jump','reaction_shimmy','reaction_sidehop','reaction_wave','refresh_allives','scent_flick_start','scent_manual_lock','scent_random_lock','scent_spin_loop','scent_tick','ui_press_01','ui_press_02','validation_missing'
];
class SoundManager{
  constructor(){this.enabled=localStorage.getItem('allive-sound')!=='off';this.base=new Map();this.loops=new Map();FILES.forEach(n=>{const a=new Audio(`/assets/sounds/${n}.wav`);a.preload='auto';this.base.set(n,a)})}
  setEnabled(v){this.enabled=!!v;localStorage.setItem('allive-sound',v?'on':'off');if(!v)this.stopAllLoops()}
  play(name,volume=1){if(!this.enabled)return null;const base=this.base.get(name);if(!base)return null;const a=base.cloneNode();a.volume=Math.max(0,Math.min(1,volume));a.play().catch(()=>{});return a}
  playVariant(prefix,count,volume=1){return this.play(`${prefix}_${String(1+Math.floor(Math.random()*count)).padStart(2,'0')}`,volume)}
  loop(name,volume=.55){if(!this.enabled)return null;this.stopLoop(name);const base=this.base.get(name);if(!base)return null;const a=base.cloneNode();a.loop=true;a.volume=volume;a.play().catch(()=>{});this.loops.set(name,a);return a}
  stopLoop(name){const a=this.loops.get(name);if(a){a.pause();a.currentTime=0;this.loops.delete(name)}}
  stopAllLoops(){for(const k of [...this.loops.keys()])this.stopLoop(k)}
}
export const sounds=new SoundManager();
