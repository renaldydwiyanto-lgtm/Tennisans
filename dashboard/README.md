# Tennisans Owner Dashboard (React + Tailwind)

Modern responsive dashboard for the Tennisans booking system. Connects to the same System GAS API as the legacy `index.html` dashboard.

## Run locally

```bash
cd dashboard
npm install
npm run dev
```

Open http://localhost:5173

## Build for production (Netlify / Vercel)

```bash
npm run build
```

Output is in `dist/`. Configure your host:

- **Netlify**: Set **Publish directory** to `dashboard/dist`, **Build command** to `cd dashboard && npm install && npm run build`.
- **Vercel**: Set **Root directory** to `dashboard`, **Build command** to `npm run build`, **Output directory** to `dist`.

## First use

1. Open **Settings**.
2. Enter **API URL (System SS)** — the Web App URL of your deployed SystemCode GAS.
3. Enter **Bridge URL** (optional, for reference).
4. Enter payment info and save.
5. Click **Test Koneksi API** to verify.
6. Default PIN: **2026** (change in Settings).

## Features

- Overview: KPIs, revenue bar, pending bookings
- Bookings: filter (All/Pending/Confirmed/Rejected), confirm/reject, WhatsApp link, **Export CSV**
- Schedule: view by month, sessions summary
- Finance: P&L statement, margin per class
- Customers: search, WhatsApp link
- Settings: API URLs, payment info, PIN, cost config, test connection
