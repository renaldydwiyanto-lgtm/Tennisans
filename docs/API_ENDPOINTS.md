# API Endpoints Reference

## System API (Google Apps Script — System Spreadsheet)

Base URL: Web App URL after deploying `SystemCode_v5.gs` (e.g. `https://script.google.com/macros/s/.../exec`).

All POST bodies must be sent with `Content-Type: text/plain;charset=utf-8` and JSON body (GAS limitation).

---

### GET (query params)

| Action | Parameters | Description |
|--------|------------|-------------|
| `getBookings` | `status` (optional): ALL, PENDING, CONFIRMED, REJECTED | List bookings from BOOKINGS sheet. |
| `getSchedule` | `month`: e.g. "MARET 2026" | Schedule for one month from Booking SS. |
| `getFinancial` | — | Monthly P&L and by_class for all month sheets. |
| `getDashboard` | `month`: e.g. "MARET 2026" | Aggregated: bookings, schedule, financial, config, KPI, customers. |
| `getConfig` | — | CONFIG sheet key-value. |
| `getMonths` | — | List of month sheet names (e.g. ["MARET 2026", "APRIL 2026"]). |
| `getCustomers` | — | CUSTOMERS sheet data. |

Example: `GET {BASE}?action=getSchedule&month=MARET%202026`

---

### POST (JSON body)

| Action | Body fields | Description |
|--------|-------------|-------------|
| `syncBooking` | booking_id, nama_customer, whatsapp, instagram, jumlah_pax, total_bayar, nama_kelas, tanggal_sesi, waktu_sesi, row_jadwal, sheet_jadwal, catatan, metode_bayar | Append to BOOKINGS, upsert CUSTOMERS. Called by Bridge on form submit. |
| `confirmBooking` | booking_id, admin_name, row_jadwal?, sheet_jadwal?, pax? | Set STATUS=CONFIRMED, update slot via Bridge, set PAYMENT_STATUS=LUNAS. |
| `rejectBooking` | booking_id, admin_name | Set STATUS=REJECTED. |
| `updateScheduleRow` | row, sheet_name, nama_kelas?, waktu?, harga?, kuota?, terisi?, lokasi?, coach?, status?, reclub_link?, peserta? | Update one row in Booking SS month sheet; optionally regenerate BOOKING link. |
| `addScheduleRow` | sheet_name, tanggal (dd-mm-yyyy), nama_kelas, waktu_mulai, waktu_selesai, harga, max_pax, lokasi, coach, reclub_link?, catatan? | Append new schedule row; create BOOKING link. |
| `deleteScheduleRow` | row, sheet_name, force? | Delete row (blocked if terisi>0 unless force). |
| `saveConfig` | config: { fixed_lapang_bkpsdm, ... } | Write CONFIG sheet. |
| `generateNextMonth` | month (e.g. "APRIL 2026"), source (e.g. "MARET 2026"), force? | Copy source sheet to new month, map weekdays, reset terisi/sisa, update links. |

---

## Bridge API (Google Apps Script — Booking Spreadsheet)

Base URL: Web App URL after deploying `SpreadsheetBridge_v4.gs`.

---

### GET

| URL | Description |
|-----|-------------|
| `?action=bookingform&kelas=...&tanggal=...&waktu=...&harga=...&maxPax=...&sisa=...&lokasi=...&row=...&sheet=...` | Serves booking form HTML (customer). |
| `?action=konfirmasi&id=...` | Konfirmasi page (admin). |
| (default) | Landing text: "Lihat jadwal di spreadsheet lalu klik link BOOKING di kolom J." |

---

### POST (JSON body)

| Action | Body fields | Description |
|--------|-------------|-------------|
| `submitBooking` | booking_id, nama_customer, whatsapp, instagram, jumlah_pax, total_bayar, nama_kelas, tanggal_sesi, waktu_sesi, lokasi?, row_jadwal, sheet_jadwal | Append BOOKING_LOG; call System API syncBooking; return success + admin_wa. |
| `updateStatus` | booking_id, status, row_jadwal?, sheet_jadwal?, jumlah_pax? | Update BOOKING_LOG status; if CONFIRMED, increment TERISI in schedule row. |
| `getBookings` | — | Return BOOKING_LOG data (for admin). |

---

## Netlify Function: WhatsApp Notify (Optional)

**Path**: `/.netlify/functions/notify-whatsapp`  
**Method**: POST  
**Body**: JSON with booking details (e.g. booking_id, nama_customer, whatsapp, nama_kelas, tanggal_sesi, waktu_sesi, jumlah_pax, total_bayar).

**Environment variables** (Netlify dashboard):

- `WHATSAPP_TOKEN` — Meta WhatsApp Cloud API token.
- `WHATSAPP_PHONE_NUMBER_ID` — Sender phone number ID.
- `ADMIN_WHATSAPP_NUMBER` — Recipient (admin) in E.164, e.g. 6285121197200.

**Behavior**: Sends a pre-approved template message to the admin number notifying new booking. If template is not set up, the function can return a fallback (e.g. log only). Call this URL from Bridge after `syncToSystemAPI` if you want server-driven WhatsApp notification.
