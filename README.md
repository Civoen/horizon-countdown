# Horizon — a simple place to keep track of what you're going to

A mobile-first PWA built from the product brief: concerts, festivals, sport,
gaming, trips and theatre — what you're going to, when, where, with who, and
what you need to sort out beforehand.

It's plain HTML/CSS/JS — no build step, no framework, no backend. All event
data is stored in the browser's `localStorage`, on-device only.

## Files

```
index.html      the app shell
styles.css      design system (ticket-stub visual language)
app.js          all state, routing and rendering logic
manifest.json   PWA manifest (name, icons, colors, standalone display)
sw.js           service worker — caches the app shell for offline use
icons/          app icons (192, 512, apple-touch-icon)
```

## Deploying it so you can add it to your iPhone

Because it's static files, any static host works. Two easy options:

**Netlify Drop** — go to https://app.netlify.com/drop and drag the whole
`going` folder in. You'll get a live HTTPS URL immediately (required for a
PWA — Safari won't install non-HTTPS sites to the home screen, `localhost`
during testing is the one exception).

**GitHub Pages** — push the folder to a repo, then enable Pages on the
`main` branch in the repo's Settings → Pages. Your URL will be
`https://yourname.github.io/reponame/`.

Once it's live:

1. Open the URL in **Safari** on your iPhone (must be Safari, not Chrome —
   only Safari can add PWAs to the iOS home screen).
2. Tap the **Share** icon → **Add to Home Screen**.
3. It'll launch full-screen with its own icon, no browser chrome.

## A note on notifications

The brief asks for 7-day / 1-day / event-day reminders. iOS PWAs can't
reliably schedule local notifications in the background without a server
sending push messages (Apple requires real Web Push with a backend for
anything beyond the app being open) — so V1 stores your reminder
preferences but doesn't fire background pushes yet. Wrapping the app
natively (below) is the more reliable path to real push notifications.

## Path to the App Store

This is a good candidate for **Capacitor** (by the Ionic team) — it wraps
an existing web app in a real native shell with no rewrite:

```
npm install @capacitor/core @capacitor/cli
npx cap init "Horizon" "com.yourname.horizon"
npx cap add ios
npx cap copy
npx cap open ios
```

That opens the project in Xcode, where you can add real APNs push
notifications, submit to TestFlight, and eventually the App Store — reusing
all of this HTML/CSS/JS as-is. `PWABuilder` (pwabuilder.com) is a
lighter-weight alternative if you just want a store-ready wrapper without
touching Xcode much.

## What's implemented (V1)

Home, Archive, Add/Edit event, event detail, multi-day events, live
countdown states (DAYS / TOMORROW / TODAY / TONIGHT / HAPPENING NOW),
going-with names, ticket-purchased toggle, travel (there & back) notes,
things-to-bring and before-you-go checklists with type-based starter
presets, mark-as-completed, automatic archiving the day after an event
ends, delete with confirmation, share event / share preparation (native
share sheet on iOS, clipboard fallback elsewhere), and empty states.
