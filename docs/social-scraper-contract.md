# Contrato del Scraper de Comentarios TikTok · Cero Uno v0.3.3

El scraper no interpreta.  
El scraper no clasifica.  
El scraper no decide.  
Sólo compila comentarios públicos de posts y los entrega como Campo Social crudo.

## Fuente

TikTok posts de `@0100011011...0100011011` y `@allivealliveallive`, sincronizados por username vía Apify API.

## Flujo principal

```txt
Actualizar Campo Social
→ /api/sync-tiktok-comments
→ Apify API
→ normalización Cero Uno
→ Neon social_posts + social_comments
→ exportación de ciclo para ChatGPT
```

La importación JSON/CSV/texto existe sólo como respaldo manual.

## Payload aceptado

Campos recomendados:

```json
{
  "post_url": "https://...",
  "post_id": "opcional",
  "post_caption": "opcional",
  "comment_id": "opcional pero recomendado",
  "username": "usuario público",
  "comment_text": "texto del comentario",
  "comment_time": "fecha/hora del comentario",
  "likes": 0,
  "reply_to": "opcional",
  "scraped_at": "fecha/hora de extracción"
}
```

Campos mínimos:

```json
{
  "post_url": "https://...",
  "username": "usuario público",
  "comment_text": "texto del comentario",
  "comment_time": "fecha/hora del comentario"
}
```

## Deduplicación

- Si existe `comment_id`, deduplicar por `comment_id`.
- Si no existe, deduplicar por `post_url + username + comment_text + comment_time`.

## Regla doctrinal

Los comentarios informan ciclos, pero no gobiernan 01.  
El Campo Social no es voto, ranking, tribunal ni mandato.  
El mediador conserva la decisión final.
