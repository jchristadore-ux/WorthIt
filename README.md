# WorthIt? — Gig Shift Tracker

> Know if your delivery shift was actually worth your time.

**WorthIt?** tracks UberEats and DoorDash shifts and tells you—mathematically—whether the money earned justified the time spent, factoring in your real hourly opportunity cost, fuel, and IRS mileage deductions.

---

## Features

- 📸 **Screenshot auto-fill** — upload your end-of-shift earnings screen and AI reads it
- ⏱ **Time-value scoring** — every shift scored 0–100 against your $75/hr opportunity cost
- ⛽ **True cost breakdown** — gross, fuel cost, net take-home, IRS mileage deduction
- 📊 **Shift history** — running log with per-shift verdict badges
- 💡 **Insights tab** — aggregated performance and strategy tips
- 📱 **iPhone-optimized** — safe areas, 16px inputs (no zoom), tap targets, PWA-ready

---

## Tech Stack

- React 18 (Create React App)
- Anthropic Claude API (screenshot OCR → structured JSON)
- Pure CSS custom properties — no UI library
- Fonts: DM Serif Display + DM Sans (Google Fonts)

---

## Getting Started

```bash
git clone https://github.com/jchristadore-ux/WorthIt.git
cd WorthIt
npm install
npm start
```

The app calls `https://api.anthropic.com/v1/messages` directly from the browser for screenshot analysis. The API key must be injected by your deployment environment (see below).

---

## Deployment — GitHub Pages (live)

This repo deploys automatically. A GitHub Actions workflow builds the React app
on GitHub's servers and publishes the compiled output to GitHub Pages — you do
**not** need to run anything locally.

**Live URL:** https://jchristadore-ux.github.io/WorthIt/

### One-time setup

1. Get these files onto the `main` branch (merging the PR does this).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**
   (not "Deploy from a branch"). This is the step that stops Pages from
   showing the README.
4. Done. Every push to `main` rebuilds and redeploys automatically. Watch
   progress under the **Actions** tab.

> Why this is needed: the app is React/JSX source that browsers can't run
> directly. It must be compiled (`npm run build`) into static files first.
> Serving the repo root without that build is why GitHub Pages was falling
> back to rendering `README.md`.

---

## API Key Note

The screenshot auto-fill feature calls the Anthropic API directly from the
browser. The app reads an optional key you enter in the UI (tap **"Add
Anthropic API key"** on the Log tab) and stores it **only in your browser's
localStorage** — it is never committed to the repo or sent anywhere except
Anthropic.

Manual entry works fully without a key. For a hardened production setup, route
the request through a serverless proxy (e.g. Vercel `/api/analyze.js`) so the
key never touches the client.

---

## Scoring Formula

| Factor | Weight | Logic |
|--------|--------|-------|
| Effective $/hr vs $75 opportunity cost | 50% | Linear, capped at 100 |
| Tip rate % | 20% | High tips signal high-efficiency runs |
| Trips per hour | 15% | 3 trips/hr = full score |
| Net vs gross ratio | 15% | Fuel cost efficiency |

**Verdicts:** Worth It (80+) · Decent (60+) · Marginal (40+) · Not Worth It (<40)

---

## Customization

Edit constants at the top of `src/App.jsx`:

```js
const HOURLY_RATE   = 75;   // your full-time hourly rate
const IRS_MILEAGE   = 0.67; // 2024 IRS standard mileage rate
const FUEL_PER_MILE = 0.12; // your estimated out-of-pocket fuel cost/mile
```

---

*Built for personal use. Not financial advice.*
