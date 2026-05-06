# Contrato del Worker TikTok LIVE · Cero Uno v0.2.8

Campo LIVE no escucha TikTok directamente desde Netlify. Netlify recibe eventos normalizados desde un worker externo.

## Endpoint receptor

`POST /api/receive-live-comment`

Headers:

```txt
content-type: application/json
x-live-ingest-secret: <LIVE_INGEST_SECRET>
```

Payload mínimo:

```json
{
  "live_session_id": "uuid-de-live_sessions",
  "source": "tiktok_live",
  "event_type": "comment",
  "username": "nombre_publico",
  "posted_at": "2026-05-05T21:14:32-06:00",
  "text": "No entiendo qué es 01 pero me gusta",
  "raw_event_id": "id-del-proveedor-si-existe",
  "raw_event": {
    "provider": "apify_or_worker"
  }
}
```

## Flujo de sesión

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
3. Mandar cada comentario a `receive-live-comment`.
4. Cerrar sesión al terminar:

`POST /api/live-session-end`

```json
{
  "live_session_id": "uuid"
}
```

## Regla conceptual

El worker no debe analizar comentarios. Sólo debe escuchar, normalizar y enviar. La lectura se hace después, por ciclo, en ChatGPT, con mediador humano.
