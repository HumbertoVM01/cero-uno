# Contrato del Worker TikTok LIVE · Cero Uno v0.3.2-fix

Campo LIVE no escucha TikTok directamente desde Netlify. Netlify recibe eventos normalizados desde un worker externo, Apify, un proceso local o cualquier conector que pueda hacer `POST` HTTP.

## Endpoint receptor

`POST /api/receive-live-comment`

Headers:

```txt
content-type: application/json
x-live-ingest-secret: <LIVE_INGEST_SECRET>
```

## Payload mínimo recomendado

Desde esta corrección, `live_session_id` ya no es obligatorio. Si el conector no lo manda, el receiver crea o reutiliza una sesión LIVE activa automáticamente.

```json
{
  "source": "tiktok_live",
  "event_type": "comment",
  "username": "nombre_publico",
  "posted_at": "2026-05-05T21:14:32-06:00",
  "text": "No entiendo qué es 01 pero me gusta",
  "external_live_id": "opcional-id-del-live",
  "raw_event_id": "id-del-proveedor-si-existe",
  "raw_event": {
    "provider": "apify_or_worker"
  }
}
```

## Payloads flexibles aceptados

El receiver intenta leer texto desde cualquiera de estos campos:

```txt
text
comment
raw_text
message
msg
data.text
data.comment
data.message
event.comment
event.message
```

Y username desde:

```txt
username
author_handle
author
uniqueId
nickname
data.uniqueId
data.nickname
user.uniqueId
user.nickname
```

Timestamp puede venir como ISO, milisegundos o segundos Unix:

```txt
posted_at
postedAt
timestamp
createTime
create_time
```

## Flujo de sesión opcional

Si quieres controlar sesiones manualmente:

1. Crear sesión:

`POST /api/live-session-start`

```json
{
  "platform": "tiktok",
  "title": "TikTok LIVE · Cero Uno · noche",
  "external_live_id": "opcional"
}
```

2. Guardar `live_session.id`.
3. Mandar cada comentario a `receive-live-comment` con `live_session_id`.
4. Cerrar sesión al terminar:

`POST /api/live-session-end`

```json
{
  "live_session_id": "uuid"
}
```

## Flujo automático recomendado para prueba rápida

El worker sólo manda comentarios a `receive-live-comment` con el header secreto. El receiver crea la sesión si no existe:

```bash
curl -X POST "https://TU_DOMINIO.netlify.app/api/receive-live-comment" \
  -H "content-type: application/json" \
  -H "x-live-ingest-secret: $LIVE_INGEST_SECRET" \
  -d '{
    "source":"tiktok_live",
    "username":"usuario01",
    "posted_at":"2026-05-05T21:14:32-06:00",
    "text":"No entiendo qué es 01 pero me gusta",
    "external_live_id":"live-prueba-01"
  }'
```

Luego abre `/live` en la plataforma y pulsa **Actualizar comentarios**.

## Regla conceptual

El worker no debe analizar comentarios. Sólo debe escuchar, normalizar y enviar. La lectura se hace después, por ciclo, en ChatGPT, con mediador humano.
