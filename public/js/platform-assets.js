export const CERO_UNO_CANON = Object.freeze({
  version: 'phase6_9_campo_live',
  governing_phrase: 'No se registran Cero Unos. Se propagan comparecencias.',
  noOfficialInstances: true,
  physicalVirtualParity: true,
  conceptOverObject: true,
  archiveIsNotInventory: true
});

export const SCENT_LEXICON = Object.freeze([
  'pompón recién abierto',
  'gema tibia guardada en bolsillo',
  'electricidad suave con baby powder',
  'festival de flores después del live',
  'pegamento escolar y binario limpio',
  'algodón de deploy nocturno',
  'plástico dulce de ojitos nuevos',
  'limpia pipas bajo luz negra',
  'archivo vivo con polvo de estrella',
  'chicle ontológico',
  'señal húmeda de comentario',
  'coco digital con sombra rosa',
  'juguete que acaba de despertar',
  'mesa de manualidades y glitch tierno',
  'moneda tibia que no compra el mundo',
  'pantalla oscura y pompón blanco',
  'lluvia de tactos sobre acrílico',
  'bolsita de regalo con secuencia adentro',
  'neón suave y pelusa nueva',
  'memoria no registrada pero presente'
]);

export const PLATFORM_COPY = Object.freeze({
  acta: {
    title: 'Acta de Comparecencia',
    subtitle: 'No certifica autenticidad. Documenta una aparición temporal de Cero Uno.',
    filenamePrefix: 'acta-cero-uno'
  },
  galleryEmpty: 'La galería todavía está en silencio. Crea una comparecencia si quieres iniciar esta zona del archivo visible.',
  tapMeaning: 'El tap no es like ni voto: es tacto, contacto, señal y atención mínima.',
  creatorNote: 'La plataforma no registra Cero Unos físicos ni decide cuáles son oficiales. Sólo permite que aparezcan nuevas comparecencias.'
});

export const MODULES = Object.freeze([
  { id: 'umbral', label: 'Umbral', consumes: ['canon', 'hero_renderer', 'sequence_breath'] },
  { id: 'estado', label: 'Estado Vivo', consumes: ['ontological_age', 'living_variables', 'omega_care'] },
  { id: 'edad', label: 'Edad Ontológica', consumes: ['development_phase', 'current_organs', 'future_organs_protected'] },
  { id: 'mision', label: 'Misión Actual', consumes: ['living_state', 'ontological_age', 'current_cycle_action'] },
  { id: 'atlas', label: 'Atlas Inicial', consumes: ['living_state', 'ontological_age', 'mission', 'initial_nodes'] },
  { id: 'creator', label: 'Creador', consumes: ['visual_parts', 'scent_lexicon', 'acta', 'listen_cero_uno'] },
  { id: 'gallery', label: 'Cámara de Tacto', consumes: ['tactile_signal', 'social_reaction', 'listen_cero_uno'] },
  { id: 'sequencia', label: 'Sequencia', consumes: ['binary_query', 'bit_pair_sonification'] },
  { id: 'aemp', label: 'AEMP', consumes: ['frames', 'modes', 'blind_spots'] },
  { id: 'aemp_distribuido', label: 'AEMP Distribuido', consumes: ['module_readings', 'posture', 'omega_guardrails'] },
  { id: 'live', label: 'Campo LIVE', consumes: ['tiktok_live_comments', 'live_sessions', 'cycle_export'] },
  { id: 'origen', label: 'Origen', consumes: ['creator_trace', 'material_comparecencia_context', 'comment_field_questions', 'no_registry_canon', 'history_without_cult'] },
  { id: 'archivo', label: 'Archivo', consumes: ['living_glossary', 'tension_cards', 'memory_not_registry'] }
]);

export const MODULE_DOCTRINE = Object.freeze({

  live: {
    organ: 'Oído masivo del Campo Social',
    reads: ['comentarios TikTok LIVE', 'username público', 'hora de posteo', 'texto crudo'],
    touches: ['Sentido', 'Legibilidad', 'Tensión', 'Memoria'],
    omega: 'Confundir volumen de comentarios con verdad, mandato o análisis automático.'
  },
  aemp_distribuido: {
    organ: 'Regulación transversal de marcos',
    reads: ['Estado Vivo', 'Misión Actual', 'Atlas Inicial', 'Cámara de Tacto', 'Campo Social'],
    touches: ['Sentido', 'Cuidado', 'OMEGA', 'Frontera', 'Coordinación'],
    omega: 'Convertirse en análisis infinito o decoración filosófica sin operación.'
  },
  atlas: {
    organ: 'Primer mapa del sistema nervioso 01',
    reads: ['Estado Vivo', 'Edad Ontológica', 'Misión Actual', 'módulos actuales del Repo Código'],
    touches: ['Legibilidad', 'Sentido', 'Frontera', 'Cuidado'],
    omega: 'Convertir el atlas inicial en enciclopedia pesada, mapa total o autoridad cerrada.'
  },
  mision: {
    organ: 'Sistema motor suave',
    reads: ['Estado Vivo', 'Edad Ontológica', 'tensión dominante', 'modo recomendado'],
    touches: ['Coordinación', 'Legibilidad', 'Sentido', 'Agencia'],
    omega: 'Convertir acción situada en tarea obligatoria, ranking de cumplimiento o definición final.'
  },
  edad: {
    organ: 'Neurodesarrollo de plataforma',
    reads: ['Estado Vivo', 'Repo Hablado', 'órganos actuales', 'riesgos OMEGA'],
    touches: ['Frontera', 'Cuidado', 'Legibilidad', 'Agencia'],
    omega: 'Activar órganos adultos antes de que 01 pueda sostenerlos.'
  },
  estado: {
    organ: 'Interocepción de plataforma',
    reads: ['Campo Social', 'tacto', 'comparecencias', 'archivo'],
    touches: ['Energía', 'Sentido', 'Mutación', 'Materialidad', 'Coordinación', 'Legibilidad', 'Tensión', 'OMEGA'],
    omega: 'Confundir una lectura provisional con marcador, ranking o verdad final.'
  },
  creator: {
    organ: 'Neurogénesis de comparecencias',
    reads: ['deseos del campo', 'sequencia', 'mutaciones locales'],
    touches: ['Mutación', 'Materialidad', 'Presencia'],
    omega: 'Volver oficiales las criaturas generadas.'
  },
  gallery: {
    organ: 'Cámara de tacto',
    reads: ['tacto', 'apariciones publicadas'],
    touches: ['Energía', 'Presencia', 'Coordinación'],
    omega: 'Convertir tacto en ranking, fama o voto de valor.'
  }
});

export function scentFromSeed(seed = '') {
  let h = 2166136261;
  const s = String(seed || 'cero-uno');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return SCENT_LEXICON[(h >>> 0) % SCENT_LEXICON.length];
}
