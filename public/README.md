# Cero Uno · Primer Deploy · Phase 5 Platform Ready

Página viva para Netlify + Neon con el Master Asset Pack aplicado directamente al repo.

## Qué integra esta fase

- Creador de Cero Unos con assets transparentes de pompón y gema.
- Corrección de asset path para Netlify: `pompom.PNG` ahora también existe como `/assets/pompom.png`.
- Genoma HEX como nombre de cada comparecencia.
- Olor limitado a 100 caracteres + sugeridor de olor desde `SCENT_LEXICON`.
- Galería pública con taps entendidos como contacto, no like genérico.
- Protección básica anti-autoclicker: un tap por segundo por visitante y Cero Uno.
- Mutaciones locales que no escriben a Neon hasta que se publican.
- Secuencia binaria universal como seed generativo.
- Sonificación de bits y pares binarios con Web Audio API.
- Audio web-ready de Fase 4 copiado en `public/assets/cero-uno-system/audio/sequence/`.
- Laboratorio AEMP.
- Cámara de Origen corregida: Cero Uno ya tenía comparecencia material antes de la plataforma; la plataforma no registra ni posee esas instancias.
- Archivo Vivo corregido: memoria del concepto, no inventario de todos los Cero Unos.
- Acta de Comparecencia en lugar de certificado de autenticidad.

## Principio técnico/doctrinal

> Neon guarda comparecencias publicadas. El navegador sueña mutaciones. La plataforma no registra todos los Cero Unos.

> No se registran Cero Unos. Se propagan comparecencias.

La app no certifica autenticidad, no declara instancias oficiales y no jerarquiza físico sobre virtual. Los Cero Unos hechos por otras personas son igualmente válidos si participan del concepto.

## Estructura principal

```txt
public/
  index.html
  assets/
    pompom.png
    pompom.PNG
    gem.png
    cero-uno-system/
      contracts/
      manifests/
      audio/sequence/
  css/styles.css
  js/
    app.js
    api.js
    audio.js
    platform-assets.js
    renderer.js
    sequence.js
netlify/functions/
  create-zero-one.js
  list-zero-ones.js
  tap-zero-one.js
  stats.js
  _shared/
neon/schema.sql
netlify.toml
package.json
```

## Setup en Neon

1. Crea una base en Neon.
2. Abre el SQL Editor.
3. Copia y ejecuta `neon/schema.sql`.

## Setup en Netlify

1. Sube este folder a GitHub.
2. Crea un sitio nuevo en Netlify desde ese repo.
3. Configura:

```txt
Publish directory: public
Functions directory: netlify/functions
```

4. Agrega la variable de entorno:

```txt
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require
```

5. Deploy.

## Desarrollo local

```bash
npm install
cp .env.example .env
# rellena DATABASE_URL
npm run dev
```

## Revisión rápida

```bash
npm run phase5:check
```

## Seguridad y límites del MVP

Este primer deploy usa `device_id` en localStorage + IP + user-agent para generar un hash de visitante. Esto ayuda a limitar taps, pero no sustituye autenticación fuerte. Para un deploy posterior se puede agregar Auth0, turnstile/captcha suave o reglas más estrictas por IP.

## Modelo de datos esencial

- `zero_ones`: comparecencias publicadas, no registro total de Cero Unos existentes.
- `tap_guard`: anti-autoclicker temporal, un tap por segundo.
- `zero_one_tap_daily`: agregados diarios.
- `signals`: señales futuras.

## Secuencia binaria universal

El generador vive en `public/js/sequence.js`. No escribe a la base de datos. Se usa para:

- bit del día,
- oráculo de deploy,
- auras visuales,
- sonidos Web Audio,
- mutaciones locales,
- efectos diarios.
