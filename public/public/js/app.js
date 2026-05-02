import { loadAssets, renderZeroOne, genomeFromForm, genomeCode, PART_KEYS, drawCertificate } from './renderer.js';
import { createZeroOne, listZeroOnes, tapZeroOne, getStats } from './api.js';
import { bitOfDay, bitSeed, interpretBits, generarBits } from './sequence.js';
import { playTapSound, playSequence, playDeployChime } from './audio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const state = { current: null, published: [], parentId: null };

// v0.1.1: no seeded/demo Cero Unos. La galería empieza vacía para no influir arbitrariamente la plataforma.

function showTab(id, pushHash = true) {
  const targetId = id || 'inicio';
  $$('main > section').forEach((section) => {
    section.classList.toggle('active-tab', section.id === targetId);
  });
  $$('.nav a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === `#${targetId}`);
  });
  if (pushHash) history.replaceState(null, '', `#${targetId}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initNav() {
  $$('main > section').forEach((section) => section.classList.add('tab-panel'));
  $$('.nav a, a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const id = href.slice(1);
      if ($(href)) {
        e.preventDefault();
        showTab(id);
      }
    });
  });
  const initial = location.hash && $(location.hash) ? location.hash.slice(1) : 'inicio';
  showTab(initial, false);
  window.addEventListener('hashchange', () => {
    const id = location.hash && $(location.hash) ? location.hash.slice(1) : 'inicio';
    showTab(id, false);
  });
}

function syncCreator() {
  const form = $('#creator-form');
  const z = genomeFromForm(form);
  state.current = z;
  $('#genome-code').textContent = genomeCode(z);
  $('#scent-count').textContent = `${z.scent.length}/100`;
  renderZeroOne($('#preview-canvas'), z);
}

function startPreviewLoop() {
  function frame() {
    if (state.current) renderZeroOne($('#preview-canvas'), state.current);
    $$('.zero-card canvas').forEach((canvas) => {
      const data = canvas.__zeroOne;
      if (data) renderZeroOne(canvas, data, { scale: 0.9 });
    });
    requestAnimationFrame(frame);
  }
  frame();
}

function randomHex(rng = Math.random) {
  const hues = ['#FFFFFF', '#000000', '#7F7F7F', '#67FFF0', '#FF66CC', '#FFFF66', '#66FF66', '#2362AE', '#6D45C9', '#FF7A00'];
  return hues[Math.floor(rng() * hues.length)];
}

function mutateCurrent() {
  const form = $('#creator-form');
  const seed = `${genomeCode(state.current)}|${Date.now()}`;
  const bits = bitSeed(seed, 16);
  const changed = [];
  PART_KEYS.forEach((key, idx) => {
    if (bits[idx] === '1') {
      form.elements[key].value = randomHex(() => Number(`0.${bitSeed(seed + key, 8).replace(/0/g, '1')}`) % 1 || Math.random());
      changed.push(key.replace('_hex', '').replaceAll('_', ' '));
    }
  });
  if (bits[10] === '1') form.elements.scent.value = ['coco digital', 'baby powder lunar', 'limón eléctrico', 'uva congelada', 'pompón recién nacido'][Number.parseInt(bits.slice(11, 14), 2) % 5];
  syncCreator();
  showToast(`Mutación local: ${changed.length ? changed.join(', ') : 'sólo aura binaria'}. No se guardó en Neon.`);
  playSequence(seed, 12);
}

async function publishCurrent() {
  const button = $('#publish-button');
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
  } catch (err) {
    showToast(`No se publicó: ${err.message}. Revisa DATABASE_URL y schema.sql.`);
  } finally {
    button.disabled = false;
    button.textContent = 'Publicar comparecencia';
  }
}

function renderGallery(items, mode = 'connected') {
  const grid = $('#gallery-grid');
  grid.innerHTML = '';
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    $('#gallery-mode').textContent = mode === 'error'
      ? 'Sin conexión a Neon'
      : 'Neon conectado · esperando el primer Cero Uno publicado';
    grid.innerHTML = `
      <article class="empty-gallery glass">
        <h3>La galería todavía está en silencio.</h3>
        <p>Aún no hay Cero Unos publicados. Esto es correcto: el desarrollo de la plataforma debe empezar desde comparecencias reales, no desde ejemplos arbitrarios.</p>
        <a class="button" href="#creator">Crear el primer Cero Uno</a>
      </article>`;
    return;
  }
  $('#gallery-mode').textContent = 'Conectado a Neon';
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
          <strong class="tap-count">${Number(z.tap_count || 0).toLocaleString('es-MX')}</strong>
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
    const { data } = await listZeroOnes(sort);
    state.published = data.zero_ones || [];
    renderGallery(state.published);
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
      count.textContent = Number(data.tap_count).toLocaleString('es-MX');
    }
    if (!data.accepted) showToast('Un tap por segundo. La secuencia no acepta autoclicker.');
  } catch (err) {
    showToast(`Tap no registrado: ${err.message}`);
  }
}

function loadIntoCreator(z) {
  const form = $('#creator-form');
  PART_KEYS.forEach((key) => { form.elements[key].value = z[key]; });
  form.elements.scent.value = z.scent || '';
  state.parentId = z.id || null;
  syncCreator();
  $('#creator').scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Mutación cargada en preview. Sólo se guarda si la publicas.');
}

function initSequenceLab() {
  const today = bitOfDay();
  $('#bit-day').textContent = today;
  $('#bit-day-meaning').textContent = today === '0'
    ? '0 = gestación, pausa, potencia todavía no desplegada.'
    : '1 = aparición, decisión, forma que entra al mundo.';
  $('#consult-sequence').addEventListener('click', () => {
    const seed = `oracle-${Date.now()}-${navigator.userAgent}`;
    const bits = bitSeed(seed, 32);
    $('#oracle-bits').textContent = bits;
    $('#oracle-reading').textContent = interpretBits(bits);
    playSequence(seed, 18);
  });
  $('#play-sequence').addEventListener('click', () => {
    const bits = playSequence(`listen-${new Date().toISOString().slice(0, 10)}`, 32);
    $('#sound-bits').textContent = bits;
  });
  $('#first-500').textContent = generarBits(160);
}

function initAemp() {
  const frames = {
    economico: 'Ve costo, tiempo, comisiones, materiales, envío y sostenibilidad.',
    artistico: 'Ve autoría, rareza, composición, cuerpo, ternura y lenguaje visual.',
    ontologico: 'Ve comparecencia: una secuencia universal entrando al mundo humano.',
    comunitario: 'Ve deseo, crítica, defensa, repetición, pertenencia y señal social.',
    tecnico: 'Ve Netlify, Neon, assets, funciones, Web Audio, seed y datos mínimos.'
  };
  const blind = {
    economico: 'Puede dejar fuera mundo simbólico, identidad, ritual y comunidad.',
    artistico: 'Puede dejar fuera logística, precio, calidad, escala y operación.',
    ontologico: 'Puede dejar fuera que alguien debe pegar, empacar, vender y contestar.',
    comunitario: 'Puede dejar fuera el centro: la fuente no es dictada por el ruido.',
    tecnico: 'Puede dejar fuera ternura, mito, rareza y peso humano.'
  };
  $$('.frame-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.frame;
      $('#aemp-frame-title').textContent = btn.textContent;
      $('#aemp-frame-body').textContent = frames[key];
      $('#aemp-blindspot').textContent = blind[key];
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
      $('#aemp-mode-output').textContent = output[mode];
    });
  });
}

async function initStats() {
  try {
    const { data } = await getStats();
    $('#stat-zero-ones').textContent = Number(data.totals.zero_ones || 0).toLocaleString('es-MX');
    $('#stat-taps').textContent = Number(data.totals.taps || 0).toLocaleString('es-MX');
    $('#stat-today').textContent = Number(data.today.taps_today || 0).toLocaleString('es-MX');
    const changelog = $('#changelog-list');
    changelog.innerHTML = '';
    (data.changelog || []).forEach((row) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${row.deploy_version} · ${row.title}</strong><span>${row.body}</span>`;
      changelog.appendChild(li);
    });
  } catch (err) {
    $('#stat-zero-ones').textContent = '—';
    $('#stat-taps').textContent = '—';
    $('#stat-today').textContent = '—';
  }
}

function initCertificate() {
  $('#download-certificate').addEventListener('click', () => {
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
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 4200);
}

async function main() {
  await loadAssets();
  initNav();
  const form = $('#creator-form');
  form.addEventListener('input', syncCreator);
  $('#mutate-button').addEventListener('click', mutateCurrent);
  $('#publish-button').addEventListener('click', publishCurrent);
  $('#sort-top').addEventListener('click', () => loadGallery('top'));
  $('#sort-new').addEventListener('click', () => loadGallery('new'));
  initSequenceLab();
  initAemp();
  initCertificate();
  syncCreator();
  startPreviewLoop();
  await loadGallery('top');
  await initStats();
  setInterval(initStats, 30000);
}

main().catch((err) => {
  console.error(err);
  document.body.classList.add('boot-error');
  showToast(`Error de arranque: ${err.message}`);
});
