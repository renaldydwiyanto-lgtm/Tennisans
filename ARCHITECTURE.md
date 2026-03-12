# Tennisans v6 — Full System Architecture

## Overview

Fully synchronized booking system connecting **Google Spreadsheet Booking**, **WhatsApp Admin**, and a **Web-Based Owner Dashboard** (Netlify/Vercel). Real-time slot sync, automated financial analytics, and AI-powered business insights.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER FLOW                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Spreadsheet Booking (view schedule) → Click "BOOKING" (col J)                    │
│       → Booking Form (auto-filled) → Submit                                        │
│       → BOOKING_LOG (Bridge) + System API (BOOKINGS) + Optional WhatsApp notify   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           OWNER FLOW                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Dashboard (Netlify/Vercel) ←→ System GAS API ←→ System Spreadsheet             │
│       ↑                                    ↓                                     │
│       └────────────── Bridge GAS ←→ Booking Spreadsheet (read/write slots)       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
Tennisans_v6.0_COMPLETE_1/
├── ARCHITECTURE.md           # This file
├── DEPLOYMENT_GUIDE.md       # Step-by-step deploy
├── docs/
│   ├── API_ENDPOINTS.md      # GAS & serverless API reference
│   └── DATABASE_SCHEMA.md    # Sheets as database schema
├── SystemCode_v5.gs          # Deploy on SYSTEM Spreadsheet (Apps Script)
├── SpreadsheetBridge_v4.gs   # Deploy on BOOKING Spreadsheet (Apps Script)
├── netlify.toml              # Netlify config (publish + redirects)
├── netlify/
│   └── functions/
│       └── notify-whatsapp.js # Optional: WhatsApp Cloud API notify admin
├── dashboard/                # React + Tailwind Owner Dashboard (optional)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── index.html                # Legacy vanilla JS dashboard (production)
├── sw.js                     # Service worker
├── manifest.json
└── tennisans/                # Copy for tennisans subfolder deploy
```

---

## Data Flow

### 1. Customer books a class

1. Customer opens **Booking Spreadsheet** → sees real-time schedule (date, time, class, location, remaining slot, price).
2. Clicks **"💬 BOOKING"** link in column J → opens Bridge Web App URL with query params: `kelas`, `tanggal`, `waktu`, `harga`, `maxPax`, `sisa`, `lokasi`, `row`, `sheet`.
3. Form collects: name, phone, number of participants, Instagram (optional). Class details are pre-filled.
4. On submit (POST to Bridge):
   - Bridge appends row to **BOOKING_LOG** (Booking SS).
   - Bridge calls **System API** `syncBooking` → row appended to **BOOKINGS** (System SS), **CUSTOMERS** upserted.
   - Optional: Bridge (or System) calls **Netlify function** `notify-whatsapp` → WhatsApp Cloud API sends template message to admin.
5. Customer sees success screen with **"Chat Admin"** WhatsApp link (pre-filled message).

### 2. Owner confirms payment

1. Owner opens **Dashboard** → tab Bookings → sees PENDING list.
2. Clicks **"✅ Konfirmasi"** → Dashboard POSTs `confirmBooking` to System API.
3. System API:
   - Updates **BOOKINGS** row: STATUS=CONFIRMED, CONFIRMED_BY, CONFIRMED_AT, PAYMENT_STATUS=LUNAS.
   - Updates **Booking Spreadsheet** slot: calls Bridge `updateStatus` with `status=CONFIRMED`, `row_jadwal`, `sheet_jadwal`, `jumlah_pax`. Bridge increments TERISI, decrements SISA, sets STATUS=Penuh if SISA=0.

### 3. Slot & schedule sync

- **Read**: Dashboard calls System API `getSchedule?month=MARET 2026` → System reads Booking SS sheet "MARET 2026" → returns schedule with terisi/sisa.
- **Write**: Dashboard calls System API `updateScheduleRow` / `addScheduleRow` / `deleteScheduleRow` → System writes directly to Booking SS. Link (col J) is regenerated on update if kelas/waktu/harga change.
- **Generate next month**: Dashboard calls `generateNextMonth` → System copies template sheet, maps weekdays to new month dates, resets TERISI/SISA, updates links.

### 4. Financial & AI

- **Financial**: System API `getFinancial` reads all month sheets from Booking SS, applies CONFIG (fixed/variable costs), returns monthly P&L and by_class breakdown. Dashboard displays P&L, charts, margin table.
- **AI**: Dashboard uses Anthropic API (key in browser) with context from financial + config to generate insights and recommendations.

---

## Integrations

| Component        | Role |
|-----------------|------|
| **Google Sheets** | Booking SS: schedule + BOOKING_LOG. System SS: BOOKINGS, CONFIG, CUSTOMERS. Read/write via Apps Script. |
| **System GAS**  | Single Web App URL. GET: getBookings, getSchedule, getFinancial, getDashboard, getConfig, getMonths, getCustomers. POST: syncBooking, confirmBooking, rejectBooking, updateScheduleRow, addScheduleRow, deleteScheduleRow, saveConfig, generateNextMonth. |
| **Bridge GAS**  | Web App URL. GET: booking form (action=bookingform), konfirmasi. POST: submitBooking, updateStatus, getBookings. Writes BOOKING_LOG; calls System syncBooking; optionally calls Netlify notify-whatsapp. |
| **WhatsApp**    | Option A: Customer clicks wa.me link (current). Option B: Netlify function calls WhatsApp Cloud API to send template to admin on new booking. |
| **Dashboard**   | Static site (index.html) or React app (dashboard/). Reads System API URL from Settings; all data via System GAS. Deploy to Netlify or Vercel. |

---

## Security & Config

- **Owner access**: PIN in dashboard (stored in localStorage; optionally validated via API in future).
- **API URLs**: Stored in dashboard Settings (localStorage); cross-link System URL in Bridge and Bridge URL in System after deploy.
- **WhatsApp Cloud API**: Optional. Set env vars in Netlify: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ADMIN_WHATSAPP_NUMBER`.

---

## Deployment Summary

1. Deploy **SystemCode_v5.gs** to System Spreadsheet → copy Web App URL.
2. Deploy **SpreadsheetBridge_v4.gs** to Booking Spreadsheet → copy Web App URL.
3. Paste URLs in the opposite script (Bridge gets System URL; System gets Bridge URL) → redeploy both.
4. Deploy site to Netlify: drag folder or connect repo; publish root (or `dashboard/dist` if using React build).
5. In Dashboard Settings: set API URL (System), Bridge URL (Booking), payment info, PIN.
6. (Optional) Add Netlify function for WhatsApp: set env vars, ensure Bridge or System calls the function URL on new booking.
