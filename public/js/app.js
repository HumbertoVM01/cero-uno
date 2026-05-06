import { loadAssets, renderZeroOne, genomeFromForm, genomeCode, PART_KEYS, drawActa } from './renderer.js';
import { scentFromSeed, PLATFORM_COPY } from './platform-assets.js';
import { createZeroOne, listZeroOnes, tapZeroOne, getStats } from './api.js';
import {
  bitSeed,
  interpretBits,
  generarBits,
  hashToUint32,
  mulberry32,
  randomSegment,
  clampFirstBitCount,
  DEFAULT_FIRST_BITS,
  MAX_FIRST_BITS_MOBILE,
  DEFAULT_RANDOM_OFFSET_MAX
} from './sequence.js';
import { playTapSound, playBits, playSequence, playDeployChime, playZeroOneSound } from './audio.js';
import { initCommentField } from './comment-field-renderer.js';
import { initCreatorFieldSystem } from './creator-field-system.js';
import { initGallerySocialSystem, updateGallerySocialReadout, updateGalleryTactileClimate, decorateGalleryCard, registerGalleryTapPulse, getTactileReading } from './gallery-social-system.js';
import { initSequenceObservatorySystem, updateSequenceObservatory } from './sequence-observatory-system.js';
import { initAempFieldSystem } from './aemp-field-system.js';
import { initOriginLivingSystem } from './origin-living-system.js';
import { initArchiveLivingSystem } from './archive-living-system.js';
import { initLivingState } from './living-state-system.js';
import { initOntologicalAge } from './ontological-age-system.js';
import { initMissionSystem } from './mission-system.js';
import { initAtlasSystem } from './atlas-system.js';
import { initAempDistributedSystem } from './aemp-distributed-system.js';
import { initSocialFieldSystem } from './social-field-system.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const state = {
  current: null,
  published: [],
  parentId: null,
  currentTab: 'inicio',
  assetsLoaded: false,
  consultedBits: '',
  consultedOffset: '',
  commentSnapshot: null,
  livingState: null,
  ontologicalAge: null,
  currentMission: null,
  initialAtlas: null,
  distributedAemp: null,
  socialField: null,
  gallerySort: 'top'
};

const HEX_SYMBOLS = '0123456789ABCDEF';

function safeText(sel, text) {
  const el = $(sel);
  if (el) el.textContent = text;
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function showTab(id, pushHash = true) {
  const targetId = id || 'inicio';
  const target = document.getElementById(targetId) || document.getElementById('inicio');
  const resolvedId = target?.id || 'inicio';

  if (window.__ceroUnoShowTab && !showTab.__fromRescue) {
    window.__ceroUnoShowTab(resolvedId, pushHash);
  } else {
    $$('main > section').forEach((section) => {
      const active = section.id === resolvedId;
      section.classList.toggle('active-tab', active);
      section.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (section.classList.contains('tab-panel')) section.style.setProperty('display', active ? 'block' : 'none', 'important');
    });
    const primaryMap = {
      inicio: 'inicio',
      estado: 'estado',
      mision: 'estado',
      atlas: 'estado',
      aemp: 'estado',
      campo: 'campo',
      creator: 'creator',
      sequencia: 'creator',
      origen: 'creator',
      galeria: 'galeria',
      archivo: 'archivo'
    };
    const primaryId = primaryMap[resolvedId] || resolvedId;
    $$('.nav a').forEach((a) => {
      const href = a.getAttribute('href');
      const active = href === `#${resolvedId}` || (a.closest('.nav-primary') && href === `#${primaryId}`);
      a.classList.toggle('active', active);
      if (href === `#${resolvedId}`) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.body.dataset.space = resolvedId;
    if (pushHash) history.replaceState(null, '', `#${resolvedId}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  state.currentTab = resolvedId;
  document.body.dataset.space = resolvedId;
}

function initNav() {
  $$('.nav a, a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const id = href.slice(1);
      if (document.getElementById(id)) {
        e.preventDefault();
        showTab(id);
      }
    });
  });

  const initial = location.hash && document.getElementById(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
  showTab(initial, false);

  window.addEventListener('hashchange', () => {
    const id = location.hash && document.getElementById(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
    showTab(id, false);
  });
}

function cryptoUnit() {
  try {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / 4294967296;
  } catch (_) {
    return Math.random();
  }
}

function randomHex(rng = cryptoUnit) {
  // HTML color inputs aceptan #RRGGBB. Cada uno de los 6 dígitos sale de 16 símbolos HEX.
  let out = '#';
  for (let i = 0; i < 6; i++) out += HEX_SYMBOLS[Math.floor(rng() * 16) % 16];
  return out;
}

function seededRandomHex(seed) {
  return randomHex(mulberry32(hashToUint32(seed)));
}

function randomizeCreator({ keepScent = false, announce = false } = {}) {
  const form = $('#creator-form');
  if (!form) return;
  const entropy = `${Date.now()}|${performance.now()}|${cryptoUnit()}|${navigator.userAgent}`;
  PART_KEYS.forEach((key, idx) => {
    form.elements[key].value = seededRandomHex(`${entropy}|${key}|${idx}`);
  });
  if (!keepScent) form.elements.scent.value = '';
  if (form.elements.local_format) form.elements.local_format.value = '';
  state.parentId = null;
  syncCreator();
  document.dispatchEvent(new CustomEvent('ceroUno:creatorSeedChanged', { detail: { origin: 'aleatorio local', format: '' } }));
  if (announce) {
    showToast('La sequencia invocó una comparecencia aleatoria. No se guarda hasta publicar.');
    playSequence(`${genomeCode(state.current)}|randomize`, 10);
  }
}

function renderCurrentPreviews() {
  if (!state.current) return;
  const hero = $('#hero-canvas');
  const creator = $('#creator-canvas');
  if (hero) renderZeroOne(hero, state.current, { scale: 0.95 });
  if (creator) renderZeroOne(creator, state.current, { scale: 0.95 });
  const heroCard = $('.hero-card');
  if (heroCard) heroCard.dataset.seed = `seed: ${genomeCode(state.current).slice(0, 34)}...`;
}

function syncCreator() {
  const form = $('#creator-form');
  if (!form) return;
  const z = genomeFromForm(form);
  state.current = z;
  safeText('#genome-code', genomeCode(z));
  safeText('#scent-count', `${z.scent.length}/100`);
  renderCurrentPreviews();
}


function listenToZeroOne(z = state.current) {
  if (!z) {
    syncCreator();
    z = state.current;
  }
  const bits = playZeroOneSound(z);
  showToast(`Sonando el Cero Uno: ${bits.length} bits derivados de su genoma HEX.`);
  return bits;
}

function startPreviewLoop() {
  function frame() {
    if (state.current) renderCurrentPreviews();
    $$('.zero-card canvas').forEach((canvas) => {
      const data = canvas.__zeroOne;
      if (data) renderZeroOne(canvas, data, { scale: 0.9 });
    });
    requestAnimationFrame(frame);
  }
  frame();
}

function mutateCurrent() {
  const form = $('#creator-form');
  if (!form) return;
  if (!state.current) syncCreator();
  const seed = `${genomeCode(state.current)}|${Date.now()}|${cryptoUnit()}`;
  const bits = bitSeed(seed, 24);
  const changed = [];
  PART_KEYS.forEach((key, idx) => {
    if (bits[idx] === '1') {
      form.elements[key].value = seededRandomHex(`${seed}|${key}`);
      changed.push(key.replace('_hex', '').replaceAll('_', ' '));
    }
  });
  if (bits[10] === '1') {
    form.elements.scent.value = scentFromSeed(`${seed}|scent|${bits.slice(11, 14)}`);
  }
  syncCreator();
  document.dispatchEvent(new CustomEvent('ceroUno:creatorSeedChanged', { detail: { origin: 'mutación local', bits } }));
  showToast(`Mutación local: ${changed.length ? changed.join(', ') : 'sólo aura binaria'}. No se guardó en Neon.`);
  playSequence(seed, 12);
}

async function publishCurrent() {
  const button = $('#publish-button');
  if (!button) return;
  if (!state.current) syncCreator();
  button.disabled = true;
  button.textContent = 'Publicando...';
  try {
    const payload = { ...state.current, parent_id: state.parentId };
    const { data } = await createZeroOne(payload);
    if (!data.ok) throw new Error(data.error || 'No se pudo publicar.');
    showToast('Comparecencia publicada. Entró al archivo visible sin volverse registro oficial.');
    playDeployChime();
    state.parentId = null;
    await loadGallery('top');
    await initStats();
    showTab('galeria');
  } catch (err) {
    showToast(`No se publicó: ${err.message}. Revisa DATABASE_URL, schema.sql y Functions.`);
  } finally {
    button.disabled = false;
    button.textContent = 'Publicar comparecencia';
  }
}

function renderGallery(items, mode = 'connected', sort = 'top') {
  const grid = $('#gallery-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    safeText('#gallery-mode', mode === 'error'
      ? 'Sin conexión a Neon'
      : 'Neon conectado · esperando comparecencias publicadas');
    updateGallerySocialReadout([], sort);
    updateGalleryTactileClimate([], sort);
    grid.innerHTML = `
      <article class="empty-gallery glass">
        <h3>La Cámara de Tacto todavía está en silencio visible.</h3>
        <p>${PLATFORM_COPY.galleryEmpty}</p>
        <p class="microcopy">Silencio no significa ausencia: sólo indica que Neon todavía no muestra comparecencias publicadas en esta cámara.</p>
        <a class="button" href="#creator">Crear una comparecencia</a>
      </article>`;
    return;
  }
  safeText('#gallery-mode', sort === 'new' ? 'Neon conectado · apariciones recientes' : 'Neon conectado · más tacto visible');
  updateGallerySocialReadout(list, sort);
  updateGalleryTactileClimate(list, sort);
  list.forEach((z, index) => {
    const card = document.createElement('article');
    card.className = 'zero-card glass';
    card.innerHTML = `
      <canvas width="260" height="310" aria-label="Cero Uno"></canvas>
      <div class="card-body">
        <code class="genome-small"></code>
        <p class="scent"></p>
        <div class="tap-row" aria-label="Tacto visible">
          <button class="tap-button" title="Tocar no es votar. Es dejar una señal de contacto.">TOCAR</button>
          <span class="tap-label"><strong class="tap-count">${toInt(z.tap_count).toLocaleString('es-MX')}</strong><em>tacto histórico</em></span>
        </div>
        <p class="tactile-reading">${getTactileReading(toInt(z.tap_count))}</p>
        <p class="tap-microcopy">Tocar no es votar; es dejar una señal mínima de contacto.</p>
        <button class="ghost-button listen-zero">Escuchar</button>
        <button class="ghost-button mutate-from">Mutar este Cero Uno</button>
      </div>`;
    const canvas = $('canvas', card);
    canvas.__zeroOne = z;
    $('.genome-small', card).textContent = z.genome_code || genomeCode(z);
    $('.scent', card).textContent = z.scent ? `Olor: ${z.scent}` : 'Olor: sin olor declarado';
    $('.tap-button', card).addEventListener('click', () => handleTap(z, card));
    $('.listen-zero', card).addEventListener('click', () => listenToZeroOne(z));
    $('.mutate-from', card).addEventListener('click', () => loadIntoCreator(z));
    decorateGalleryCard(card, z, { rank: index + 1, total: list.length, sort });
    grid.appendChild(card);
  });
}

async function loadGallery(sort = 'top') {
  state.gallerySort = sort;
  try {
    safeText('#gallery-mode', 'Leyendo Neon...');
    const { data } = await listZeroOnes(sort);
    if (!data.ok) throw new Error(data.error || 'No se pudo leer la galería.');
    state.published = data.zero_ones || [];
    renderGallery(state.published, 'connected', sort);
  } catch (err) {
    renderGallery([], 'error', sort);
    showToast('No pude leer Neon. Revisa DATABASE_URL, schema.sql y Functions.');
  }
}

async function handleTap(z, card) {
  const button = $('.tap-button', card);
  const count = $('.tap-count', card);
  button.disabled = true;
  playTapSound(z.genome_hash || genomeCode(z));
  setTimeout(() => { button.disabled = false; }, 1000);
  try {
    const { data } = await tapZeroOne(z.id);
    if (data.tap_count != null) {
      z.tap_count = data.tap_count;
      count.textContent = toInt(data.tap_count).toLocaleString('es-MX');
      const tactileReading = $('.tactile-reading', card);
      if (tactileReading) tactileReading.textContent = getTactileReading(toInt(data.tap_count));
      updateGallerySocialReadout(state.published, state.gallerySort);
      updateGalleryTactileClimate(state.published, state.gallerySort);
      await initStats();
    }
    if (!data.accepted) showToast('Un toque por segundo. La sequencia no acepta autoclicker.');
    else { card.classList.add('tap-pulse'); setTimeout(() => card.classList.remove('tap-pulse'), 520); registerGalleryTapPulse(card, z); }
  } catch (err) {
    showToast(`Tacto no registrado: ${err.message}`);
  }
}

function loadIntoCreator(z) {
  const form = $('#creator-form');
  if (!form) return;
  PART_KEYS.forEach((key) => { form.elements[key].value = z[key] || '#FFFFFF'; });
  form.elements.scent.value = z.scent || '';
  if (form.elements.local_format) form.elements.local_format.value = 'remix de galería';
  state.parentId = z.id || null;
  syncCreator();
  document.dispatchEvent(new CustomEvent('ceroUno:creatorSeedChanged', { detail: { origin: 'remix de galería', format: 'remix' } }));
  showTab('creator');
  showToast('Mutación cargada en preview. Sólo se guarda si la publicas.');
}

function sanitizeOffsetInput() {
  const el = $('#segment-max-offset');
  if (!el) return DEFAULT_RANDOM_OFFSET_MAX;
  const raw = String(el.value || '').replace(/[^0-9]/g, '');
  let value = DEFAULT_RANDOM_OFFSET_MAX;
  try { value = raw ? BigInt(raw) : DEFAULT_RANDOM_OFFSET_MAX; } catch (_) { value = DEFAULT_RANDOM_OFFSET_MAX; }
  if (value < 32n) value = 32n;
  if (value > DEFAULT_RANDOM_OFFSET_MAX) value = DEFAULT_RANDOM_OFFSET_MAX;
  el.value = value.toString();
  return value;
}

function consultSequenceSegment({ play = false } = {}) {
  const maxOffset = sanitizeOffsetInput();
  const segment = randomSegment(32, maxOffset);
  state.consultedBits = segment.bits;
  state.consultedOffset = segment.offset;
  safeText('#sequence-offset', `Offset aleatorio: ${Number(segment.offset).toLocaleString('es-MX')} · rango: 0–${Number(maxOffset).toLocaleString('es-MX')}`);
  safeText('#oracle-bits', segment.bits);
  safeText('#oracle-reading', interpretBits(segment.bits));
  updateSequenceObservatory(segment.bits, { source: 'Segmento aleatorio consultado', offset: segment.offset, title: 'Segmento aleatorio' });
  document.dispatchEvent(new CustomEvent('ceroUno:sequenceObserved', { detail: { bits: segment.bits, offset: segment.offset, source: 'segmento aleatorio' } }));
  if (play) playBits(segment.bits);
  return segment.bits;
}

function computeFirstBits() {
  const input = $('#first-bit-count');
  const count = clampFirstBitCount(input?.value || DEFAULT_FIRST_BITS);
  if (input) input.value = String(count);
  const bits = generarBits(count);
  safeText('#first-500', bits);
  safeText('#first-bits-meta', `${count.toLocaleString('es-MX')} bits computados on-device · máximo móvil recomendado: ${MAX_FIRST_BITS_MOBILE.toLocaleString('es-MX')}`);
}

function initSequenceLab() {
  computeFirstBits();
  safeText('#sequence-offset', 'Consulta 32 bits para escuchar ese mismo segmento.');
  $('#consult-sequence')?.addEventListener('click', () => consultSequenceSegment({ play: false }));
  $('#play-sequence')?.addEventListener('click', () => {
    const bits = state.consultedBits || consultSequenceSegment({ play: false });
    playBits(bits);
  });
  $('#compute-first-bits')?.addEventListener('click', computeFirstBits);
  $('#first-bit-count')?.addEventListener('change', computeFirstBits);
}

function initAemp() {
  const frames = {
    economico: 'Ve costo, tiempo, comisiones, materiales, envío, sostenibilidad y presupuesto real. Es útil, pero no total.',
    artistico: 'Ve autoría, rareza, composición, cuerpo, ternura, textura y lenguaje visual. Es útil, pero no total.',
    ontologico: 'Ve comparecencia: una secuencia universal entrando al mundo humano mediante criatura, gesto y Campo Vivo.',
    campo: 'Ve deseo, crítica, defensa, repetición, vínculo, chisme, juego y señal social del Campo Vivo.',
    tecnico: 'Ve Netlify, Neon, assets, functions, Web Audio, seed, estado local y datos mínimos.'
  };
  const blind = {
    economico: 'Punto ciego: puede reducir presencia, ritual, identidad y mundo a puro costo.',
    artistico: 'Punto ciego: puede olvidar logística, calidad, envío, precio y operación.',
    ontologico: 'Punto ciego: puede olvidar que alguien debe pegar, empacar, vender y contestar.',
    campo: 'Punto ciego: puede confundir ruido con centro. El Campo Social influye; no gobierna todo.',
    tecnico: 'Punto ciego: puede dejar fuera ternura, mito, rareza y peso humano.'
  };
  $$('.frame-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.frame;
      safeText('#aemp-frame-title', btn.textContent);
      safeText('#aemp-frame-body', frames[key] || 'Marco no encontrado.');
      safeText('#aemp-blindspot', blind[key] || 'Todo marco tiene punto ciego.');
    });
  });
  $$('.mode-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const phrase = '“Esto sólo es un pompón.”';
      const output = {
        liberacion: `${phrase} No tengo que aceptar esa reducción como verdad total.`,
        examen: `${phrase} Tiene una parte material cierta: sí hay pompón. Pero no agota el fenómeno.`,
        construccion: `${phrase} Respondo construyendo: material simple + mundo vivo + autoría + colaboradores cero uno.`,
        proteccion: `${phrase} Si viene como humillación, no entra al centro; sólo se conserva la señal útil.`
      };
      safeText('#aemp-mode-output', output[mode] || 'Modo no encontrado.');
    });
  });
}

async function initStats() {
  try {
    const { data } = await getStats();
    if (!data.ok) throw new Error(data.error || 'No se pudieron leer stats.');
    safeText('#stat-zero-ones', toInt(data.totals?.zero_ones).toLocaleString('es-MX'));
    safeText('#stat-taps', toInt(data.totals?.taps).toLocaleString('es-MX'));
    safeText('#stat-today', toInt(data.today?.taps_today).toLocaleString('es-MX'));
    // Archivo v0.1.8 es memoria holística local, no changelog técnico desde Neon.
  } catch (err) {
    safeText('#stat-zero-ones', '—');
    safeText('#stat-taps', '—');
    safeText('#stat-today', '—');
    // No hay memoria técnica que actualizar en Archivo.
  }
}

function suggestScent({ announce = true } = {}) {
  const form = $('#creator-form');
  if (!form) return;
  if (!state.current) syncCreator();
  const seed = `${genomeCode(state.current)}|${Date.now()}|${cryptoUnit()}`;
  form.elements.scent.value = scentFromSeed(seed).slice(0, 100);
  syncCreator();
  document.dispatchEvent(new CustomEvent('ceroUno:creatorSeedChanged', { detail: { origin: 'olor sugerido por léxico Cero Uno' } }));
  if (announce) showToast('Olor sugerido desde el léxico material/sonoro de Cero Uno. Puedes cambiarlo libremente.');
}

function initActa() {

  $('#download-acta')?.addEventListener('click', () => {
    if (!state.current) syncCreator();
    const c = document.createElement('canvas');
    c.width = 900;
    c.height = 1200;
    c.style.width = '900px';
    c.style.height = '1200px';
    drawActa(c, state.current);
    const a = document.createElement('a');
    a.download = `${PLATFORM_COPY.acta.filenamePrefix}-${Date.now()}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  });
}

window.addEventListener('ceroUno:toast', (event) => showToast(event.detail || 'Cero Uno actualizó su comparecencia.'));

function showToast(text) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 4200);
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  initNav();
  safeText('#stat-zero-ones', '0');
  safeText('#stat-taps', '0');
  safeText('#stat-today', '0');

  await Promise.race([
    loadAssets().then(() => { state.assetsLoaded = true; }).catch((err) => {
      console.error('No se pudieron cargar assets:', err);
      showToast('Los assets visuales no cargaron; se usará modo fallback.');
    }),
    timeout(3000)
  ]);

  const form = $('#creator-form');
  form?.addEventListener('input', syncCreator);
  $('#randomize-button')?.addEventListener('click', () => randomizeCreator({ announce: true }));
  $('#mutate-button')?.addEventListener('click', mutateCurrent);
  $('#listen-current-button')?.addEventListener('click', () => listenToZeroOne());
  $('#suggest-scent-button')?.addEventListener('click', () => suggestScent());
  $('#publish-button')?.addEventListener('click', publishCurrent);
  $('#sort-top')?.addEventListener('click', () => loadGallery('top'));
  $('#sort-new')?.addEventListener('click', () => loadGallery('new'));

  initSequenceLab();
  initAemp();
  initActa();
  const commentSnapshot = await initCommentField();
  state.commentSnapshot = commentSnapshot;
  state.livingState = await initLivingState(commentSnapshot);
  state.ontologicalAge = await initOntologicalAge(state.livingState);
  state.currentMission = await initMissionSystem(state.livingState, state.ontologicalAge);
  state.initialAtlas = await initAtlasSystem(state.livingState, state.ontologicalAge, state.currentMission);
  state.distributedAemp = await initAempDistributedSystem({
    livingState: state.livingState,
    ontologicalAge: state.ontologicalAge,
    currentMission: state.currentMission,
    initialAtlas: state.initialAtlas
  });
  initCreatorFieldSystem(commentSnapshot);
  initGallerySocialSystem(commentSnapshot);
  initSequenceObservatorySystem(commentSnapshot);
  initAempFieldSystem(commentSnapshot);
  initOriginLivingSystem(commentSnapshot);
  initArchiveLivingSystem(commentSnapshot);
  state.socialField = await initSocialFieldSystem({
    commentSnapshot: state.commentSnapshot,
    livingState: state.livingState,
    ontologicalAge: state.ontologicalAge,
    currentMission: state.currentMission,
    initialAtlas: state.initialAtlas,
    distributedAemp: state.distributedAemp
  });
  randomizeCreator();
  startPreviewLoop();
  await Promise.allSettled([loadGallery('top'), initStats()]);
}

main().catch((err) => {
  console.error(err);
  document.body.classList.add('boot-error');
  showToast(`Error de arranque: ${err.message}`);
});
