<div align="center">

# 📈 Signalist — Next.js App Router

Browse stocks, view rich TradingView widgets, manage a personal watchlist, and read company/general market news — all powered by Server Actions, Better Auth, MongoDB, and the Finnhub API.

<br />

<!-- Live Preview Button -->
<a href="https://signalist-rho.vercel.app/" target="_blank">
  <img alt="Live Preview" src="https://img.shields.io/badge/Live%20Preview-Visit%20App-0ea5e9?style=for-the-badge&logo=vercel&logoColor=white" />
</a>

<p align="center">
  <a href="#-features">Features</a> ·
  <a href="#-tech-stack">Tech Stack</a> ·
  <a href="#-architecture-overview">Architecture</a> ·
  <a href="#-project-structure">Structure</a> ·
  <a href="#-environment-variables">Env</a> ·
  <a href="#-local-development">Local Dev</a> ·
  <a href="#-deployment">Deployment</a> ·
  <a href="#-how-it-works">How it works</a> ·
  <a href="#-troubleshooting">Troubleshooting</a>

</p>

</div>


## ✨ Features

- Server-rendered stock pages with TradingView widgets (symbol info, charts, technicals, profile, financials)
- Personal watchlist with optimistic add/remove from multiple entry points
- Company and general market news with smart de-duplication and round‑robin mixing
- Robust Finnhub integration with cache windows: quotes (15s), profiles (1h), metrics (24h), news (~5m)
- Next.js Server Actions, revalidation and incremental caching

## 🧰 Tech Stack

- Framework: Next.js 16 (App Router, Server/Client Components)
- UI: React 19, Tailwind CSS, Radix UI, Lucide icons
- Auth: Better Auth
- Data: MongoDB with Mongoose
- Market data: Finnhub API
- Widgets: TradingView embedded widgets

## 🏗️ Architecture overview

- Server Components fetch and render data on the server by default.
- Client Components handle interactivity (e.g., SearchCommand, WatchlistButton).
- Server Actions ("use server") are used for trusted operations: DB CRUD, Finnhub requests.
- Caching via Next.js revalidate windows for different data types.

### Key modules

- app/(root)/stocks/[symbol]/page.tsx — Stock details page with multiple widgets and a server-computed watchlist state.
- app/(root)/watchlist/page.tsx — Watchlist table and news; inline server action form for removals.
- components/SearchCommand.tsx — Search dialog with debounced queries and optimistic watchlist toggling.
- components/WatchlistButton.tsx — Client button that optimistically adds/removes a symbol.
- lib/actions/finnhub.actions.ts — Finnhub calls, formatting helpers, news fetching, and search.
- lib/actions/watchlist.actions.ts — Watchlist CRUD and user-session helpers via Better Auth.

## 📁 Project structure (selected)
```
signalist/
├─ app/ … App Router pages and layouts
├─ components/ … UI components (client and server)
├─ database/ … Mongoose connection and models
├─ hooks/ … Custom React hooks
├─ lib/ … Server actions, constants, utilities
├─ public/ … Static assets
├─ scripts/ … Utility scripts (e.g., test-db)
└─ README.md
```

## 🔐 Environment variables

Create a .env.local file at the project root and set the following:

- FINNHUB_API_KEY — Server-side API key for Finnhub (recommended)
- or NEXT_PUBLIC_FINNHUB_API_KEY — Client-exposed Finnhub key (use only if acceptable)
- MONGODB_URI — MongoDB connection string
- BETTER_AUTH_SECRET and other Better Auth settings — See Better Auth docs and your auth setup in lib/better-auth/

Notes

- At least one Finnhub key must be set. Without it, search will gracefully return an empty list and some pages may throw when news/quotes are required.
- Keep server-only secrets in FINNHUB_API_KEY instead of NEXT_PUBLIC_FINNHUB_API_KEY whenever possible.

## 🧑‍💻 Local development
```
1) Install dependencies

   npm install

2) Configure environment

   Create .env.local with the variables listed above.

3) Run the dev server

   npm run dev

Open http://localhost:3000 in your browser.
```

## 📦 Available scripts

- npm run dev — Start the Next.js dev server
- npm run build — Build for production
- npm run start — Start the production server (after build)
- npm run lint — Run ESLint
- npm run test:db — Simple DB connectivity check (see scripts/test-db.mjs)

## 🚀 Deployment

Vercel is recommended for deployment:

1) Push your repo to GitHub/GitLab/Bitbucket.
2) Import the project in Vercel and set Environment Variables for Production/Preview/Development.
3) Deploy. After build, your app will be available at the assigned domain.

Make sure to set FINNHUB_API_KEY, MONGODB_URI, and all Better Auth variables in Vercel.

## 🔎 How it works

- User actions in client components call Server Actions for secure operations.
- Watchlist mutations upsert/delete records in MongoDB and return structured results.
- Server pages prefetch live data from Finnhub with appropriate cache windows.
- After a successful mutation in server components, revalidatePath is used to refresh cached content.

## 🧯 Troubleshooting

- Missing FINNHUB key: Finnhub-dependent features may fail. Set FINNHUB_API_KEY or NEXT_PUBLIC_FINNHUB_API_KEY.
- MongoDB connection errors: Verify MONGODB_URI and that your IP/network can reach the cluster.
- Auth/session issues: Ensure Better Auth env vars are set and the app domain/URLs match your auth provider configuration.
- TradingView widgets not loading: Check browser console for CSP or network errors and ensure the embed scripts are reachable.

## ❤️ Acknowledgments

- Based on the Signalist concept by [JavaScript Mastery](https://github.com/adrianhajdin/signalist_stock-tracker-app)
- Components by [shadcn/ui](https://ui.shadcn.com)

## ⚖️ License

This project is provided as-is; add a license file if you intend to distribute publicly.

---

### 🏷️ Tech Stack Badges

<!-- Badges are purely visual and link to the respective technology sites -->

[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232a?logo=react&logoColor=61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-0ea5e9?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Radix UI](https://img.shields.io/badge/Radix%20UI-111111?logo=radix-ui&logoColor=white)](https://www.radix-ui.com/)
[![Lucide](https://img.shields.io/badge/Lucide-0f172a?logo=lucide&logoColor=white)](https://lucide.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-13aa52?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-880000?logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![Finnhub](https://img.shields.io/badge/Finnhub-0f766e?logo=data:image/svg+xml;base64,PHN2Zy8%2B)](https://finnhub.io/)
[![TradingView](https://img.shields.io/badge/TradingView-2962ff?logo=tradingview&logoColor=white)](https://www.tradingview.com/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-111111?labelColor=111111&color=3b82f6)](https://better-auth.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
