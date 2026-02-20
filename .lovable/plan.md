

# Make Bountt Feel Like a Native App (PWA Setup)

## Overview

Set up Bountt as a Progressive Web App so it launches fullscreen (no browser chrome) when installed to a user's home screen on iOS or Android.

## What Exists Today

- No `manifest.json`
- No service worker
- No Apple-specific meta tags
- No theme-color meta tags
- Title still says "Lovable App"

## What Changes

### 1. Create `public/manifest.json`

A web app manifest that tells browsers Bountt is installable:

- `display: "standalone"` -- removes browser UI when launched from home screen
- `name: "Bountt"`, `short_name: "Bountt"`
- `start_url: "/"`
- `theme_color: "#E35205"` (Bountt orange)
- `background_color: "#EBEBEB"` (matches `--background`)
- Icon entries (we'll use the existing favicon initially; ideally you'd add 192x192 and 512x512 PNG icons later for best results)

### 2. Update `index.html`

Add the following meta tags and links:

- `<link rel="manifest" href="/manifest.json">`
- `<meta name="theme-color" content="#E35205">` -- colors the status bar on Android
- `<meta name="apple-mobile-web-app-capable" content="yes">` -- enables standalone mode on iOS Safari
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` -- blends status bar on iOS
- `<meta name="apple-mobile-web-app-title" content="Bountt">`
- `<link rel="apple-touch-icon" href="/favicon.ico">` -- home screen icon on iOS
- Update `<title>` and OG tags from "Lovable App" to "Bountt"
- Update description to "Shared expenses made simple."

### 3. Install and Configure `vite-plugin-pwa`

- Install `vite-plugin-pwa` dependency
- Add to `vite.config.ts` with:
  - `registerType: 'autoUpdate'` -- service worker auto-updates in background
  - `navigateFallbackDenylist: [/^\/~oauth/]` -- ensures OAuth redirects always hit the network
  - Workbox config for basic runtime caching
  - Inline manifest config (mirrors `public/manifest.json`)

This generates a service worker automatically at build time, enabling:
- Offline fallback (cached app shell)
- Install prompt on supported browsers

### 4. No Other Changes

- No changes to routing, components, or backend
- No changes to `index.css` or `AppContext`

## Files Changed

| File | Action |
|------|--------|
| `public/manifest.json` | Create |
| `index.html` | Update meta tags, title, manifest link |
| `vite.config.ts` | Add vite-plugin-pwa plugin |
| `package.json` | Add vite-plugin-pwa dependency (auto) |

## Tradeoffs and Limitations

- **iOS limitations**: iOS Safari doesn't support push notifications from PWAs, and the install experience is manual (Share > Add to Home Screen). There's no automatic install banner like on Android.
- **Icons**: The current `favicon.ico` will work as a placeholder, but for the best home screen appearance you should later add proper 192x192 and 512x512 PNG icons.
- **Offline support**: The service worker will cache the app shell so it loads offline, but data operations still require network connectivity (Lovable Cloud calls).
- **No app store listing**: PWAs don't appear in the App Store or Play Store (though Android does support TWA wrapping if you want that later).

