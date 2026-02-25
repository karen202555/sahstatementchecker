

## Plan: Make Statement Checker an Installable PWA

### What This Does
Turns the app into a Progressive Web App (PWA) so users can install it to their home screen from their browser. It will work offline, load fast, and feel like a native app — no app store required.

### Changes

**1. Install `vite-plugin-pwa` dependency**

**2. Update `vite.config.ts`**
- Add `VitePWA` plugin with:
  - App name: "Statement Checker"
  - Short name: "StatCheck"
  - Theme color matching the app's primary blue
  - `navigateFallbackDenylist: [/^\/~oauth/]` to avoid caching OAuth routes
  - Auto-register service worker
  - Icon definitions (192x192 and 512x512)

**3. Create PWA icons**
- `public/pwa-192x192.png` — generated from the app's existing FileSpreadsheet icon concept (a simple branded icon)
- `public/pwa-512x512.png` — same at larger size

**4. Update `index.html`**
- Add `<meta name="theme-color">` tag
- Add `<meta name="apple-mobile-web-app-capable">` and `<meta name="apple-mobile-web-app-status-bar-style">` for iOS
- Add `<link rel="apple-touch-icon">` pointing to the 192px icon

**5. Create `/install` page** (`src/pages/Install.tsx`)
- A simple page that detects the `beforeinstallprompt` event
- Shows an "Install App" button when available
- On iOS, shows instructions ("Tap Share → Add to Home Screen")
- Falls back to a message if the app is already installed

**6. Add route in `App.tsx`**
- Add `/install` as a public route

### Technical Details

- The service worker uses `generateSW` (Workbox) strategy for automatic caching
- Runtime caching for API calls uses `NetworkFirst` strategy so data stays fresh
- Static assets use `CacheFirst` for speed
- The manifest includes `display: "standalone"` so the app runs without browser chrome

### No Changes To
- Statement parsing, transaction logic, database, or any existing components

