// Runtime asset cache namespace.
// V15.1 deliberately moves every mutable /assets/* request onto a fresh URL so
// browsers that cached an older immutable asset (notably Safari/iOS) cannot
// keep serving it after a deploy. Netlify now revalidates these versioned URLs
// on subsequent visits, so replacing an asset file no longer requires a rename.
export const ASSET_CACHE_VERSION = 'v15.1-20260816';

export function versionAsset(src){
  if(!src || typeof src !== 'string' || !src.startsWith('/assets/')) return src;
  const [base,hash=''] = src.split('#',2);
  const join = base.includes('?') ? '&' : '?';
  return `${base}${join}av=${encodeURIComponent(ASSET_CACHE_VERSION)}${hash?`#${hash}`:''}`;
}

export function versionCatalogAssets(catalog){
  for(const group of [catalog?.poms,catalog?.gems]){
    if(!Array.isArray(group)) continue;
    for(const item of group){ if(item?.src) item.src=versionAsset(item.src); }
  }
  return catalog;
}
