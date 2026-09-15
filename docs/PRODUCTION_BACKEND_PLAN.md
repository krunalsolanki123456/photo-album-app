# Flipora Production Backend Plan

This file describes the next implementation phase without locking secrets into the frontend.

## Data model

### users
- id
- name
- email
- email_verified_at
- status
- created_at

### plans
- id
- name
- price_inr
- validity_days
- album_limit
- photo_limit
- storage_bytes
- watermark_enabled
- active

### subscriptions
- id
- user_id
- plan_id
- starts_at
- expires_at
- status
- grace_until
- payment_id

### albums
- id
- user_id
- title
- subtitle
- event_type
- template_id
- cover_asset_id
- status: draft/completed/purchased/archived
- share_slug
- share_enabled
- created_at
- updated_at

### album_pages
- id
- album_id
- sort_order
- layout_id
- story_mode
- page_json (text positions, scrapbook frame positions, stickers, music reference)

### media_assets
- id
- user_id
- album_id
- type: image/audio
- original_path
- preview_path
- thumbnail_path
- mime_type
- size_bytes
- width
- height
- checksum
- created_at

### payments
- id
- user_id
- plan_id
- provider
- provider_order_id
- provider_payment_id
- amount
- status
- receipt_number
- created_at

## Storage structure

private/users/{user_id}/albums/{album_id}/originals/
private/users/{user_id}/albums/{album_id}/previews/
private/users/{user_id}/albums/{album_id}/thumbs/
private/users/{user_id}/albums/{album_id}/audio/
exports/users/{user_id}/albums/{album_id}/

## Required API actions

- register/login/logout/forgot-password/email-verification
- create/update/delete album
- create/update/reorder/delete page
- signed upload URL
- finalize upload + create thumbnails/previews
- publish/unpublish album
- public share resolver by share_slug
- create Razorpay order
- verify Razorpay payment signature server-side
- payment history/invoice lookup
- account/album permanent deletion

## Security rules

- Every private album/media query must be scoped to authenticated user_id.
- Public share endpoint only returns published album data when share_enabled=true.
- Original media remains private; public viewing should use controlled derivative URLs.
- Never put Razorpay secret or storage admin keys in the browser.
- Validate file type, maximum size and image decode server-side.
