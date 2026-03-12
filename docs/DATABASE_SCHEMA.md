# Database Schema (Google Sheets as Database)

The system uses two Google Spreadsheets as the database. No external database is required.

---

## 1. Booking Spreadsheet

**ID**: `1i-bXXzvlo7tjO8iOd_B-_fF81hL21NIj9EDi5gHUMpw`

### Sheet: Month name (e.g. "MARET 2026", "APRIL 2026")

One sheet per month. Column indices 1-based in code.

| Col | Name    | Description |
|-----|---------|-------------|
| A   | (empty) | — |
| B   | HARI    | Day name (e.g. Senin) |
| C   | TANGGAL | Date (Date value) |
| D   | WAKTU   | Time range (e.g. 06.30 – 08.30) |
| E   | KELAS   | Class name |
| F   | KUOTA   | Max participants |
| G   | TERISI  | Filled count (updated on confirm) |
| H   | SISA    | Remaining slots |
| I   | STATUS  | Tersedia | Hampir Penuh | Penuh | CANCELLED |
| J   | LINK    | Rich text "💬 BOOKING" with URL to Bridge form |
| K   | HARGA   | Price per person |
| L   | COACH   | Coach name |
| M   | PESERTA | Notes / participant names |
| N   | LOKASI  | Location (e.g. BKPSDM, DENPOM III) |
| O   | RECLUB  | Reclub link URL |

Row 1 is header. Data rows start at 2. Some rows may be week headers (e.g. "MINGGU 1 📅").

### Sheet: BOOKING_LOG

Appended by Bridge on every form submit.

| Col | Name       | Description |
|-----|------------|-------------|
| 1   | BOOKING_ID | e.g. TNxxx |
| 2   | NAMA       | Customer name |
| 3   | PAX        | Number of participants |
| 4   | WHATSAPP   | Phone |
| 5   | INSTAGRAM  | Optional |
| 6   | TOTAL_BAYAR| Total amount |
| 7   | NAMA_KELAS | Class name |
| 8   | TANGGAL    | Session date |
| 9   | WAKTU      | Session time |
| 10  | STATUS     | PENDING → CONFIRMED / REJECTED |
| 11  | SUBMITTED_AT | Timestamp |
| 12  | ROW_JADWAL | Row number in month sheet |
| 13  | SHEET_JADWAL | Month sheet name |
| 14  | CATATAN    | Notes |
| 15  | RECLUB_URL | Optional |

---

## 2. System Spreadsheet

**ID**: `12kOj7sM_aZr_HdyjrIcLF06nSeC73SRYw9vAYk5lDO0`

### Sheet: BOOKINGS

Synced from Bridge (syncBooking). Dashboard reads; confirm/reject update this sheet.

| Col | Name          | Description |
|-----|---------------|-------------|
| 1   | BOOKING_ID    | |
| 2   | JADWAL_ID     | (optional) |
| 3   | NAMA_KELAS    | |
| 4   | TANGGAL       | Date |
| 5   | WAKTU         | |
| 6   | NAMA          | Customer name |
| 7   | WHATSAPP      | |
| 8   | PAX            | |
| 9   | TOTAL_BAYAR    | |
| 10  | METODE_BAYAR   | |
| 11  | STATUS         | PENDING | CONFIRMED | REJECTED |
| 12  | SOURCE         | e.g. BOOKING_FORM |
| 13  | CONFIRMED_BY   | |
| 14  | CONFIRMED_AT   | |
| 15  | SUBMITTED_AT   | |
| 16  | CATATAN        | |
| 17  | PAYMENT_STATUS | BELUM_BAYAR | LUNAS |
| 18  | ROW_JADWAL     | Row in Booking SS |
| 19  | SHEET_JADWAL   | Month sheet name |
| 20  | INSTAGRAM      | |

### Sheet: CONFIG

Key-value (KEY, VALUE). Used for financial and targets.

**Keys (examples):**

- fixed_lapang_bkpsdm, fixed_lapang_denpom, fixed_marketing, fixed_raket, fixed_air_mineral  
- coach_fee_full, coach_fee_normal, ballboy_fee, foto_fee_openclass, foto_fee_weekend  
- target_fill_rate, target_revenue_month  

### Sheet: CUSTOMERS

Deduplicated by WhatsApp. Updated by upsertCustomer on each booking.

| Col | Name            | Description |
|-----|-----------------|-------------|
| 1   | WHATSAPP        | Unique key |
| 2   | NAMA            | |
| 3   | INSTAGRAM       | |
| 4   | KELAS_TERAKHIR  | Last class booked |
| 5   | TOTAL_BOOKING   | Count |
| 6   | PERTAMA_BOOKING | First booking date |
| 7   | TERAKHIR_BOOKING| Last booking date |

---

## Sync Rules

- **BOOKING_LOG** (Booking SS) and **BOOKINGS** (System SS) are kept in sync by Bridge calling System `syncBooking` on submit.
- **TERISI / SISA** in the month sheet are updated when owner confirms: System calls Bridge `updateStatus` with CONFIRMED and pax; Bridge updates the row in the month sheet.
- **CONFIG** is read by System for financial calculations; written by Dashboard via `saveConfig`.
