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
git clone https://github.com/YOUR_USERNAME/worthit.git
cd worthit
npm install
npm start
```

The app calls `https://api.anthropic.com/v1/messages` directly from the browser for screenshot analysis. The API key must be injected by your deployment environment (see below).

---

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

Set env var `REACT_APP_ANTHROPIC_KEY` in Vercel dashboard → the fetch call will need updating to pass it as a header (see note below).

### GitHub Pages

```bash
npm run build
# push /build to gh-pages branch or use gh-pages package
```

---

## API Key Note

The screenshot analysis calls the Anthropic API. In production, **never expose your API key client-side**. Route the request through a serverless function:

- Vercel: add `/api/analyze.js` that proxies the request server-side
- Netlify: add `/netlify/functions/analyze.js`

For personal/private use on your own phone, the current client-side call works fine.

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
