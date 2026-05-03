import { chooseFromField } from './comment-field-engine.js';
import { playBits, playSequence } from './audio.js';

const ORIGIN_QUESTIONS = Object.freeze([
  {
    id: 'what_is_cero_uno',
    question: '¿Qué es un Cero Uno?',
    reading: 'No es sólo producto, mascota o manualidad. Es una comparecencia de la Sequencia: puede aparecer como objeto, imagen, sonido, olor, comentario, video, plataforma o gesto comunitario.',
    bits: '0100011011'
  },
  {
    id: 'why_01',
    question: '¿Por qué 01?',
    reading: 'Porque 0 y 1 son diferencia mínima, decisión, código y posibilidad. Cero Uno usa esa diferencia como ADN simbólico, no como decoración binaria vacía.',
    bits: '0101'
  },
  {
    id: 'before_names',
    question: '¿Cómo se llamaban antes?',
    reading: 'Los nombres anteriores no se borran: son estratos de una misma búsqueda. La Cámara de Origen conserva que la forma actual apareció después de varios ensayos de nombre, objeto y mundo.',
    bits: '001101'
  },
  {
    id: 'ia_authoring',
    question: '¿Qué tiene que ver la IA?',
    reading: 'La IA no reemplaza la mano ni la historia. Funciona como mediador de ciclos: lee el campo social, ayuda a formular lenguaje, organiza tensiones y devuelve material para que la plataforma cambie.',
    bits: '101001'
  },
  {
    id: 'gift_history',
    question: '¿Cuándo empezó a salir al mundo?',
    reading: 'Antes del sitio ya había práctica material: meses de lives y más de 200 Cero Unos regalados. La plataforma no inaugura esa vida; aprende a escucharla.',
    bits: '11100001'
  },
  {
    id: 'festival_capture',
    question: '¿Qué fue lo del Festival de Flores?',
    reading: 'No fue el primer regalo en persona. Fue la primera captura audiovisual accidental de una transferencia material durante live: evidencia visible de una práctica previa.',
    bits: '01001110'
  },
  {
    id: 'no_registry',
    question: '¿Hay Cero Unos oficiales?',
    reading: 'No. No hay registro total, autenticidad centralizada ni jerarquía entre físico y virtual. Si alguien hace su propio Cero Uno y activa el concepto, también comparece.',
    bits: '000111'
  }
]);

const THESES = Object.freeze([
  {
    title: 'La plataforma llegó después de la comparecencia.',
    body: 'Antes de que el sitio pudiera nombrarse como plataforma, ya había Cero Unos regalados, pedidos, criticados, defendidos, imaginados y materialmente repartidos.',
    bits: '0100011011'
  },
  {
    title: 'Humberto trae la Sequencia, pero no la encierra.',
    body: 'La Cámara de Origen puede nombrar al creador sin convertirlo en aduana ontológica. Cero Uno se sostiene por propagación, no por control central.',
    bits: '011011'
  },
  {
    title: 'El origen no certifica; orienta.',
    body: 'Saber de dónde viene Cero Uno no vuelve inválidas otras comparecencias. Al contrario: permite que más personas lo traduzcan sin pedir permiso.',
    bits: '110010'
  },
  {
    title: 'El archivo no posee el mundo.',
    body: 'Hay Cero Unos físicos y virtuales fuera de cualquier captura. La plataforma acepta esa opacidad y trabaja con lo que vuelve como señal, pregunta o deseo.',
    bits: '001011'
  }
]);

const FIELD_ORIGIN_KEYWORDS = [
  'qué es', 'que es', 'por qué', 'porque', '01', 'cero uno', 'app', 'plataforma', 'concepto',
  'significa', 'nombre', 'antes', 'ia', 'chatgpt', 'origen', 'historia', 'hacer', 'sirve'
];

const $ = (sel, root = document) => root.querySelector(sel);

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

function originQuestionsFromSnapshot(snapshot) {
  const fromHome = Array.isArray(snapshot?.home_questions) ? snapshot.home_questions : [];
  const filtered = fromHome
    .map(String)
    .filter((q) => FIELD_ORIGIN_KEYWORDS.some((k) => q.toLowerCase().includes(k)))
    .slice(0, 6)
    .map((q, i) => ({
      id: `field_${i}`,
      question: q,
      reading: readingForFieldQuestion(q),
      bits: bitsForQuestion(q)
    }));
  const merged = [...filtered, ...ORIGIN_QUESTIONS];
  const seen = new Set();
  return merged.filter((item) => {
    const key = item.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function readingForFieldQuestion(question) {
  const q = String(question || '').toLowerCase();
  if (q.includes('sirve')) return 'El Campo Social pregunta por función. La Cámara de Origen responde: Cero Uno no sirve sólo como herramienta; sirve como criatura, símbolo, regalo, conversación y forma de organizar atención.';
  if (q.includes('app') || q.includes('plataforma')) return 'El colectivo pregunta por la aplicación antes de que termine de estabilizarse. Esa pregunta también es origen: la plataforma nace porque el campo ya está pidiendo una casa para la comparecencia.';
  if (q.includes('ia') || q.includes('chatgpt')) return 'La IA aparece como mediador, no como sustituto total. La mano, el live, el comentario, el objeto y el lenguaje siguen participando.';
  if (q.includes('por qué') || q.includes('porque') || q.includes('01')) return 'El 01 nombra una diferencia mínima que puede volverse mundo: cero/uno, ausencia/aparición, pregunta/respuesta, código/cuerpo.';
  return 'Esta pregunta del Campo Social no se clausura con una definición. Se conserva como puerta de entrada para que la plataforma explique menos y muestre más.';
}

function bitsForQuestion(question) {
  const s = String(question || 'origen');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(2).padStart(32, '0').slice(0, 12);
}

let activeQuestionIndex = 0;
let activeThesisIndex = 0;
let currentQuestions = ORIGIN_QUESTIONS;

function renderQuestionList(questions) {
  const wrap = $('#origin-question-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  questions.slice(0, 7).forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'origin-question-chip';
    btn.textContent = item.question;
    btn.addEventListener('click', () => setActiveQuestion(idx));
    wrap.appendChild(btn);
  });
}

function setActiveQuestion(index) {
  const questions = currentQuestions.length ? currentQuestions : ORIGIN_QUESTIONS;
  activeQuestionIndex = ((index % questions.length) + questions.length) % questions.length;
  const q = questions[activeQuestionIndex];
  setText('#origin-question-title', q.question);
  setText('#origin-question-reading', q.reading);
  $$('#origin-question-list .origin-question-chip').forEach((btn, i) => btn.classList.toggle('active', i === activeQuestionIndex));
  playBits(q.bits, { maxBits: 16, step: 0.055, gain: 0.72 });
}

function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

function rotateThesis(play = true) {
  activeThesisIndex = (activeThesisIndex + 1) % THESES.length;
  const t = THESES[activeThesisIndex];
  setText('#origin-active-thesis', t.title);
  setText('#origin-thesis-body', t.body);
  if (play) playBits(t.bits, { maxBits: 14, step: 0.06, gain: 0.78 });
}

function updateArchiveNote(snapshot) {
  const top = snapshot?.dominant_families?.[0]?.label || 'Campo Social';
  const scent = chooseFromField(snapshot?.creator_suggestions?.scents || [], 'origin-memory') || 'memoria no registrada pero presente';
  const note = `Origen vivo: Humberto Vega / Cero Uno trajo la Sequencia al mundo humano, pero la plataforma no certifica ni registra instancias. Ya existían meses de regalos y 200+ Cero Unos distribuidos antes del archivo formal. El campo actual (${top}) recuerda que el origen debe oler a ${scent}: presencia, no propiedad.`;
  setText('#origin-archive-note', note);
}

export function initOriginLivingSystem(snapshot) {
  currentQuestions = originQuestionsFromSnapshot(snapshot);
  renderQuestionList(currentQuestions);
  setActiveQuestion(0);
  updateArchiveNote(snapshot);

  $('#origin-next-question')?.addEventListener('click', () => setActiveQuestion(activeQuestionIndex + 1));
  $('#origin-play-story')?.addEventListener('click', () => {
    rotateThesis(true);
    playSequence(`origin|${THESES[activeThesisIndex].title}|${snapshot?.snapshot_id || 'field'}`, 18);
  });
  $('#origin-copy-archive-note')?.addEventListener('click', async () => {
    const text = $('#origin-archive-note')?.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      window.dispatchEvent(new CustomEvent('ceroUno:toast', { detail: 'Nota de origen copiada para Archivo Vivo.' }));
    } catch (_) {
      alert(text);
    }
  });

  document.addEventListener('ceroUno:fieldSnapshotUpdated', (event) => {
    currentQuestions = originQuestionsFromSnapshot(event.detail?.snapshot || snapshot);
    renderQuestionList(currentQuestions);
    setActiveQuestion(0);
    updateArchiveNote(event.detail?.snapshot || snapshot);
  });

  window.__ceroUnoOriginLiving = { questions: currentQuestions, theses: THESES };
}
