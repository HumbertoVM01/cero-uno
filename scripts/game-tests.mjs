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

// V15 final regression checks: audited fairness, geometry, selectors, dense layouts and leaderboard scoring.
const { readFile } = await import('node:fs/promises');
const css = await readFile(new URL('../public/css/game.css', import.meta.url), 'utf8');
const selectors = await readFile(new URL('../public/js/game/selectors.js', import.meta.url), 'utf8');
const tasks = await readFile(new URL('../public/js/game/tasks.js', import.meta.url), 'utf8');
const gameJs = await readFile(new URL('../public/js/game/game.js', import.meta.url), 'utf8');
const apiJs = await readFile(new URL('../public/js/api.js', import.meta.url), 'utf8');
const netlifyToml = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
const buildJs = await readFile(new URL('../public/js/build.js', import.meta.url), 'utf8');
const appJs = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
const audioJs = await readFile(new URL('../public/js/audio.js', import.meta.url), 'utf8');

assert.match(netlifyToml,/for = "\/assets\/\*"[\s\S]*max-age=0, must-revalidate/,'mutable assets are revalidated instead of cached immutable for a year');
assert.match(buildJs,/ASSET_CACHE_VERSION = 'v15\.1-20260816'/,'asset URLs use a new V15.1 cache namespace');
assert.match(appJs,/versionCatalogAssets\(await catalogPromise\)/,'pom and gem catalog URLs are cache-busted before preload/render');
assert.match(audioJs,/versionAsset\(`\/assets\/sounds\/\$\{name\}\.wav`\)/,'sound assets use the same cache-busting layer');
assert.match(gameJs,/versionAsset\('\/assets\/game\/shop-background\.jpeg'\)/,'game scene background is cache-busted');
assert.match(gameJs,/versionAsset\('\/assets\/game\/counter\.png'\)/,'game counter is cache-busted');
const { versionAsset, versionCatalogAssets } = await import('../public/js/build.js');
assert.equal(versionAsset('/assets/pom-poms/pom_16.png'),'/assets/pom-poms/pom_16.png?av=v15.1-20260816','coffee pom receives fresh cache namespace');
assert.equal(versionAsset('/not-an-asset.png'),'/not-an-asset.png','non-assets are untouched');
const vc={poms:[{src:'/assets/pom-poms/pom_16.png'}],gems:[{src:'/assets/gems/gem_11.png'}]};versionCatalogAssets(vc);
assert.match(vc.poms[0].src,/av=v15\.1-20260816/,'catalog pom source versioned');assert.match(vc.gems[0].src,/av=v15\.1-20260816/,'catalog gem source versioned');
assert.match(css,/body\.game-mode \.topbar\{display:grid\}/,'game keeps site navigation visible');
assert.match(css,/100svh/,'game respects browser chrome using small viewport units');
assert.match(css,/\.game-small-build\{top:68%;width:40px;height:40px\}/,'small ALLIVE uses the requested old position at half size');
assert.match(css,/\.game-customer-group\{[^}]*top:49\.5%;[^}]*width:75px;height:75px/,'client is half-size and anchored between old/new visible positions');
assert.match(css,/\.game-customer-group\.visible\{transform:translate\(-50%,-56%\)\}/,'client visible midpoint is frozen');
assert.match(css,/\.game-customer-group\{[^}]*translate\(-50%,72%\)/,'client hidden pose reuses the old low position');
assert.match(css,/\.game-workspace\{top:33\.333%;height:66\.667%/,'minitasks own the lower two thirds');
assert.match(css,/\.game-choice-row\{[^}]*justify-content:center/,'answer rows center their contents');
assert.match(css,/gap:12px/,'answer layouts retain the 12px safety gap');
assert.match(css,/\.game-carousel-slot\{[^}]*opacity:1/,'part carousel keeps every pom full-colour');
assert.match(css,/\.game-carousel-slot\.selected \.game-carousel-rainbow\{opacity:1\}/,'rainbow halo travels with the provisional selected asset');
assert.match(css,/\.game-carousel-marker\{[^}]*background:transparent/,'fixed centre marker is transparent and cannot cover the selected asset');
assert.doesNotMatch(css,/\.game-carousel-marker:after\{[^}]*background:#fff/,'centre marker never paints an opaque white disc over the selected asset');

assert.doesNotMatch(selectors,/randomOnStrongFlick\s*:\s*true/,'game scent selector never randomizes on a strong flick');
assert.match(selectors,/this\.items\.map/,'part carousel keeps persistent item nodes instead of swapping the centre image');
assert.match(selectors,/Math\.abs\(travel\)>6/,'strong part flick is capped at six slots');
assert.match(selectors,/const scales=\[1,\.91,\.78,\.64\],opacities=\[1,\.78,\.48,\.20\]/,'scent hierarchy matches creator feel');
assert.match(selectors,/requestAnimationFrame|\braf\(/,'selectors use frame-based inertia');
assert.match(selectors,/ad>2\.55/,'settled part carousel renders the centre plus two neighbours per side');
assert.match(selectors,/Math\.exp\(-\.0055\*dt\)/,'part selector uses the same inertial friction constant as the game scent wheel');
const { circularDelta } = await import('../public/js/game/selectors.js');
for(const n of [13,18]){for(let p=0;p<n;p++){const visible=Array.from({length:n},(_,i)=>Math.abs(circularDelta(i,p,n))<=2.55).filter(Boolean).length;assert.equal(visible,5,`five settled carousel assets for ${n} items at ${p}`)}}
assert.equal(circularDelta(0,17,18),1,'pom wrap 17→0 is one physical step');
assert.equal(circularDelta(17,0,18),-1,'pom wrap 0→17 is one physical step');

assert.match(tasks,/5:\[3,2\]/,'five answers use centered 3+2 rows');
assert.match(tasks,/7:\[4,3\]/,'seven answers use centered 4+3 rows');
assert.match(tasks,/12:\[4,4,4\]/,'12 tap-order items use 4+4+4');
assert.match(tasks,/13:\[5,4,4\]/,'13 tap-order items use 5+4+4');
assert.match(tasks,/tapOrderPositions\(rng,s\.tokens\.length\)/,'tap-order uses its hitbox-aware row layout');
assert.match(tasks,/visualSize=s\.targets<=4\?62:s\.targets<=6\?56:48/,'tap-order visual sizes preserve distinct glyphs inside >=48px hitboxes');
assert.match(tasks,/observeMs:1700\+level\*90/,'What Changed uses the audited observation window without the old x3 delay');
assert.doesNotMatch(tasks,/mountTask\([\s\S]{0,800}attachTaskAutoFit\(/,'task mount no longer applies global shrink-to-fit patching');

assert.match(gameJs,/Subir puntaje/,'results exposes optional leaderboard submission');
assert.match(gameJs,/Compartir resultado/,'results exposes a separate share-card action');
assert.match(gameJs,/Posición estimada/,'results can show pre-submit estimated rank');
assert.match(gameJs,/q\.has\('qa'\)/,'QA route is activated only by the direct qa query parameter');
assert.match(apiJs,/gameRankEstimate/,'client API exposes rank estimation');
assert.match(netlifyToml,/\/api\/game-score/,'score endpoint is routed');
assert.match(netlifyToml,/\/api\/game-rankings/,'leaderboard endpoint is routed');

const scoreCore = await import('../public/js/game/core.js');
assert.equal(scoreCore.GAME_SCORE_VERSION,1);
assert.equal(scoreCore.speedPointsRaw(45_000),100);
assert.equal(scoreCore.speedPointsRaw(90_000),50);
assert.equal(scoreCore.speedPointsRaw(135_000),0);
assert.equal(scoreCore.totalScore({memory:9,skill:100,elapsed:45_000}).total,1000);
assert.equal(scoreCore.totalScore({memory:9,skill:100,elapsed:90_000}).total,950);
assert.equal(scoreCore.totalScore({memory:0,skill:100,elapsed:45_000}).total,300);
assert.equal(scoreCore.totalScore({memory:9,skill:100,elapsed:180_000}).total,900);
assert.equal(scoreCore.formatTimeTenths(72_400),'1:12.4');
assert.match(tasks,/visualSignature/,'tasks use perceptual identity rather than raw descriptor identity');
assert.match(tasks,/rotationInvariantVisualSignature/,'Giro validates identity independent of orientation');
assert.match(tasks,/if\(succeedIfDone\(now\)\)return/,'Follow Target pointerup closes the end-of-timer race');
assert.match(gameJs,/qaGeometryReport/,'direct QA reports bounds, touch size and overlap issues');
console.log('ALL V15 FINAL DEPLOY REGRESSION CHECKS PASS');
