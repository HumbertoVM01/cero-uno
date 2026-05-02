import { loadAssets, renderZeroOne, genomeFromForm, genomeCode, PART_KEYS, drawCertificate } from './renderer.js';
import { createZeroOne, listZeroOnes, tapZeroOne, getStats } from './api.js';
import { bitOfDay, bitSeed, interpretBits, generarBits, hashToUint32, mulberry32 } from './sequence.js';
import { playTapSound, playSequence, playDeployChime } from './audio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const state = { current: null, published: [], parentId: null, currentTab: 'inicio', assetsLoaded: false };

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
    $$('.nav a').forEach((a) => {
      const active = a.getAttribute('href') === `#${resolvedId}`;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
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

function componentToHex(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0; let g = 0; let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return `#${componentToHex((r + m) * 255)}${componentToHex((g + m) * 255)}${componentToHex((b + m) * 255)}`;
}

function randomHex(rng = cryptoUnit) {
  const neutrals = ['#FFFFFF', '#000000', '#7F7F7F'];
  const roll = rng();
  if (roll < 0.18) return neutrals[Math.floor(rng() * neutrals.length)];
  const hue = Math.floor(rng() * 12) * 30;
  const lightness = 48 + Math.floor(rng() * 24);
  return hslToHex(hue, 100, lightness);
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
  state.parentId = null;
  syncCreator();
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
    const scents = ['coco digital', 'baby powder lunar', 'limón eléctrico', 'uva congelada', 'pompón recién nacido', 'chicle ontológico', 'algodón de deploy'];
    form.elements.scent.value = scents[Number.parseInt(bits.slice(11, 14), 2) % scents.length];
  }
  syncCreator();
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
    showToast('Cero Uno publicado. Entró al mundo.');
    playDeployChime();
    state.parentId = null;
    await loadGallery('top');
    await initStats();
    showTab('galeria');
  } catch (err) {
    showToast(`No se publicó: ${err.message}. Revisa DATABASE_URL / NEON_DATABASE_URL y schema.sql.`);
  } finally {
    button.disabled = false;
    button.textContent = 'Publicar comparecencia';
  }
}

function renderGallery(items, mode = 'connected') {
  const grid = $('#gallery-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    safeText('#gallery-mode', mode === 'error'
      ? 'Sin conexión a Neon'
      : 'Neon conectado · esperando el primer Cero Uno publicado');
    grid.innerHTML = `
      <article class="empty-gallery glass">
        <h3>La galería todavía está en silencio.</h3>
        <p>Aún no hay Cero Unos publicados. Esto es correcto: el desarrollo de la plataforma debe empezar desde comparecencias reales, no desde ejemplos arbitrarios.</p>
        <a class="button" href="#creator">Crear el primer Cero Uno</a>
      </article>`;
    return;
  }
  safeText('#gallery-mode', 'Conectado a Neon');
  list.forEach((z) => {
    const card = document.createElement('article');
    card.className = 'zero-card glass';
    card.innerHTML = `
      <canvas width="260" height="310" aria-label="Cero Uno"></canvas>
      <div class="card-body">
        <code class="genome-small"></code>
        <p class="scent"></p>
        <div class="tap-row">
          <button class="tap-button">TAP</button>
          <strong class="tap-count">${toInt(z.tap_count).toLocaleString('es-MX')}</strong>
        </div>
        <button class="ghost-button mutate-from">Mutar este Cero Uno</button>
      </div>`;
    const canvas = $('canvas', card);
    canvas.__zeroOne = z;
    $('.genome-small', card).textContent = z.genome_code || genomeCode(z);
    $('.scent', card).textContent = z.scent ? `Olor: ${z.scent}` : 'Olor: sin olor declarado';
    $('.tap-button', card).addEventListener('click', () => handleTap(z, card));
    $('.mutate-from', card).addEventListener('click', () => loadIntoCreator(z));
    grid.appendChild(card);
  });
}

async function loadGallery(sort = 'top') {
  try {
    safeText('#gallery-mode', 'Leyendo Neon...');
    const { data } = await listZeroOnes(sort);
    if (!data.ok) throw new Error(data.error || 'No se pudo leer la galería.');
    state.published = data.zero_ones || [];
    renderGallery(state.published, 'connected');
  } catch (err) {
    renderGallery([], 'error');
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
      await initStats();
    }
    if (!data.accepted) showToast('Un tap por segundo. La sequencia no acepta autoclicker.');
  } catch (err) {
    showToast(`Tap no registrado: ${err.message}`);
  }
}

function loadIntoCreator(z) {
  const form = $('#creator-form');
  if (!form) return;
  PART_KEYS.forEach((key) => { form.elements[key].value = z[key] || '#FFFFFF'; });
  form.elements.scent.value = z.scent || '';
  state.parentId = z.id || null;
  syncCreator();
  showTab('creator');
  showToast('Mutación cargada en preview. Sólo se guarda si la publicas.');
}

function initSequenceLab() {
  const today = bitOfDay();
  safeText('#bit-day', today);
  safeText('#bit-day-meaning', today === '0'
    ? '0 = gestación, pausa, potencia todavía no desplegada.'
    : '1 = aparición, decisión, forma que entra al mundo.');

  const firstBits = generarBits(192);
  safeText('#first-500', firstBits);

  $('#consult-sequence')?.addEventListener('click', () => {
    const seed = `oracle-${Date.now()}-${navigator.userAgent}`;
    const bits = bitSeed(seed, 32);
    safeText('#oracle-bits', bits);
    safeText('#oracle-reading', interpretBits(bits));
    playSequence(seed, 18);
  });

  $('#play-sequence')?.addEventListener('click', () => {
    const bits = playSequence(`listen-${new Date().toISOString().slice(0, 10)}`, 32);
    safeText('#sound-bits', bits);
  });
}

function initAemp() {
  const frames = {
    economico: 'Ve costo, tiempo, comisiones, materiales, envío, sostenibilidad y presupuesto real. Es útil, pero no total.',
    artistico: 'Ve autoría, rareza, composición, cuerpo, ternura, textura y lenguaje visual. Es útil, pero no total.',
    ontologico: 'Ve comparecencia: una secuencia universal entrando al mundo humano mediante criatura, gesto y comunidad.',
    comunitario: 'Ve deseo, crítica, defensa, repetición, pertenencia, chisme, juego y señal social.',
    tecnico: 'Ve Netlify, Neon, assets, functions, Web Audio, seed, estado local y datos mínimos.'
  };
  const blind = {
    economico: 'Punto ciego: puede reducir presencia, ritual, identidad y mundo a puro costo.',
    artistico: 'Punto ciego: puede olvidar logística, calidad, envío, precio y operación.',
    ontologico: 'Punto ciego: puede olvidar que alguien debe pegar, empacar, vender y contestar.',
    comunitario: 'Punto ciego: puede confundir ruido con centro. La comunidad influye; no gobierna todo.',
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
        construccion: `${phrase} Respondo construyendo: material simple + mundo vivo + autoría + comunidad.`,
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
    const changelog = $('#changelog-list');
    if (changelog) {
      changelog.innerHTML = '';
      if (Array.isArray(data.changelog) && data.changelog.length) {
        data.changelog.forEach((row) => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${row.deploy_version} · ${row.title}</strong><span>${row.body}</span>`;
          changelog.appendChild(li);
        });
      } else {
        changelog.innerHTML = '<li><strong>Sin eventos todavía</strong><span>Neon está conectado, pero el changelog todavía no ha recibido nuevas entradas además de la base inicial.</span></li>';
      }
    }
  } catch (err) {
    safeText('#stat-zero-ones', '—');
    safeText('#stat-taps', '—');
    safeText('#stat-today', '—');
    const changelog = $('#changelog-list');
    if (changelog) changelog.innerHTML = '<li><strong>Sin conexión</strong><span>No pude leer el changelog. Revisa DATABASE_URL / NEON_DATABASE_URL y vuelve a desplegar.</span></li>';
  }
}

function initCertificate() {
  $('#download-certificate')?.addEventListener('click', () => {
    if (!state.current) syncCreator();
    const c = document.createElement('canvas');
    c.width = 900;
    c.height = 1200;
    c.style.width = '900px';
    c.style.height = '1200px';
    drawCertificate(c, state.current);
    const a = document.createElement('a');
    a.download = `certificado-cero-uno-${Date.now()}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  });
}

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
  $('#publish-button')?.addEventListener('click', publishCurrent);
  $('#sort-top')?.addEventListener('click', () => loadGallery('top'));
  $('#sort-new')?.addEventListener('click', () => loadGallery('new'));

  initSequenceLab();
  initAemp();
  initCertificate();
  randomizeCreator();
  startPreviewLoop();
  await Promise.allSettled([loadGallery('top'), initStats()]);
}

main().catch((err) => {
  console.error(err);
  document.body.classList.add('boot-error');
  showToast(`Error de arranque: ${err.message}`);
});
