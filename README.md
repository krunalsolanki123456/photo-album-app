# ClickFlip – Page-by-Page Photo Album Editor

This version changes the album workflow so uploading photos **does not jump directly to preview**.

## New editor flow

1. Login / register and choose a page plan.
2. Open or create an album.
3. Upload any batch of photos. Uploaded photos stay in the bottom **Photo Library**.
4. On Page 1, choose a collage layout (1, 2, 3, 4 or 5 photos).
5. Drag photos from the bottom tray into page slots. On mobile, tap a photo and then tap a slot.
6. Add page text, choose font, size, alignment and text position.
7. Upload music or select a previously uploaded track for that page.
8. Click **Complete Page & Add Next** to open a blank next page and repeat.
9. Preview the album at any time.
10. Publish to generate/copy a demo share link.

## Plans

- Free: 5 pages
- ₹100: 10 pages
- ₹200: 20 pages
- ₹500: Unlimited pages

Page quota is based on created album pages, not the number of photos uploaded.

## Responsive behavior

- Desktop: drag-and-drop page editor with left layout tools, center canvas, right text/music tools, bottom photo tray.
- Mobile/tablet: single-column responsive editor. Tap a photo then tap a page slot as a touch-friendly fallback.
- Preview: click the left/right side of the page, use arrow keys, or swipe on mobile.

## Important demo limitations

Authentication, paid-plan activation, albums and published links use browser storage/IndexedDB in this prototype. The generated share link can reopen a published album in the same browser/origin, but **true public sharing across other devices/users requires a backend + cloud storage** (for example Supabase/Firebase/S3) and deployment. Paid plans also require a real payment gateway such as Razorpay before production use.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

- Per-photo crop controls: zoom in/out, drag to reposition, reset framing; saved into preview/share

## Storytelling Scrapbook pages
Each page can switch between Classic and Scrapbook mode. Scrapbook pages support themed paper styles, Polaroid/tape/torn/soft photo frames, story title, date, location, memory note, stickers, existing text tools, per-page music, and the same zoom/reposition crop controls. The scrapbook appearance is retained in Preview and published/share views.

## Latest editor controls
- After placing a photo in a collage slot, drag the photo itself with mouse or touch to move it up/down/left/right inside the frame.
- Use the zoom controls to fit the subject; pan + zoom values are saved and shown exactly the same in Preview.
- Page text is no longer fixed to top/bottom. Text can be dragged anywhere on the album page, including over a photo, on desktop or mobile touch.
- Use **Reset position** in Text & Style to return text to its default location.

## Scrapbook free-canvas editing
In Scrapbook mode only, photo frames can be moved and resized independently using percentage-based x/y/width/height values. Text is freely draggable in Scrapbook mode, while Classic mode keeps text in a fixed caption area. The editor also includes a 50%-150% page-view zoom control for Scrapbook pages; this zoom is an editor view aid and does not change the published layout.

## Public landing page
This version includes a responsive public ClickFlip home page inspired by the approved landing-page concept. Home navigation connects to Login/Register, pricing cards preselect the chosen registration plan, and logout returns to the public home page.
