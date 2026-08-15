import { AlliveView } from '../allive.js';
import { VISUAL_PARTS } from './core.js';

export function blankBuild(catalog){
  return {parts:{
    body:catalog.poms[0].id,top:catalog.poms[0].id,leftArm:catalog.poms[0].id,rightArm:catalog.poms[0].id,
    leftLeg:catalog.poms[0].id,rightLeg:catalog.poms[0].id,leftEye:catalog.gems[0].id,rightEye:catalog.gems[0].id,
  },scentId:null};
}

export class GameAllive{
  constructor(container,catalog,data,{visibleParts=VISUAL_PARTS,hero=false,heroType='dance',className=''}={}){
    this.container=container;this.catalog=catalog;this.data={parts:{...data.parts},scentId:data.scentId||null};
    this.view=new AlliveView(container,catalog,this.data,{hero,heroType});
    this.container.classList.add('game-allive-host');if(className)this.container.classList.add(className);
    this.setVisibleParts(visibleParts);
  }
  setVisibleParts(keys){const set=new Set(keys);for(const k of VISUAL_PARTS){const p=this.view.partEls.get(k);if(p)p.el.style.visibility=set.has(k)?'visible':'hidden'}this.visibleParts=set}
  setBuild(data,keys=null){this.data={parts:{...data.parts},scentId:data.scentId||null};this.view.setData(this.data);if(keys)this.setVisibleParts(keys)}
  async updatePart(key,id){this.data.parts[key]=id;return this.view.updatePart(key,id)}
  caress(type='dance',glow=false){return this.view.caress(type,glow)}
  destroy(){this.view.destroy();this.container.replaceChildren()}
}

export function makePartialData(catalog,build,visibleKeys){
  const fallback=blankBuild(catalog);const data={parts:{...fallback.parts,...(build?.parts||{})},scentId:build?.scentId||null};return {data,visibleKeys};
}
