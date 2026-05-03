const DEFAULT_SNAPSHOT_URL = '/data/comment-field/latest_snapshot.json';

export const COMMENT_FIELD_FALLBACK = Object.freeze({
  schema_version: 'comment_field_snapshot.v1',
  snapshot_id: 'fallback_empty_field',
  governing_phrase: 'El colectivo habla. Cero Uno escucha sin someterse.',
  field_summary: 'El Campo Social todavía no ha cargado. La plataforma conserva su centro y espera el siguiente snapshot.',
  dominant_families: [],
  creator_suggestions: { colors: [], eyes: [], formats: [], scents: [], collective_prompt: '' },
  home_questions: [],
  aemp_tensions: [],
  platform_directives: ['Escuchar sin someterse.', 'Mostrar digestión, no exposición cruda.'],
  archive_entries: [],
  safety_rules: { raw_comments_public: false, show_usernames: false, digest_allowed: true }
});

export async function loadCommentFieldSnapshot(url = DEFAULT_SNAPSHOT_URL) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return normalizeCommentFieldSnapshot(data);
  } catch (error) {
    console.warn('[Comment Field] usando fallback:', error);
    return { ...COMMENT_FIELD_FALLBACK, load_error: error.message };
  }
}

export function normalizeCommentFieldSnapshot(snapshot) {
  const s = snapshot && typeof snapshot === 'object' ? snapshot : COMMENT_FIELD_FALLBACK;
  return {
    ...COMMENT_FIELD_FALLBACK,
    ...s,
    dominant_families: Array.isArray(s.dominant_families) ? s.dominant_families.map(normalizeFamily) : [],
    creator_suggestions: normalizeCreatorSuggestions(s.creator_suggestions),
    home_questions: Array.isArray(s.home_questions) ? s.home_questions.filter(Boolean) : [],
    aemp_tensions: Array.isArray(s.aemp_tensions) ? s.aemp_tensions.filter(Boolean) : [],
    platform_directives: Array.isArray(s.platform_directives) ? s.platform_directives.filter(Boolean) : [],
    archive_entries: Array.isArray(s.archive_entries) ? s.archive_entries.filter(Boolean) : []
  };
}

function normalizeFamily(family) {
  const intensity = Number(family?.intensity ?? 0);
  return {
    id: String(family?.id || 'unknown'),
    label: String(family?.label || 'Familia sin nombre'),
    intensity: Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0,
    polarity: String(family?.polarity || 'neutral'),
    readout: String(family?.readout || ''),
    safe_fragments: Array.isArray(family?.safe_fragments) ? family.safe_fragments.slice(0, 6) : [],
    platform_effect: String(family?.platform_effect || ''),
    visual_weather: Array.isArray(family?.visual_weather) ? family.visual_weather : [],
    audio_weather: Array.isArray(family?.audio_weather) ? family.audio_weather : []
  };
}

function normalizeCreatorSuggestions(value = {}) {
  const list = (arr) => Array.isArray(arr) ? [...new Set(arr.map(String).filter(Boolean))].slice(0, 24) : [];
  return {
    colors: list(value.colors),
    eyes: list(value.eyes),
    formats: list(value.formats),
    scents: list(value.scents),
    collective_prompt: String(value.collective_prompt || '')
  };
}

export function dominantFamily(snapshot) {
  return [...(snapshot?.dominant_families || [])].sort((a, b) => b.intensity - a.intensity)[0] || null;
}

export function commentFieldToBodyDataset(snapshot) {
  const top = dominantFamily(snapshot);
  return {
    commentField: snapshot?.snapshot_id || 'unknown',
    commentFieldTop: top?.id || 'none',
    commentFieldLoaded: snapshot?.load_error ? 'fallback' : 'true'
  };
}

export function chooseFromField(list, seed = Date.now()) {
  const arr = Array.isArray(list) ? list.filter(Boolean) : [];
  if (!arr.length) return '';
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return arr[(h >>> 0) % arr.length];
}
