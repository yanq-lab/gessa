---
name: gessa
description: "Use when artists need to upload, restore, or manage artwork images. Triggers: artwork upload, image restoration, gallery management, artwork publishing, transforming photos to digital scans, artist portfolio creation, AI artwork enhancement. Works with the Gessa platform at https://gessa.art."
metadata:
  author: gessa
  version: "1.0.0"
---

# Gessa Platform Agent Skill

## Authentication

All API requests require an API key. Users generate keys in their Gessa Dashboard under the **API Keys** tab.

Authorization: `Bearer gk_live_...`

## Available Operations

### Transform Artwork Image

Convert a casual photo of a physical artwork into a gallery-quality digital scan using AI.

```
POST https://khqngwvvcoosqgtpmdan.supabase.co/functions/v1/agent-api/transform
Authorization: Bearer gk_live_...
Content-Type: application/json

{
  "image_url": "https://example.com/photo.jpg"
}
```

Response:
```json
{
  "ok": true,
  "transformed_url": "https://...",
  "model": "gpt-image-2",
  "mode": "faithful"
}
```

### List Artworks

```
GET https://khqngwvvcoosqgtpmdan.supabase.co/functions/v1/agent-api/artworks
Authorization: Bearer gk_live_...
```

### Check Quota

```
GET https://khqngwvvcoosqgtpmdan.supabase.co/functions/v1/agent-api/quota
Authorization: Bearer gk_live_...
```

Response:
```json
{
  "tier": "artist",
  "monthly_limit": 30,
  "used_this_month": 5,
  "bonus_credits": 10,
  "remaining": 35
}
```

## API Key Scopes

- `artworks:read` - View artwork collection
- `artworks:write` - Create and update artworks
- `images:transform` - Run AI restoration

## Rate Limits

| Tier | Requests/min | Transformations/month |
|---|---|---|
| Artist | 60 | 30 |
| Studio | 300 | 120 |
| Gallery | 500 | 500 |

## Error Handling

403: `"No active subscription. Subscribe at https://gessa.art"`
402: `"API access requires Studio or Gallery tier"`
429: `"Transformation quota exceeded. Upgrade your plan."`
401: `"Invalid or inactive API key"`
