# 🎾 TENNISANS SYSTEM v6.0 — DEPLOYMENT GUIDE

## BUGS FIXED IN v6.0
1. ✅ SpreadsheetBridge: `syncToSystemAPI` wrong contentType (bookings tidak masuk dashboard)
2. ✅ SpreadsheetBridge: `appendRow` missing RECLUB_URL column
3. ✅ Dashboard: `renderPLStatement` salah ID container (plContainer → plStatement)
4. ✅ Dashboard: AI tab null guard fixes
5. ✅ SystemCode: `handleGetSchedule` improved row detection
6. ✅ Dashboard: Schedule tab auto-load fix
7. ✅ SW registration bug (was unregistering WRONG SW)
8. ✅ Finance Refresh button added
9. ✅ All chart empty states handled

---

## STEP 1 — Deploy SystemCode ke SYSTEM Spreadsheet

1. Buka: https://docs.google.com/spreadsheets/d/12kOj7sM_aZr_HdyjrIcLF06nSeC73SRYw9vAYk5lDO0
2. Extensions → Apps Script
3. Hapus semua kode lama
4. Paste isi `SystemCode_v5.gs` (FULL)
5. Save (Ctrl+S)
6. Deploy → **New deployment**
   - Type: Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
7. **COPY URL** → simpan (ini SYSTEM_API_URL)

---

## STEP 2 — Deploy SpreadsheetBridge ke BOOKING Spreadsheet

1. Buka: https://docs.google.com/spreadsheets/d/1i-bXXzvlo7tjO8iOd_B-_fF81hL21NIj9EDi5gHUMpw
2. Extensions → Apps Script
3. Hapus semua kode lama
4. Paste isi `SpreadsheetBridge_v4.gs` (FULL)
5. Save (Ctrl+S)
6. Deploy → **New deployment**
   - Type: Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
7. **COPY URL** → simpan (ini BRIDGE_URL)

---

## STEP 3 — Cross-link kedua URL

### Di SystemCode_v5.gs:
Cari `BRIDGE_URL : 'https://...'` di bagian `const SYS = {`
Ganti dengan BRIDGE_URL dari Step 2
→ Save → **Deploy → Manage deployments → REDEPLOY existing**

### Di SpreadsheetBridge_v4.gs:
Cari `SYSTEM_API_URL: 'https://...'` di bagian `const CFG = {`
Ganti dengan SYSTEM_API_URL dari Step 1
→ Save → **Deploy → Manage deployments → REDEPLOY existing**

---

## STEP 4 — Upload ke Netlify

**Option A — Legacy dashboard (single index.html)**  
1. Buka https://app.netlify.com → pilih site tennisans  
2. Drag & drop **seluruh isi folder zip** ke deploy area (root = `index.html`)  
3. Tunggu deploy selesai  

**Option B — React dashboard (recommended for new deploys)**  
1. Build: `cd dashboard && npm install && npm run build`  
2. Di Netlify: **Build command** = `cd dashboard && npm install && npm run build`  
3. **Publish directory** = `dashboard/dist`  
4. Deploy (git push atau drag folder yang berisi hasil build di `dashboard/dist`)

---

## STEP 5 — Konfigurasi Dashboard

1. Buka https://tennisans.netlify.app
2. Login dengan PIN: **2026**
3. Buka tab **⚙️ Settings**
4. Isi:
   - **API URL (System SS)** = URL dari Step 1
   - **Bridge URL (Booking SS)** = URL dari Step 2
   - **Info pembayaran** (bank, rekening, atas nama)
5. Klik **💾 Simpan Konfigurasi**
6. Klik **🔌 Test Koneksi API** → harus muncul "✅ Koneksi berhasil"

---

## STEP 6 — Verify End-to-End

1. Buka Booking Spreadsheet
2. Klik link BOOKING di salah satu baris jadwal
3. Isi form → Submit
4. Cek: booking masuk di tab **📋 Bookings** di dashboard
5. Konfirmasi booking → cek TERISI di spreadsheet bertambah
6. Cek tab **💰 Finance** → data terbaca dari MARET 2026

---

## TROUBLESHOOTING

| Error | Solusi |
|-------|--------|
| "Error: offline" di gen modal | Isi API URL di Settings → Test Koneksi |
| Booking tidak masuk dashboard | Redeploy Bridge dengan SYSTEM_API_URL yang benar |
| Financial data kosong | Cek TERISI > 0 di sheet, klik 🔄 Refresh di Finance tab |
| Link BOOKING di spreadsheet tidak jalan | Redeploy Bridge, update booking links via Edit row |

---

## OPSIONAL: WhatsApp Cloud API (notify admin saat booking baru)

1. Di Netlify: Site → Functions → env vars: set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ADMIN_WHATSAPP_NUMBER`.
2. Deploy folder yang berisi `netlify/functions/notify-whatsapp.js`.
3. Di **SpreadsheetBridge_v4.gs** → `CFG.NOTIFY_WHATSAPP_URL` = `https://yoursite.netlify.app/.netlify/functions/notify-whatsapp`
4. Redeploy Bridge. Setiap submit booking akan POST ke function tersebut; function mengirim template WhatsApp ke admin (perlu template disetujui di Meta Business Manager).

---

## URLS REFERENSI

- Booking SS: `1i-bXXzvlo7tjO8iOd_B-_fF81hL21NIj9EDi5gHUMpw`
- System SS: `12kOj7sM_aZr_HdyjrIcLF06nSeC73SRYw9vAYk5lDO0`
- Dashboard: https://tennisans.netlify.app
- Admin WA: 6285121197200

