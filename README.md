# Horizon — a simple place to keep track of what you're going to

A mobile-first PWA built from the product brief: concerts, festivals, sport,
gaming, trips and theatre — what you're going to, when, where, with who, and
what you need to sort out beforehand.

It's plain HTML/CSS/JS — no build step, no framework, no backend. All event
data is stored in the browser's `localStorage`, on-device only.

## Your data and redeploying

All events live in this browser's `localStorage`, tied to the exact URL
(origin) the app is served from. A code update to the **same URL** never
touches that data — but if you redeploy to a **different URL** (a fresh
Netlify Drop gives you a new random subdomain every time; on Cloudflare
Pages, every deployment gets its own unique `*.pages.dev` alias in
addition to your stable production URL), that's a different origin as
far as the browser is concerned, so it starts with empty storage. Always
open and install from your stable production URL, not a per-deployment
preview link.

**Specific to adding this to your iPhone home screen:** Apple documents
that a home-screen web app's storage is genuinely separate from Safari's
own tab storage for the same site — and separately, iOS can clear a
site's `localStorage` on its own under storage pressure or after a period
of disuse, regardless of what the app's code does. Neither of these is
something a website can fully opt out of. Two things mitigate it:

- The app now checks for and installs code updates automatically —
  every time you open it, or bring it back to the foreground — and
  reloads itself once a new version is ready (unless you're mid-way
  through adding or editing an event, in which case it waits until
  you're done). You should never need to remove and re-add the home
  screen icon just to pick up new code; doing that anyway risks landing
  you in a fresh storage container.
- The app asks the browser for **persistent storage** on load
  (`navigator.storage.persist()`), which lowers the odds of an automatic
  clear. It's a request, not a guarantee.

There's no in-app backup/export feature at the moment — the plan is to
rely on standard iCloud device backup once this ships as a native app
(see "Path to the App Store" below), rather than maintain a parallel
manual-backup flow in the web version.

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
going-with names with suggestions from people you've gone somewhere with
in roughly the last six months, ticket-purchased toggle, a single travel
note, a before-you-go checklist with type-based starter presets,
mark-as-completed, automatic archiving the day after an event ends
(re-checked on every navigation, so a past-dated event you just added
lands straight in Archive), delete with confirmation and a five-second
undo, share event / share preparation (native share sheet on iOS,
clipboard fallback elsewhere), and empty states.

A dedicated **Settings** page (the sliders icon on Home) holds: Home
view (Full/Compact), a light/dark theme switch, five accent colors,
new-event defaults (12h/24h time display, auto-archive on by default),
and a "clear all events" reset.

One known gap: the Time field on Add/Edit always accepts entry in 24-hour
format regardless of your 12h/24h display preference — that preference
only affects how times are *shown* elsewhere (cards, detail page,
sharing). Worth fixing if 12-hour entry turns out to matter in practice.

