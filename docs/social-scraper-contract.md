# Contrato del Scraper de Comentarios TikTok · Cero Uno v0.3.2

El scraper no interpreta.  
El scraper no clasifica.  
El scraper no decide.  
Sólo compila comentarios públicos de posts y los entrega como Campo Social crudo.

## Fuente

TikTok posts de `@0100011011...0100011011`.

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
