import assert from 'node:assert/strict';
import { TASKS, chooseRoundTasks, skillScore, scoreMemory, visualFingerprint, buildDemoAllives, RNG } from '../public/js/game/core.js';
assert.equal(TASKS.length,27,'27 tasks');
for(let i=0;i<100;i++){
  const tasks=chooseRoundTasks('seed-'+i,[]);assert.equal(tasks.length,9);assert.equal(new Set(tasks.map(x=>x.id)).size,9);
  const counts={};for(const t of tasks)counts[t.family]=(counts[t.family]||0)+1;assert.ok(Object.values(counts).every(n=>n<=2));assert.ok(Object.keys(counts).length>=6);
}
assert.equal(skillScore(Array(9).fill(0)),100);
assert.ok(Math.abs(skillScore(Array(9).fill(1))-50)<1e-9);
const target={parts:{body:'a',top:'b',leftArm:'c',rightArm:'d',leftLeg:'e',rightLeg:'f',leftEye:'g',rightEye:'h'},scentId:'s'};
const player=JSON.parse(JSON.stringify(target));assert.equal(scoreMemory(player,target),9);player.parts.leftEye='x';player.scentId='z';assert.equal(scoreMemory(player,target),7);assert.notEqual(visualFingerprint(player),visualFingerprint(target));
const catalog={poms:Array.from({length:18},(_,i)=>({id:'p'+i})),gems:Array.from({length:13},(_,i)=>({id:'g'+i})),scents:Array.from({length:120},(_,i)=>({id:'s'+i}))};
const demo=buildDemoAllives(catalog,20);assert.equal(demo.length,20);assert.ok(demo.every(x=>x.scentId&&x.parts.body&&x.parts.leftEye));
const r1=new RNG('x'),r2=new RNG('x');assert.deepEqual(Array.from({length:10},()=>r1.float()),Array.from({length:10},()=>r2.float()));
console.log('ALL GAME CORE TESTS PASS');

// V13 regression checks for live QA issues reported on the deployed game.
const { readFile } = await import('node:fs/promises');
const css = await readFile(new URL('../public/css/game.css', import.meta.url), 'utf8');
const selectors = await readFile(new URL('../public/js/game/selectors.js', import.meta.url), 'utf8');
const tasks = await readFile(new URL('../public/js/game/tasks.js', import.meta.url), 'utf8');
assert.match(css,/body\.game-mode \.topbar\{display:grid\}/,'game keeps site navigation visible');
assert.match(css,/100svh/,'game uses small viewport units so browser chrome is respected');
assert.match(css,/\.game-small-build\{top:25%/,'small ALLIVE sits on tabletop instead of counter front');
assert.match(css,/\.game-customer-group\.visible\{transform:translate\(-50%,-84%\)\}/,'customer rises from counter');
assert.doesNotMatch(selectors,/randomOnStrongFlick\s*:\s*true/,'game scent selector never randomizes on a strong flick');
assert.match(selectors,/requestAnimationFrame/,'selectors use frame-based inertia');
assert.match(selectors,/for\(let i=0;i<7;i\+\+\)/,'part carousel keeps persistent seven-slot buffer for five visible slots');
assert.match(tasks,/safeScatter\(rng,tokens\.length/,'tap-order targets use collision-safe placement');
assert.match(tasks,/same seed|place\(0\)/i,'moving target can reset deterministically');
assert.match(tasks,/circuit-label-bg/,'circuit candidate bridges are labeled in the diagram');
assert.match(tasks,/L 302 \$\{exitYs\[correctExit\]\}/,'maze route terminates at its designated exit');
assert.match(tasks,/attachTaskAutoFit/,'task content has overflow-fit protection');
console.log('ALL V13 LIVE-QA REGRESSION CHECKS PASS');
