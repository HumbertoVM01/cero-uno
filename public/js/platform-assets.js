export const CERO_UNO_CANON = Object.freeze({
  version: 'phase5_1h_archive_living',
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
  'lluvia de taps sobre acrílico',
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
  tapMeaning: 'El tap no es like: es contacto, señal y presión social mínima.',
  creatorNote: 'La plataforma no registra Cero Unos físicos ni decide cuáles son oficiales. Sólo permite que aparezcan nuevas comparecencias.'
});

export const MODULES = Object.freeze([
  { id: 'umbral', label: 'Umbral', consumes: ['canon', 'hero_renderer', 'sequence_breath'] },
  { id: 'creator', label: 'Creador', consumes: ['visual_parts', 'scent_lexicon', 'acta', 'listen_cero_uno'] },
  { id: 'gallery', label: 'Galería', consumes: ['tap_signal', 'social_reaction', 'listen_cero_uno'] },
  { id: 'sequencia', label: 'Sequencia', consumes: ['binary_query', 'bit_pair_sonification'] },
  { id: 'aemp', label: 'AEMP', consumes: ['frames', 'modes', 'blind_spots'] },
  { id: 'origen', label: 'Origen', consumes: ['creator_trace', 'material_comparecencia_context', 'comment_field_questions', 'no_registry_canon', 'history_without_cult'] },
  { id: 'archivo', label: 'Archivo', consumes: ['living_glossary', 'tension_cards', 'memory_not_registry'] }
]);

export function scentFromSeed(seed = '') {
  let h = 2166136261;
  const s = String(seed || 'cero-uno');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return SCENT_LEXICON[(h >>> 0) % SCENT_LEXICON.length];
}
