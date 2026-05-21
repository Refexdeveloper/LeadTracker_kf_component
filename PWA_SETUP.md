# PWA setup (optional)

The app is already mobile-responsive and PWA-ready. For **installability** (Add to Home Screen / Install app), add these icon files to `public/`:

- **icon-192.png** — 192×192 px (toolbar, splash)
- **icon-512.png** — 512×512 px (splash, install prompt)

Place them in the `public` folder so they are served at `/icon-192.png` and `/icon-512.png`. The manifest and `index.html` already reference them.

If these files are missing, the app still works in the browser; some environments may use a default icon or show a generic one when installing.
