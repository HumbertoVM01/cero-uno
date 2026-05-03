# Cero Uno Platform

Plataforma viva de comparecencias Cero Uno.

## Principio central

No se registran Cero Unos. Se propagan comparecencias.

La plataforma escucha el Campo Social, lo metaboliza y modifica su forma sin someterse a él. Los Cero Unos físicos, virtuales, audiovisuales, hechos por la comunidad o generados dentro de la plataforma tienen la misma dignidad conceptual.

## Módulos principales

- **Campo**: digest público seguro del Campo Social.
- **Inicio / Umbral**: entrada viva alimentada por el Campo Social.
- **Creador**: laboratorio para sembrar comparecencias desde colores, olores, formatos y deseos del campo.
- **Galería**: clima social de comparecencias; los taps son contacto, no likes.
- **Sequencia**: observatorio audible/visible del binario.
- **AEMP**: laboratorio de cambio de marco usando tensiones reales del Campo Social.
- **Origen**: historia viva de Cero Uno sin convertir el origen en autoridad cerrada.
- **Archivo**: memoria del concepto; no inventario de criaturas.

## Desarrollo

```bash
npm install
npm run check
npm run dev
```

## Deploy

```bash
npm run deploy:dry
```

La app está preparada para Netlify con funciones en `netlify/functions` y frontend estático en `public`.

## Runtime importante

- Snapshot del Campo Social: `public/data/comment-field/latest_snapshot.json`
- Código frontend: `public/js/`
- Assets visuales base: `public/assets/pompom.png`, `public/assets/gem.png`
- Audio de Sequencia: `public/assets/cero-uno-system/audio/sequence/`

## Actualizar el Campo Social

Reemplaza `public/data/comment-field/latest_snapshot.json` con un nuevo digest generado por ChatGPT a partir de comentarios recientes. No publiques dumps crudos de comentarios si contienen ataques, datos personales, drama de live o usuarios identificables innecesariamente.
