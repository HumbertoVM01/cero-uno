import { bitSeed, interpretBits } from './sequence.js';
import { playBits } from './audio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const FRAME_LABELS = {
  economico: 'Marco económico',
  artistico: 'Marco artístico',
  ontologico: 'Marco ontológico',
  campo: 'Marco de Campo Vivo',
  tecnico: 'Marco técnico'
};

const FRAME_ORDER = ['economico', 'artistico', 'ontologico', 'campo', 'tecnico'];
const MODE_ORDER = ['liberacion', 'examen', 'construccion', 'proteccion'];

const FALLBACK_TENSIONS = [
  {
    id: 'precio_vs_valor',
    title: 'Precio vs. valor percibido',
    seed_phrase: 'Está caro.',
    frames: ['económico', 'artístico', 'ontológico', 'Campo Vivo', 'técnico']
  },
  {
    id: 'arte_vs_manualidad',
    title: 'Arte vs. manualidad',
    seed_phrase: 'Eso sólo es un pompón.',
    frames: ['económico', 'artístico', 'ontológico', 'Campo Vivo', 'técnico']
  }
];

let tensions = [];
let activeIndex = 0;
let activeFrame = 'ontologico';
let activeMode = 'examen';
let snapshotCache = null;

function setText(sel, value) {
  const el = $(sel);
  if (el) el.textContent = value == null ? '' : String(value);
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeTension(tension, index) {
  if (typeof tension === 'string') {
    return {
      id: `tension_${index}`,
      title: tension,
      seed_phrase: tension,
      frames: ['económico', 'artístico', 'ontológico', 'Campo Vivo', 'técnico']
    };
  }
  return {
    id: tension?.id || `tension_${index}`,
    title: tension?.title || tension?.id || `Tensión ${index + 1}`,
    seed_phrase: tension?.seed_phrase || tension?.title || 'Frase del campo',
    frames: list(tension?.frames).length ? tension.frames : ['económico', 'artístico', 'ontológico', 'Campo Vivo', 'técnico']
  };
}

function currentTension() {
  return tensions[activeIndex] || FALLBACK_TENSIONS[0];
}

function frameText(tension, frameKey) {
  const phrase = tension.seed_phrase || tension.title;
  const id = tension.id || '';
  const base = {
    economico: {
      body: `Lee “${phrase}” como relación entre costo, tiempo, materiales, riesgo, envío, demanda y presupuesto del público. Ve una parte real: la sustentabilidad también necesita números.`,
      blind: 'Punto ciego: puede reducir presencia, deseo, rareza, juego, cuidado y mundo a puro costo visible.'
    },
    artistico: {
      body: `Lee “${phrase}” como juicio sobre gesto, composición, sensibilidad, estilo, rareza y capacidad de abrir imaginario. Ve que el objeto no sólo cuesta: aparece con lenguaje.`,
      blind: 'Punto ciego: puede olvidar operación, consistencia, calidad, materiales, envío y límites económicos concretos.'
    },
    ontologico: {
      body: `Lee “${phrase}” como choque entre objeto y comparecencia. Pregunta qué aparece cuando un pompón, un comentario, una secuencia y un Campo Vivo se vuelven una misma zona viva.`,
      blind: 'Punto ciego: puede elevar demasiado el fenómeno y perder contacto con la experiencia inmediata de quien sólo ve una bolita.'
    },
    campo: {
      body: `Lee “${phrase}” como señal del Campo Vivo: pertenencia, defensa, burla, deseo, repetición, chisme, cuidado, FOMO y clima de live. No hay una voz única: hay campo.`,
      blind: 'Punto ciego: puede confundir intensidad social con verdad, valor o dirección estratégica.'
    },
    tecnico: {
      body: `Lee “${phrase}” como problema de sistema: assets, calidad, render, sonificación, flujo de compra, claridad de UI, performance, datos y consistencia de producción.`,
      blind: 'Punto ciego: puede dejar fuera ternura, historia, ritual, agencia social y peso simbólico.'
    }
  };

  if (id.includes('ia')) {
    base.tecnico.body = `Lee “${phrase}” como pregunta sobre herramienta, mediación y pipeline. IA no reemplaza automáticamente autoría: puede amplificar, distorsionar o revelar la intención según cómo se use.`;
    base.ontologico.body = `Lee “${phrase}” como tensión de agencia: ¿quién habla cuando Cero Uno se formula con IA, comentarios, cuerpo humano y plataforma?`;
  }
  if (id.includes('funcion')) {
    base.economico.body = `Lee “${phrase}” desde utilidad percibida: para algunas personas el valor depende de servicio directo; para otras, de identidad, ritual, regalo o pertenencia.`;
    base.ontologico.body = `Lee “${phrase}” como pregunta central: quizá Cero Uno no sirve como herramienta, sino como presencia que reorganiza relación, juego y significado.`;
  }
  if (id.includes('regalo')) {
    base.campo.body = `Lee “${phrase}” como tensión entre generosidad, sorteo, regalo, venta, apoyo y sostenibilidad del ecosistema.`;
    base.economico.body = `Lee “${phrase}” como equilibrio entre regalar para propagar y cobrar para que la práctica siga existiendo.`;
  }

  return base[frameKey] || base.ontologico;
}

function modeText(tension, modeKey) {
  const phrase = `“${tension.seed_phrase || tension.title}”`;
  const map = {
    liberacion: `${phrase} no tiene permiso de capturar todo el fenómeno. La plataforma se libera de una lectura única sin negar que esa lectura contiene una señal.`,
    examen: `${phrase} se examina despacio: ¿qué parte describe algo real, qué parte exagera, qué parte es presión social y qué parte pide una mejor explicación?`,
    construccion: `${phrase} se convierte en diseño: mejor copy, mejor Creador, mejor visualización del valor, más claridad del concepto y más cuidado del campo.`,
    proteccion: `${phrase} entra filtrada: se conserva la tensión útil, pero no se deja que la humillación, el spam o el ataque personal gobiernen el centro.`
  };
  return map[modeKey] || map.examen;
}

function renderTensionList() {
  const root = $('#aemp-tension-list');
  if (!root) return;
  root.innerHTML = '';
  tensions.forEach((tension, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `aemp-tension-chip${index === activeIndex ? ' active' : ''}`;
    button.textContent = tension.title;
    button.title = tension.seed_phrase;
    button.addEventListener('click', () => {
      activeIndex = index;
      renderAll();
      playTension({ subtle: true });
    });
    root.appendChild(button);
  });
}

function renderTags(tension) {
  const root = $('#aemp-tension-tags');
  if (!root) return;
  root.innerHTML = '';
  list(tension.frames).forEach((tag) => {
    const span = document.createElement('span');
    span.textContent = tag;
    root.appendChild(span);
  });
}

function renderFrameButtons() {
  $$('.frame-button').forEach((button) => {
    const frame = button.dataset.frame;
    button.classList.toggle('active', frame === activeFrame);
  });
}

function renderModeButtons() {
  $$('.mode-button').forEach((button) => {
    const mode = button.dataset.mode;
    button.classList.toggle('active', mode === activeMode);
  });
}

function renderFrameOutput() {
  const tension = currentTension();
  const frame = frameText(tension, activeFrame);
  setText('#aemp-frame-title', FRAME_LABELS[activeFrame] || 'Marco activo');
  setText('#aemp-frame-body', frame.body);
  setText('#aemp-blindspot', frame.blind);
}

function renderModeOutput() {
  const tension = currentTension();
  setText('#aemp-mode-output', modeText(tension, activeMode));
}

function renderMatrix() {
  const root = $('#aemp-frame-matrix');
  if (!root) return;
  const tension = currentTension();
  root.innerHTML = '';
  FRAME_ORDER.forEach((frameKey) => {
    const frame = frameText(tension, frameKey);
    const card = document.createElement('article');
    card.className = `aemp-matrix-card${frameKey === activeFrame ? ' active' : ''}`;
    card.innerHTML = `<strong>${FRAME_LABELS[frameKey]}</strong><p>${frame.body}</p><em>${frame.blind}</em>`;
    card.addEventListener('click', () => {
      activeFrame = frameKey;
      renderAll();
    });
    root.appendChild(card);
  });
}

function archiveNote(tension = currentTension()) {
  const frame = FRAME_LABELS[activeFrame] || activeFrame;
  const mode = activeMode;
  return `Tensión conservada: ${tension.title}\nFrase semilla: “${tension.seed_phrase}”\nMarco activo: ${frame}\nModo operativo: ${mode}\nNota: no se resuelve rápido; se conserva como material para que Cero Uno escuche sin someterse.`;
}

function renderArchiveBridge() {
  const tension = currentTension();
  setText('#aemp-archive-note', `Archivo sugerido: conservar “${tension.title}” como tensión viva. No es conclusión ni defensa final; es memoria operativa para el siguiente ciclo.`);
}

function renderAll() {
  const tension = currentTension();
  setText('#aemp-active-title', tension.title);
  setText('#aemp-seed-phrase', `“${tension.seed_phrase}”`);
  setText('#aemp-active-reading', interpretBits(bitSeed(`${tension.id}|${tension.seed_phrase}`, 32)));
  setText('#aemp-field-bridge', snapshotCache?.field_summary || 'El AEMP Lab lee tensiones seguras del Campo Social, no comentarios crudos.');
  renderTags(tension);
  renderTensionList();
  renderFrameButtons();
  renderModeButtons();
  renderFrameOutput();
  renderModeOutput();
  renderMatrix();
  renderArchiveBridge();
  document.body.dataset.aempTension = tension.id;
}

function playTension({ subtle = false } = {}) {
  const tension = currentTension();
  const seed = `${tension.id}|${tension.seed_phrase}|${activeFrame}|${activeMode}`;
  const bits = bitSeed(seed, subtle ? 20 : 48);
  playBits(bits, { step: subtle ? 0.04 : 0.055, gain: subtle ? 0.55 : 0.9, maxBits: subtle ? 20 : 48 });
  document.dispatchEvent(new CustomEvent('ceroUno:aempTensionPlayed', { detail: { tension, bits, frame: activeFrame, mode: activeMode } }));
}

function wireEvents() {
  $$('.frame-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeFrame = button.dataset.frame || 'ontologico';
      renderAll();
      playTension({ subtle: true });
    });
  });

  $$('.mode-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeMode = button.dataset.mode || 'examen';
      renderAll();
      playTension({ subtle: true });
    });
  });

  $('#aemp-play-tension')?.addEventListener('click', () => playTension());
  $('#aemp-next-tension')?.addEventListener('click', () => {
    activeIndex = (activeIndex + 1) % Math.max(1, tensions.length);
    renderAll();
    playTension({ subtle: true });
  });

  $('#aemp-copy-archive-note')?.addEventListener('click', async () => {
    const note = archiveNote();
    try {
      await navigator.clipboard?.writeText(note);
      setText('#aemp-archive-note', 'Nota de Archivo copiada. Puede pegarse en el próximo ciclo del Archivo Vivo.');
    } catch (_) {
      setText('#aemp-archive-note', note);
    }
  });
}

export function initAempFieldSystem(snapshot) {
  snapshotCache = snapshot || {};
  tensions = list(snapshotCache.aemp_tensions).map(normalizeTension);
  if (!tensions.length) tensions = FALLBACK_TENSIONS.map(normalizeTension);
  activeIndex = 0;
  activeFrame = 'ontologico';
  activeMode = 'examen';
  wireEvents();
  renderAll();
}
