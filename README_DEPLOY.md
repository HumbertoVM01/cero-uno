# Museo De ALLIVES — Deploy Netlify

Este ZIP contiene una aplicación nueva. No reutiliza los archivos de la plataforma 0100011011; solamente conserva como referencia la arquitectura Netlify + Neon.

## Antes del deploy

1. En Neon, abre el SQL Editor de la base que ya usabas.
2. Ejecuta `neon/reset-and-create.sql` una sola vez. Este archivo borra las tablas de la plataforma anterior y crea el esquema vacío de Museo De ALLIVES.
3. En Netlify, configura estas variables de entorno:
   - `DATABASE_URL`: connection string de Neon.
   - `VISITOR_HASH_SALT`: cualquier cadena larga y aleatoria propia del sitio.

## Deploy

El proyecto está configurado por `netlify.toml`:

- Publish directory: `public`
- Functions directory: `netlify/functions`
- Scheduled function: `refresh-windows`, cada minuto

Puedes subir este proyecto a Netlify como proyecto fuente. Netlify instalará `@neondatabase/serverless` y empaquetará las Functions durante el build.

Si prefieres Netlify CLI, desde la raíz del proyecto:

```bash
npm install
npx netlify deploy --prod
```

## Qué contiene

- 18 Pom Poms canónicos
- 13 gemas canónicas
- 39 efectos de sonido ajustados
- 120 olores con descripción y notas
- Portada con Top 3 histórico
- Creador ALLIVE con selección directa, glows alpha-aware, randomización y ruleta de olores
- Trading Cards 1500 × 2100 px
- Acariciar con Al Azar, Recientes, 24 h, 7 d, 30 d, 365 d y Más Acariciados
- Rankings móviles y actualización en vivo
- Cooldown global de 1 segundo por visitante
- Lista virtual que no consulta continuamente durante scroll rápido
- URLs individuales que abren el ALLIVE dentro de Más Acariciados

## Regla de identidad

Un ALLIVE exhibido es único por:

`cuerpo + pompón + brazo izq. + brazo der. + pierna izq. + pierna der. + ojo izq. + ojo der. + olor`

El texto `ALLIVE De ___` y `Exhibido Por ___` no forman parte de la deduplicación.

## Trading Cards

Las fichas se generan localmente en el navegador y no se almacenan en Neon. No incluyen rankings ni números de caricias, para que la imagen guardada no se vuelva obsoleta.
