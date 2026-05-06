import { playBits, playSequence } from './audio.js';

const $ = (sel, root = document) => root.querySelector(sel);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));
}

function list(value, limit = 6) {
  return Array.isArray(value) ? value.filter(Boolean).slice(0, limit) : [];
}

function family(snapshot, id) {
  return list(snapshot?.dominant_families, 20).find((item) => item.id === id) || null;
}

function familyBits(snapshot) {
  const families = list(snapshot?.dominant_families, 12);
  return families.map((item) => {
    const intensity = Number(item.intensity || 0);
    if (intensity >= 0.9) return '11';
    if (intensity >= 0.8) return '10';
    if (intensity >= 0.68) return '01';
    return '00';
  }).join('') || '0100011011';
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value ?? '';
}

function renderChipList(selector, values, max = 8) {
  const el = $(selector);
  if (!el) return;
  const chips = list(values, max);
  el.innerHTML = chips.map((value) => `<span>${escapeHtml(value)}</span>`).join('') || '<span>campo en escucha</span>';
}

function renderGalleryWeather(snapshot) {
  const el = $('#gallery-field-weather');
  if (!el) return;
  const families = list(snapshot?.dominant_families, 7);
  const selected = families.filter((item) => [
    'affection_tenderness',
    'customization_desire',
    'community_defense',
    'concept_confusion',
    'price_value_art_manualidad',
    'noise_friction_aggression'
  ].includes(item.id)).slice(0, 6);
  el.innerHTML = selected.map((item) => {
    const pct = Math.round(Number(item.intensity || 0) * 100);
    return `
      <article class="gallery-weather-pill" data-family="${escapeHtml(item.id)}" style="--meter:${pct}%">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${pct}%</span>
        <i></i>
      </article>`;
  }).join('') || '<p>El clima social espera el siguiente snapshot.</p>';
}

function renderGalleryTensions(snapshot) {
  const el = $('#gallery-field-tensions');
  if (!el) return;
  const tensions = list(snapshot?.aemp_tensions, 4);
  el.innerHTML = tensions.map((tension) => `
    <article>
      <strong>${escapeHtml(tension.title || tension.id || 'Tensión')}</strong>
      <span>${escapeHtml(tension.seed_phrase || '')}</span>
    </article>
  `).join('') || '<article><strong>Sin tensión dominante</strong><span>El campo está en latencia.</span></article>';
}


export function getTactileReading(tapCount = 0) {
  const count = Number(tapCount || 0);
  if (count <= 0) return 'Sin tacto visible todavía';
  if (count <= 3) return 'Tacto naciente';
  if (count <= 10) return 'Tacto suave';
  if (count <= 25) return 'Zona activa de contacto';
  if (count <= 50) return 'Tacto intenso';
  return 'Tacto persistente';
}

function buildTactileClimate(items = [], sort = 'top') {
  const list = Array.isArray(items) ? items : [];
  const count = list.length;
  const total = list.reduce((sum, item) => sum + Number(item.tap_count || 0), 0);
  const touched = list.filter((item) => Number(item.tap_count || 0) > 0).length;
  const max = list.reduce((best, item) => Math.max(best, Number(item.tap_count || 0)), 0);
  const dominant = count > 0 && max > 0 ? max / Math.max(1, total) : 0;
  const reading = !count
    ? 'La cámara todavía espera comparecencias visibles.'
    : !total
      ? 'Hay comparecencias visibles, pero el campo aún no dejó tacto.'
      : dominant > 0.65
        ? 'El tacto está concentrado en pocas formas; conviene vigilar presión competitiva.'
        : touched >= Math.max(2, Math.ceil(count * 0.35))
          ? 'El Campo Social está tocando varias formas; hay contacto distribuido.'
          : 'El tacto empieza a aparecer, todavía como señal naciente.';
  const order = sort === 'new' ? 'apariciones recientes' : 'más tacto visible';
  return { count, total, touched, max, order, reading };
}

export function updateGalleryTactileClimate(items = [], sort = 'top') {
  const el = $('#gallery-tactile-climate');
  if (!el) return;
  const climate = buildTactileClimate(items, sort);
  el.innerHTML = `
    <div class="tagline">Clima de Tacto</div>
    <div class="gallery-tactile-metrics">
      <span><strong>${climate.count.toLocaleString('es-MX')}</strong><i>comparecencias visibles</i></span>
      <span><strong>${climate.total.toLocaleString('es-MX')}</strong><i>tacto histórico visible</i></span>
      <span><strong>${climate.touched.toLocaleString('es-MX')}</strong><i>formas tocadas</i></span>
    </div>
    <p>${escapeHtml(climate.reading)}</p>
    <small>Orden actual: ${escapeHtml(climate.order)}. Más tacto visible no equivale a más verdad ni más oficialidad.</small>`;
}

function computeGalleryMode(snapshot) {
  const affection = family(snapshot, 'affection_tenderness')?.intensity || 0;
  const desire = family(snapshot, 'customization_desire')?.intensity || 0;
  const tension = family(snapshot, 'price_value_art_manualidad')?.intensity || 0;
  const noise = family(snapshot, 'noise_friction_aggression')?.intensity || 0;
  const defense = family(snapshot, 'community_defense')?.intensity || 0;

  if (noise >= 0.86 && defense >= 0.78) return {
    id: 'protected_pressure',
    label: 'clima: presión protegida',
    body: 'Hay ruido y defensa a la vez. La Cámara de Tacto muestra contacto sin premiar agresión: las comparecencias respiran con borde de protección.'
  };
  if (tension >= 0.9) return {
    id: 'value_debate',
    label: 'clima: debate de valor',
    body: 'El Campo Social está preguntando por precio, valor, arte y manualidad. La Cámara de Tacto muestra zonas de contacto, no superioridad ni autenticidad.'
  };
  if (affection >= 0.8 && desire >= 0.8) return {
    id: 'tender_desire',
    label: 'clima: ternura deseante',
    body: 'El Campo Social quiere tocar, personalizar y acercarse. Los toques se leen como microcontacto, no como likes.'
  };
  return {
    id: 'listening',
    label: 'clima: escucha abierta',
    body: 'La Cámara de Tacto está escuchando el Campo Social y muestra comparecencias como zonas temporales de contacto.'
  };
}

export function initGallerySocialSystem(snapshot) {
  window.__ceroUnoGalleryField = snapshot;
  const mode = computeGalleryMode(snapshot);
  document.body.dataset.galleryClimate = mode.id;

  setText('#gallery-field-summary', mode.body);
  setText('#gallery-field-mode', mode.label);
  renderGalleryWeather(snapshot);
  renderChipList('#gallery-field-desire-colors', snapshot?.creator_suggestions?.colors, 8);
  renderChipList('#gallery-field-desire-formats', snapshot?.creator_suggestions?.formats, 7);
  renderChipList('#gallery-field-desire-scents', snapshot?.creator_suggestions?.scents, 7);
  renderGalleryTensions(snapshot);

  const listen = $('#gallery-listen-climate');
  if (listen && !listen.dataset.wired) {
    listen.dataset.wired = 'true';
    listen.addEventListener('click', () => playBits(familyBits(window.__ceroUnoGalleryField), { step: 0.07, gain: 0.9, maxBits: 72 }));
  }

  const seed = $('#gallery-seed-from-climate');
  if (seed && !seed.dataset.wired) {
    seed.dataset.wired = 'true';
    seed.addEventListener('click', () => {
      if (window.__ceroUnoApplyCreatorFieldSeed) window.__ceroUnoApplyCreatorFieldSeed('field');
      location.hash = '#creator';
      window.__ceroUnoShowTab?.('creator', true);
    });
  }
}

export function updateGallerySocialReadout(items = [], sort = 'top') {
  const count = Array.isArray(items) ? items.length : 0;
  const taps = (Array.isArray(items) ? items : []).reduce((sum, item) => sum + Number(item.tap_count || 0), 0);
  const readout = count
    ? `${count.toLocaleString('es-MX')} comparecencia${count === 1 ? '' : 's'} · ${taps.toLocaleString('es-MX')} señal${taps === 1 ? '' : 'es'} de tacto visibles · lectura: ${sort === 'new' ? 'apariciones recientes' : 'más tacto visible'}`
    : 'La Cámara de Tacto todavía no muestra contacto visible.';
  setText('#gallery-social-readout', readout);
}

export function decorateGalleryCard(card, zeroOne, context = {}) {
  if (!card || !zeroOne) return;
  const tapCount = Number(zeroOne.tap_count || 0);
  const rank = Number(context.rank || 0);
  const total = Number(context.total || 0);
  const isQuiet = tapCount === 0;
  const tier = tapCount > 10 ? 'high-contact' : isQuiet ? 'latent' : 'contacted';
  card.dataset.socialTier = tier;
  card.style.setProperty('--contact-meter', `${Math.min(100, Math.max(6, tapCount * 7))}%`);

  const body = $('.card-body', card);
  if (!body || $('.gallery-social-layer', body)) return;

  const phrase = isQuiet
    ? 'Latencia visible · esperando primer tacto.'
    : `${getTactileReading(tapCount)} · no superioridad.`;
  const rankText = rank && total ? `ubicación temporal ${rank}/${total}` : 'sin rango fijo';
  const field = computeGalleryMode(window.__ceroUnoGalleryField || {});

  const layer = document.createElement('div');
  layer.className = 'gallery-social-layer';
  layer.innerHTML = `
    <div class="gallery-contact-meter"><i></i></div>
    <div class="gallery-social-copy">
      <strong>${escapeHtml(phrase)}</strong>
      <span>${escapeHtml(rankText)} · ${escapeHtml(field.label)}</span>
    </div>`;
  body.insertBefore(layer, body.querySelector('.tap-row') || null);
}

export function registerGalleryTapPulse(card, zeroOne) {
  if (!card) return;
  card.classList.add('gallery-contact-accepted');
  setTimeout(() => card.classList.remove('gallery-contact-accepted'), 820);
  const copy = $('.gallery-social-copy span', card);
  if (copy) copy.textContent = 'tacto aceptado · contacto, no voto · retorno blando';
  const bits = zeroOne?.genome_code || zeroOne?.genome_hash || '0100011011';
  playSequence(`${bits}|tap-contact`, 8);
}
