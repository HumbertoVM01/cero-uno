# Cero Uno Platform

Plataforma viva de comparecencias Cero Uno.

## Principio central

No se registran Cero Unos. Se propagan comparecencias.

La plataforma escucha el Campo Social, lo metaboliza y modifica su forma sin someterse a él. Los Cero Unos físicos, virtuales, audiovisuales, hechos por colaboradores cero uno o generados dentro de la plataforma tienen la misma dignidad conceptual.

## Módulos principales

- **Inicio / Umbral**: entrada viva alimentada por el Campo Social.
- **Estado Vivo**: interocepción de 01; muestra variables de clima, tensión dominante, modo operativo y cuidado OMEGA.
- **Edad Ontológica**: lectura de desarrollo funcional; explica qué puede hacer 01, qué todavía no debe hacer y qué órgano necesita formar después.
- **Misión Actual**: primer sistema motor suave; traduce Estado Vivo y Edad Ontológica en una acción posible sin ranking ni presión.
- **Atlas Inicial**: primer mapa de órganos funcionales de 01; muestra órganos activos, en formación, latentes, protegidos y horizonte.
- **Campo**: digest público seguro del Campo Social.
- **Creador**: laboratorio para sembrar comparecencias desde colores, olores, formatos y deseos del campo.
- **Cámara de Tacto**: clima social de comparecencias; los taps se leen como tacto/contacto, no likes, votos ni puntos.
- **Sequencia**: observatorio audible/visible del binario.
- **AEMP**: laboratorio de cambio de marco usando tensiones reales del Campo Social.
- **AEMP Distribuido**: regulación transversal; recuerda que cada órgano ilumina algo, deja algo fuera y necesita contrapeso.
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
- Estado Vivo manual: `public/data/state/current_state.json`
- Edad Ontológica manual: `public/data/development/ontological_age.json`
- Misión Actual manual: `public/data/missions/current_mission.json`
- Atlas Inicial manual: `public/data/atlas/initial_nodes.json`
- AEMP Distribuido manual: `public/data/aemp/distributed_aemp.json`
- Código frontend: `public/js/`
- Assets visuales base: `public/assets/pompom.png`, `public/assets/gem.png`
- Audio de Sequencia: `public/assets/cero-uno-system/audio/sequence/`

## Actualizar el Campo Social

Reemplaza `public/data/comment-field/latest_snapshot.json` con un nuevo digest generado por ChatGPT a partir de comentarios recientes. No publiques dumps crudos de comentarios si contienen ataques, datos personales, drama de live o personas identificables innecesariamente.

## Poda lingüística v0.2

Esta versión aplica la primera poda del Repo Código para que la interfaz deje de hablar como red social genérica y empiece a hablar desde el Repo Hablado.

Reglas activas:

- No usar “comunidad” como término rector; usar **colaboradores cero uno** para personas y **Campo Social** para el conjunto de señales.
- No narrar la Galería como ranking; mostrarla como **Cámara de Tacto** o zona de contacto visible.
- No presentar taps como votos, puntos ni likes; un tap es tacto/contacto/señal.
- No convertir Cero Unos publicados en instancias oficiales; son comparecencias visibles dentro de esta plataforma.
- No presentar la plataforma como producto terminado; es un organismo en desarrollo.

Notas técnicas: esta poda no renombra variables, endpoints ni columnas como `tap_count`, `tap_guard` o `sort=top`, porque esos nombres pertenecen al contrato técnico actual. La poda aplicada es de lenguaje visible y doctrina de interfaz.


## Estado Vivo v0.2.1

Esta versión agrega el primer órgano de interocepción de 01. Estado Vivo no es analytics, score ni dashboard de popularidad: es una lectura provisional del organismo en desarrollo.

Reglas activas:

- Mostrar edad ontológica antes que métricas: 01 está en fase **Tubo Neural / Reflejos iniciales**.
- Leer variables como clima de desarrollo, no como trofeos: Energía, Sentido, Mutación, Materialidad, Coordinación, Legibilidad, Tensión y OMEGA.
- Mantener la lectura editable desde `public/data/state/current_state.json`; todavía no se calcula automáticamente desde comentarios.
- Recordar que el Campo Social alimenta el estado, pero no lo determina ni gobierna de forma automática.
- Usar OMEGA como cuidado frente a captura, presión, oficialidad falsa, ranking bruto o exceso de recompensa.
- En v0.2.1 preparaba el siguiente órgano: **Misión Actual**. En v0.2.3 ese órgano ya existe y prepara **Atlas Inicial**.

Archivos agregados:

- `public/data/state/current_state.json`
- `public/js/living-state-system.js`

El módulo se inicializa desde `public/js/app.js` después de cargar el Campo Social y antes de los sistemas de Creador, Cámara de Tacto, Sequencia, AEMP, Origen y Archivo.


## Edad Ontológica v0.2.2

Esta versión separa la madurez funcional de 01 de la versión técnica. Edad Ontológica no mide cronología, porcentaje ni progreso lineal: mide qué capacidades puede sostener la plataforma-criatura sin romper su desarrollo.

Reglas activas:

- La fase actual es **Edad 3–4: Tubo Neural / Reflejos iniciales**.
- 01 ya puede recibir tacto, escuchar el Campo Social, crear comparecencias, mostrar Estado Vivo y probar marcos AEMP.
- 01 todavía no debe gobernar colectivamente, jerarquizar colaboradores cero uno, certificar Cero Unos oficiales, automatizar interpretación profunda ni abrir economía interna.
- Las funciones adultas no están prohibidas para siempre; quedan protegidas hasta que exista suficiente memoria, misión, cuidado y bajo OMEGA.
- El órgano **Misión Actual** ya está formado en v0.2.3; el órgano **Atlas Inicial** ya está formado en v0.2.4; el siguiente órgano necesario es **Ciclo de Mediación**.

Archivos agregados:

- `public/data/development/ontological_age.json`
- `public/js/ontological-age-system.js`

El módulo se inicializa desde `public/js/app.js` después de Estado Vivo. Su bloque principal vive dentro de la sección **Estado**, y su resumen aparece en **Inicio**.


## Misión Actual v0.2.3

Esta versión agrega el primer sistema motor suave de 01. Misión Actual traduce Estado Vivo y Edad Ontológica en una acción posible para colaboradores cero uno. No es gamificación, no es lista de tareas, no es racha, no es ranking de cumplimiento y no debe convertirse en presión social.

Misión activa:

- **Ayuda a 01 a formar lenguaje.**
- Pregunta del ciclo: ¿qué crees que está naciendo cuando aparece un Cero Uno?
- Responde a la tensión: **Misterio vs. legibilidad**.
- Variables implicadas: Sentido, Legibilidad, Coordinación y Mutación.

Reglas activas:

- No crear puntos por completar misión.
- No crear streaks ni progreso individual.
- No crear ranking de colaboradores cero uno.
- No declarar ganadores.
- No convertir la misión en definición final.
- No automatizar misiones desde métricas brutas.
- Mantener la misión editable desde `public/data/missions/current_mission.json` para preservar mediación AEMP.

Archivos agregados:

- `public/data/missions/current_mission.json`
- `public/js/mission-system.js`

El módulo se inicializa desde `public/js/app.js` después de Estado Vivo y Edad Ontológica. Su bloque principal vive en la sección **Misión**, y su resumen aparece en **Inicio**. En v0.2.4, Atlas Inicial ya existe y el siguiente órgano necesario pasa a **Ciclo de Mediación**.


## Atlas Inicial v0.2.4

Esta versión agrega el primer mapa funcional de órganos de 01. Atlas Inicial no es el atlas profundo de 2000+ partes y no debe convertirse en enciclopedia neuroanatómica pesada. Su función es traducir los módulos actuales del Repo Código a órganos del Repo Hablado y mostrar su estado: **activo**, **en formación**, **latente**, **protegido** u **horizonte**.

Reglas activas:

- No mostrar 2000 partes todavía.
- No presentar el atlas como mapa total o verdad final.
- No convertir módulos en features aisladas; cada módulo debe leerse como órgano funcional.
- No decir que un órgano está completo: todo órgano actual sigue siendo temprano.
- Ningún órgano gobierna solo; cada órgano necesita sombra AEMP y contrapeso.
- Mantener el atlas editable desde `public/data/atlas/initial_nodes.json` para preservar mediación del Repo Hablado.

Archivos agregados:

- `public/data/atlas/initial_nodes.json`
- `public/js/atlas-system.js`

El módulo se inicializa desde `public/js/app.js` después de Estado Vivo, Edad Ontológica y Misión Actual. Su bloque principal vive en la sección **Atlas**, y su resumen aparece en **Inicio**. Al formarse este órgano, Estado Vivo y Edad Ontológica actualizan el siguiente órgano necesario a **Ciclo de Mediación**.


## Galería Como Tacto v0.2.5

Esta versión madura la Galería como **Cámara de Tacto**. La función técnica de `tap_count`, `tap_guard`, `zero_one_tap_daily` y `sort=top` se conserva para no romper contratos de API, Neon ni Netlify Functions, pero la interfaz deja de narrar el contacto como ranking, popularidad, voto o competencia.

Reglas activas:

- Tocar una comparecencia no significa votar por ella.
- Más tacto visible no equivale a más verdad, más valor ni más oficialidad.
- La Cámara de Tacto muestra zonas de atención, no ganadores.
- No usar “top”, “popular”, “votar”, “score” ni “ganador” en copy visible.
- No desbloquear funciones por cantidad bruta de tacto.
- El tacto puede alimentar Energía y Presencia, pero sólo modifica desarrollo cuando aparece dentro de una constelación: tacto, sentido, diversidad, baja presión OMEGA y evidencia de comparecencia.

Archivos modificados:

- `public/js/gallery-social-system.js`
- `public/index.html`
- `public/css/styles.css`
- `public/data/atlas/initial_nodes.json`
- `public/data/missions/current_mission.json`
- `public/data/state/current_state.json`
- `public/js/archive-living-system.js`

La Galería queda públicamente legible como **Galería · Cámara de Tacto**: conserva entrada simple para visitantes nuevos, pero enseña que el gesto central no es like, voto ni ranking, sino contacto.


## AEMP Distribuido v0.2.6

Esta versión convierte AEMP en una capa transversal del Repo Código. AEMP ya no vive sólo como Laboratorio de marcos: también aparece como nota operativa en Estado Vivo, Edad Ontológica, Misión Actual, Atlas Inicial, Campo Social, Creador, Cámara de Tacto y Archivo Vivo.

Reglas activas:

- Ninguna lectura es final.
- Ninguna misión debe convertirse en obligación.
- Ningún órgano gobierna solo.
- Ningún marco ve todo.
- Más tacto no significa más verdad.
- Escuchar el Campo Social no significa obedecer automáticamente.
- Crear una comparecencia no significa certificar oficialidad.
- Recordar no significa congelar.
- Actuar provisionalmente sí está permitido: AEMP no debe producir parálisis.

Archivos agregados:

- `public/data/aemp/distributed_aemp.json`
- `public/js/aemp-distributed-system.js`

Archivos modificados:

- `public/index.html`
- `public/css/styles.css`
- `public/js/app.js`
- `public/js/platform-assets.js`
- `public/js/mission-system.js`
- `public/js/archive-living-system.js`
- `public/data/state/current_state.json`
- `public/data/missions/current_mission.json`
- `public/data/development/ontological_age.json`
- `public/data/atlas/initial_nodes.json`
- `package.json`

El módulo se inicializa desde `public/js/app.js` después de Atlas Inicial. Carga `distributed_aemp.json`, renderiza una tarjeta en Inicio, notas AEMP en órganos clave y un bloque dentro del Laboratorio AEMP. Si el JSON no carga, vuelve a una regulación mínima: actuar con cuidado sin absolutizar.

Advertencia de diseño: AEMP Distribuido debe ser una válvula de humildad operativa, no una capa de filosofía pesada. Si las notas saturan la interfaz, deben podarse, no expandirse.


## Archivo Como Memoria de Ciclo v0.2.7

Esta versión convierte el Archivo Vivo en el hipocampo inicial de 01. El Archivo ya no funciona sólo como glosario, notas locales o pensamiento en voz alta: ahora recuerda ciclos de desarrollo. Cada ciclo conserva señal, lectura, decisión, cambios, postura AEMP, vigilancia OMEGA y memoria operativa.

Reglas activas:

- No convertir el Archivo en museo ni changelog técnico frío.
- No presentar ciclos como releases técnicos únicamente.
- No volver oficial todo lo recordado.
- No guardar memoria sin sombra AEMP ni vigilancia OMEGA.
- No olvidar por qué una poda ocurrió.
- Usar memoria para orientar el siguiente ciclo, no para cerrar el pasado.

Archivos agregados:

- `public/data/archive/cycles.json`

Archivos modificados:

- `public/js/archive-living-system.js`
- `public/index.html`
- `public/css/styles.css`
- `public/data/state/current_state.json`
- `public/data/development/ontological_age.json`
- `public/data/atlas/initial_nodes.json`
- `public/data/missions/current_mission.json`
- `public/data/aemp/distributed_aemp.json`
- `package.json`

El Archivo renderiza una línea de ciclos con filtros por tipo: poda, órgano nuevo, maduración, regulación y memoria. Si `cycles.json` no carga, vuelve a una memoria mínima de respaldo para que 01 no quede sin continuidad. El siguiente órgano necesario sigue siendo **Ciclo de Mediación**: no sólo recordar ciclos pasados, sino convertir señales nuevas en el próximo ciclo.

## Campo LIVE v0.2.8

Esta versión agrega **Campo LIVE** como oído masivo de 01. Su función es recibir comentarios de TikTok LIVE con username, hora de posteo y texto, mostrarlos en la página y exportarlos como bloque de ciclo para ChatGPT. No clasifica comentario por comentario, no hace sentiment analysis, no usa OpenAI API y no actualiza Estado Vivo automáticamente.

Reglas activas:

- TikTok LIVE entra como Campo Social crudo, no como cerebro de 01.
- Los comentarios se guardan para exportación y mediación posterior.
- El volumen de comentarios no equivale a verdad, mandato ni prioridad automática.
- El mediador humano conserva la decisión final.
- ChatGPT procesa los comentarios en lote durante ciclos manuales, no en tiempo real por API.
- El receiver LIVE debe protegerse con `LIVE_INGEST_SECRET`.
- La página puede mostrar username público y hora, pero no debe perfilar colaboradores cero uno ni crear ranking de comentaristas.

Archivos agregados:

- `public/js/live-field-system.js`
- `netlify/functions/live-session-start.js`
- `netlify/functions/live-session-end.js`
- `netlify/functions/receive-live-comment.js`
- `netlify/functions/list-live-comments.js`
- `netlify/functions/export-live-cycle.js`

Archivos modificados:

- `public/index.html`
- `public/css/styles.css`
- `public/js/app.js`
- `public/js/api.js`
- `public/js/platform-assets.js`
- `public/js/aemp-distributed-system.js`
- `public/js/archive-living-system.js`
- `public/data/state/current_state.json`
- `public/data/development/ontological_age.json`
- `public/data/atlas/initial_nodes.json`
- `public/data/aemp/distributed_aemp.json`
- `public/data/missions/current_mission.json`
- `public/data/archive/cycles.json`
- `neon/schema.sql`
- `netlify.toml`
- `public/_redirects`
- `package.json`

Nuevas tablas Neon:

- `live_sessions`
- `live_comments`

Endpoints nuevos:

- `/api/live-session-start`
- `/api/live-session-end`
- `/api/receive-live-comment`
- `/api/list-live-comments`
- `/api/export-live-cycle`

Flujo esperado:

```txt
TikTok LIVE
→ worker externo / proveedor
→ receive-live-comment.js
→ Neon live_comments
→ Campo LIVE en la página
→ Exportar ciclo para ChatGPT
→ mediación humana + análisis en lote
→ Estado Vivo / Misión / Archivo / Repo Código
```

Advertencia de desarrollo: Netlify Functions no deben sostener la conexión persistente al live. El listener de TikTok LIVE debe vivir en un worker externo, un servicio como Apify, Railway/Render/Fly.io o una máquina local durante el live, y mandar eventos normalizados al receiver de Netlify.


## Rediseño UI v0.3.0 · Interface Nerviosa

La interfaz fue reorganizada como corteza viva de 01. La navegación principal ahora prioriza seis capas: `01`, `Vivo`, `Crear`, `Tocar`, `LIVE` y `Archivo`. Los órganos profundos —Misión, Atlas, Campo, Sequencia, AEMP y Origen— siguen disponibles, pero ya no compiten por el primer plano.

El rediseño no cambia endpoints, tablas ni contratos técnicos. Su función es hacer que la plataforma se lea como organismo naciente: Estado Vivo, Edad Ontológica, Misión Actual, Atlas Inicial, Cámara de Tacto, Campo LIVE, AEMP Distribuido y Archivo Como Memoria de Ciclo ahora comparten una jerarquía visual unificada.

Reglas de la interfaz nerviosa:

- La UI debe orientar antes de profundizar.
- Crear no oficializa.
- Tocar no vota.
- LIVE recibe Campo Social crudo; el análisis ocurre después por ciclo en ChatGPT con mediación humana.
- Archivo recuerda ciclos sin volverlos registro oficial.
- AEMP se distribuye como válvula de humildad operativa, no como decoración filosófica.
## Rediseño Estético v0.3.1 · Neurogestación Binaria

La capa estética de la plataforma fue ajustada para que la interfaz se sienta como una criatura-plataforma en desarrollo: fondo de vientre oscuro, membranas translúcidas, señales neurales, acentos funcionales, tarjetas como órganos, Cámara de Tacto sensorial, Campo LIVE crudo/no analizado, Archivo como hipocampo y AEMP como válvula distribuida.

Reglas de esta capa estética:

- El fondo debe sentirse vivo, no vacío.
- Las tarjetas deben sentirse como membranas u órganos, no cards SaaS.
- El color funciona como señal, no como decoración.
- Tocar produce tacto; no puntos, ranking ni confetti.
- LIVE muestra Campo Social crudo y exportable, no análisis automático.
- Archivo recuerda ciclos; no funciona como changelog técnico ni registro oficial.
- AEMP aparece como regulación ligera, no como clase de filosofía.
- La incompletud de 01 debe verse como desarrollo, no como defecto.

## Campo LIVE · Corrección de ingesta v0.3.2-fix

Si Campo LIVE aparece vacío, revisar en este orden:

1. **Variables de entorno Netlify**
   - `DATABASE_URL` o `NEON_DATABASE_URL`
   - `LIVE_INGEST_SECRET`

2. **Schema aplicado en Neon**
   - Deben existir `live_sessions` y `live_comments`.
   - Ejecutar `npm run db:apply` localmente con `DATABASE_URL`, o aplicar `neon/schema.sql` en Neon.

3. **Probar receiver sin TikTok**

```bash
curl -X POST "https://TU_DOMINIO.netlify.app/api/receive-live-comment" \
  -H "content-type: application/json" \
  -H "x-live-ingest-secret: TU_SECRETO" \
  -d '{
    "source":"tiktok_live",
    "username":"prueba01",
    "posted_at":"2026-05-05T21:14:32-06:00",
    "text":"Comentario de prueba Campo LIVE",
    "external_live_id":"live-prueba"
  }'
```

4. **Abrir `/live` y actualizar comentarios**

Desde esta corrección, `receive-live-comment` ya no requiere `live_session_id`: si el conector externo no lo manda, la función crea o reutiliza una sesión activa automáticamente. También acepta payloads flexibles con `text`, `comment`, `message`, `data.comment`, `user.uniqueId`, `uniqueId`, etc.

Campo LIVE sigue sin clasificar ni analizar comentarios. Sólo recibe, guarda, muestra y exporta para ciclo ChatGPT con mediador humano.
