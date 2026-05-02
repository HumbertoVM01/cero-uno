# Cero Uno · Primer Deploy

Página viva para Netlify + Neon con:

- Creador de Cero Unos con assets transparentes de pompón y gema.
- Genoma HEX como nombre de cada Cero Uno.
- Olor limitado a 100 caracteres.
- Galería pública con taps.
- Protección básica anti-autoclicker: un tap por segundo por visitante y Cero Uno.
- Mutaciones locales que no escriben a Neon hasta que se publican.
- Secuencia binaria universal como seed generativo.
- Efectos visuales deterministas por genoma.
- Sonidos con Web Audio API.
- Laboratorio AEMP.
- Cámara de Origen de Humberto Vega / Cero Uno.
- Archivo de Conceptos.
- Changelog Vivo.

## Principio técnico

> Neon guarda comparecencias. El navegador sueña mutaciones. La secuencia binaria universal anima el sueño.

No se guardan bits, auras, sonidos ni previews. Sólo se guardan Cero Unos publicados, taps agregados y metadata mínima.

## Estructura

```txt
public/
  index.html
  assets/
    pompom.png
    gem.png
  css/styles.css
  js/
    app.js
    api.js
    audio.js
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

## Seguridad y límites del MVP

Este primer deploy usa `device_id` en localStorage + IP + user-agent para generar un hash de visitante. Esto ayuda a limitar taps, pero no sustituye autenticación fuerte. Para un deploy posterior se puede agregar Auth0, turnstile/captcha suave o reglas más estrictas por IP.

## Modelo de datos esencial

- `zero_ones`: comparecencias publicadas.
- `tap_guard`: anti-autoclicker temporal, un tap por segundo.
- `zero_one_tap_daily`: agregados diarios.
- `signals`: señales futuras.
- `deploy_changelog`: memoria del deploy.

## Secuencia binaria universal

El generador vive en `public/js/sequence.js`. No escribe a la base de datos. Se usa para:

- bit del día,
- oráculo de deploy,
- auras visuales,
- sonidos Web Audio,
- mutaciones locales,
- efectos diarios.
