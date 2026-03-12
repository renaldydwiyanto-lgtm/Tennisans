/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║     TENNISANS - SPREADSHEET BRIDGE v3.0 (FINAL)            ║
 * ║     Paste ke: Apps Script → BOOKING Spreadsheet            ║
 * ║     SS ID: 1i-bXXzvlo7tjO8iOd_B-_fF81hL21NIj9EDi5gHUMpw   ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * FLOW:
 * Customer klik link booking di spreadsheet
 *   → doGet() serve form booking HTML
 *   → Customer isi form & submit
 *   → doPost() simpan ke BOOKING_LOG
 *   → Sync ke System SS (owner dashboard)
 *   → Customer redirect ke WA admin
 */

// ═══════════════════════════════════════════
//  CONFIG — sesuaikan setelah deploy
// ═══════════════════════════════════════════
const CFG = {
  BOOKING_SS_ID : '1i-bXXzvlo7tjO8iOd_B-_fF81hL21NIj9EDi5gHUMpw',
  SYSTEM_API_URL: 'https://script.google.com/macros/s/AKfycbyoB_6y109aiwyaudr9GK6NYsvvMKF17jdtSB00xIfgw9pDagn_-S_ikV2cRK2CWvzHyA/exec',  // URL deploy System SS
  ADMIN_WA      : '6285121197200',
  ADMIN_NAME    : 'Admin Tennisans',
  OWNER_EMAIL   : '',  // optional, buat email notif
  // Optional: Netlify function URL to notify admin via WhatsApp Cloud API (e.g. https://yoursite.netlify.app/.netlify/functions/notify-whatsapp)
  NOTIFY_WHATSAPP_URL: '',  // Isi jika pakai WhatsApp Cloud API
};

// ═══════════════════════════════════════════
//  DO GET — serve booking form
// ═══════════════════════════════════════════
function doGet(e) {
  const p = e.parameter || {};
  const action = (p.action || '').toLowerCase();

  if (action === 'bookingform' || action === 'booking') {
    return HtmlService
      .createHtmlOutput(buildBookingFormHTML(p))
      .setTitle('Booking Kelas — Tennisans')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'konfirmasi') {
    return HtmlService
      .createHtmlOutput(buildKonfirmasiHTML(p))
      .setTitle('Konfirmasi Booking — Tennisans')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Default — simple landing
  return HtmlService
    .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h1>🎾 Tennisans</h1><p>Lihat jadwal di spreadsheet lalu klik link BOOKING di kolom J.</p></body></html>')
    .setTitle('Tennisans Booking');
}

// ═══════════════════════════════════════════
//  DO POST — handle form submission
// ═══════════════════════════════════════════
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || 'submitBooking';

    if (action === 'submitBooking')  return jsonResp(handleSubmitBooking(body));
    if (action === 'updateStatus')   return jsonResp(handleUpdateStatus(body));
    if (action === 'getBookings')    return jsonResp(getBookingLog(body));

    return jsonResp({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    Logger.log('[doPost] ' + err.message);
    return jsonResp({ success: false, error: err.message });
  }
}

// ═══════════════════════════════════════════
//  HANDLE SUBMIT BOOKING
// ═══════════════════════════════════════════
function handleSubmitBooking(body) {
  const ss  = SpreadsheetApp.openById(CFG.BOOKING_SS_ID);
  const now = new Date();
  const bookingId = body.booking_id || ('TN' + now.getTime().toString(36).toUpperCase());

  // ─── 1. Pastikan BOOKING_LOG sheet ada ───
  let logSheet = ss.getSheetByName('BOOKING_LOG');
  if (!logSheet) {
    logSheet = ss.insertSheet('BOOKING_LOG');
    const hdr = [['BOOKING_ID','NAMA','PAX','WHATSAPP','INSTAGRAM',
                  'TOTAL_BAYAR','NAMA_KELAS','TANGGAL','WAKTU',
                  'STATUS','SUBMITTED_AT','ROW_JADWAL','SHEET_JADWAL','CATATAN','RECLUB_URL']];
    logSheet.getRange(1,1,1,15).setValues(hdr);
    logSheet.getRange(1,1,1,15)
      .setBackground('#1A1A2E').setFontColor('#FFFFFF').setFontWeight('bold');
    logSheet.setFrozenRows(1);
  }

  // ─── 2. Simpan booking ───
  logSheet.appendRow([
    bookingId,                                  // 1. BOOKING_ID
    body.nama_customer || '',                   // 2. NAMA
    parseInt(body.jumlah_pax) || 1,             // 3. PAX
    body.whatsapp        || '',                 // 4. WHATSAPP
    body.instagram       || '',                 // 5. INSTAGRAM
    Number(body.total_bayar) || 0,              // 6. TOTAL_BAYAR
    body.nama_kelas      || '',                 // 7. NAMA_KELAS
    body.tanggal_sesi    || '',                 // 8. TANGGAL
    body.waktu_sesi      || '',                 // 9. WAKTU
    'PENDING',                                  // 10. STATUS
    now,                                        // 11. SUBMITTED_AT
    parseInt(body.row_jadwal) || 0,             // 12. ROW_JADWAL
    body.sheet_jadwal    || getCurrentMonthName(), // 13. SHEET_JADWAL
    body.catatan         || '',                 // 14. CATATAN
    body.reclub_url      || '',                 // 15. RECLUB_URL ← was missing!
  ]);

  SpreadsheetApp.flush();

  // ─── 3. Sync ke System API (owner dashboard) ───
  try {
    syncToSystemAPI({ ...body, booking_id: bookingId });
  } catch (e) {
    Logger.log('[SYNC-ERR] ' + e.message);
  }

  // ─── 3b. Notify admin via WhatsApp Cloud API (opsional, jika NOTIFY_WHATSAPP_URL diisi) ───
  try {
    if (CFG.NOTIFY_WHATSAPP_URL && CFG.NOTIFY_WHATSAPP_URL.indexOf('http') === 0) {
      UrlFetchApp.fetch(CFG.NOTIFY_WHATSAPP_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ ...body, booking_id: bookingId }),
        muteHttpExceptions: true,
      });
    }
  } catch (e) {
    Logger.log('[WA-NOTIFY-ERR] ' + e.message);
  }

  // ─── 4. Kirim email notif ke owner (opsional) ───
  if (CFG.OWNER_EMAIL) {
    try { sendEmailNotif(body, bookingId); } catch(e) {}
  }

  Logger.log('[NEW-BOOKING] ' + bookingId + ' | ' + body.nama_customer + ' | ' + body.nama_kelas);

  return {
    success    : true,
    booking_id : bookingId,
    admin_wa   : CFG.ADMIN_WA,
  };
}

// ─── Sync ke System API ───
function syncToSystemAPI(data) {
  if (!CFG.SYSTEM_API_URL || CFG.SYSTEM_API_URL.includes('PASTE_')) return;
  try {
    const payload = JSON.stringify({ action: 'syncBooking', ...data });
    const resp = UrlFetchApp.fetch(CFG.SYSTEM_API_URL, {
      method            : 'post',
      contentType       : 'text/plain;charset=utf-8',  // GAS requires this, NOT application/json
      payload           : payload,
      muteHttpExceptions: true,
    });
    Logger.log('[SYNC-OK] HTTP ' + resp.getResponseCode() + ' | ' + resp.getContentText().slice(0,100));
  } catch(e) {
    Logger.log('[SYNC-ERR] ' + e.message);
  }
}

// ─── Update status di BOOKING_LOG ───
function handleUpdateStatus(body) {
  const ss        = SpreadsheetApp.openById(CFG.BOOKING_SS_ID);
  const logSheet  = ss.getSheetByName('BOOKING_LOG');
  if (!logSheet) return { success: false, error: 'BOOKING_LOG tidak ada' };

  const rows = logSheet.getDataRange().getValues();
  for (let r = 1; r < rows.length; r++) {
    if (String(rows[r][0]) === String(body.booking_id)) {
      logSheet.getRange(r + 1, 10).setValue(body.status || 'PENDING');
      if (body.catatan) {
        logSheet.getRange(r + 1, 14).setValue(
          (rows[r][13] || '') + '\n[' + new Date().toLocaleString('id') + '] ' + body.catatan
        );
      }
      SpreadsheetApp.flush();

      // Jika confirmed → update TERISI di jadwal
      if (body.status === 'CONFIRMED' && body.row_jadwal && body.sheet_jadwal) {
        updateSlotCount(body.sheet_jadwal, parseInt(body.row_jadwal), parseInt(body.jumlah_pax) || 1);
      }
      return { success: true, booking_id: body.booking_id, new_status: body.status };
    }
  }
  return { success: false, error: 'Booking tidak ditemukan' };
}

// ─── Update slot count di jadwal ───
function updateSlotCount(sheetName, rowNum, addPax) {
  // COLUMN MAP: F(6)=KUOTA, G(7)=TERISI, H(8)=SISA, I(9)=STATUS
  const ss     = SpreadsheetApp.openById(CFG.BOOKING_SS_ID);
  const jadwal = ss.getSheetByName(sheetName);
  if (!jadwal || rowNum < 2) return;

  const maxPax    = Number(jadwal.getRange(rowNum, 6).getValue()) || 0;  // F = KUOTA
  const terisi    = Number(jadwal.getRange(rowNum, 7).getValue()) || 0;  // G = TERISI
  const newTerisi = Math.min(terisi + addPax, maxPax > 0 ? maxPax : terisi + addPax);
  const newSisa   = Math.max((maxPax > 0 ? maxPax : newTerisi) - newTerisi, 0);

  jadwal.getRange(rowNum, 7).setValue(newTerisi);  // G = TERISI
  jadwal.getRange(rowNum, 8).setValue(newSisa);    // H = SISA
  if (newSisa === 0) jadwal.getRange(rowNum, 9).setValue('Penuh');  // I = STATUS
  SpreadsheetApp.flush();
  Logger.log('[SLOT-BRIDGE] Row ' + rowNum + ' +' + addPax + ' → terisi=' + newTerisi + ' sisa=' + newSisa);
}

// ─── Get booking log ───
function getBookingLog(params) {
  const ss       = SpreadsheetApp.openById(CFG.BOOKING_SS_ID);
  const logSheet = ss.getSheetByName('BOOKING_LOG');
  if (!logSheet || logSheet.getLastRow() < 2) return { success: true, data: [] };

  const rows = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 14).getValues();
  const data = rows
    .filter(r => r[0] || r[1])
    .map(r => ({
      booking_id   : r[0],
      nama         : r[1],
      pax          : r[2],
      whatsapp     : r[3],
      instagram    : r[4],
      total        : r[5],
      kelas        : r[6],
      tanggal      : r[7] instanceof Date ? Utilities.formatDate(r[7], 'Asia/Jakarta', 'dd-MM-yyyy') : String(r[7] || ''),
      waktu        : r[8],
      status       : r[9],
      submitted_at : r[10] instanceof Date ? r[10].toISOString() : String(r[10] || ''),
      row_jadwal   : r[11],
      sheet_jadwal : r[12],
      catatan      : r[13],
    }));

  return { success: true, data, total: data.length };
}

// ─── Email notif ───
function sendEmailNotif(body, bookingId) {
  MailApp.sendEmail({
    to     : CFG.OWNER_EMAIL,
    subject: '🎾 Booking Baru! ' + (body.nama_kelas || '') + ' – ' + (body.nama_customer || ''),
    body   : `BOOKING BARU MASUK!\n\nID: ${bookingId}\nNama: ${body.nama_customer}\nWA: ${body.whatsapp}\nKelas: ${body.nama_kelas}\nTanggal: ${body.tanggal_sesi} | ${body.waktu_sesi}\nPeserta: ${body.jumlah_pax} orang\nTotal: Rp ${Number(body.total_bayar).toLocaleString('id-ID')}\n\nCek & konfirmasi di Owner Dashboard.`,
  });
}

// ═══════════════════════════════════════════
//  HTML: BOOKING FORM (customer facing)
// ═══════════════════════════════════════════
function buildBookingFormHTML(p) {
  const kelas   = p.kelas   || '';
  const tanggal = p.tanggal || '';
  const waktu   = p.waktu   || '';
  const harga   = Number(p.harga)  || 0;
  const maxPax  = Number(p.maxPax) || 8;
  const sisa    = Number(p.sisa !== undefined ? p.sisa : maxPax) || maxPax;
  const lokasi  = p.lokasi  || 'BKPSDM Sumber, Kab. Cirebon';
  const row     = p.row     || '';
  const sheet   = p.sheet   || getCurrentMonthName();
  const selfUrl = ScriptApp.getService().getUrl();

  if (sisa <= 0) {
    return buildFullHTML(kelas, tanggal, waktu);
  }

  const paxOptions = Array.from({ length: sisa }, (_, i) =>
    `<option value="${i + 1}">${i + 1} orang — Rp ${((i + 1) * harga).toLocaleString('id-ID')}</option>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>Booking — Tennisans</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);min-height:100vh;padding:16px;color:#1e293b}
.wrap{max-width:480px;margin:0 auto}
.brand{text-align:center;padding:20px 0 16px;color:#fff}
.brand-logo{font-size:28px;font-weight:900;letter-spacing:-1px}
.brand-logo span{color:#22c55e}
.brand-sub{font-size:13px;color:rgba(255,255,255,.5);margin-top:4px}
.card{background:#fff;border-radius:24px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.class-badge{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border-radius:16px;padding:16px;margin-bottom:20px}
.class-name{font-size:18px;font-weight:800;margin-bottom:10px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.info-item{background:rgba(255,255,255,.15);border-radius:10px;padding:8px 10px}
.info-icon{font-size:14px}
.info-val{font-size:12px;font-weight:700;margin-top:2px}
.info-lbl{font-size:10px;opacity:.8}
.section-title{font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin:0 0 12px}
.field{margin-bottom:14px}
.lbl{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px}
.req{color:#ef4444}
input,select{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:15px;color:#1e293b;background:#fff;outline:none;transition:.2s;font-family:inherit;-webkit-appearance:none}
input:focus,select:focus{border-color:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.1)}
.err{font-size:11px;color:#ef4444;margin-top:4px;display:none}
.total-box{background:#f0fdf4;border:2px solid #bbf7d0;border-radius:14px;padding:14px;margin:16px 0;display:flex;justify-content:space-between;align-items:center}
.total-lbl{font-size:13px;color:#166534;font-weight:600}
.total-val{font-size:20px;font-weight:900;color:#15803d}
.btn-submit{width:100%;height:56px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;transition:.15s;letter-spacing:.3px}
.btn-submit:active{transform:scale(.97)}
.btn-submit:disabled{background:#94a3b8;cursor:not-allowed}
.footer-note{font-size:11px;color:#94a3b8;text-align:center;margin-top:14px;line-height:1.6}
/* Success state */
#successView{display:none;text-align:center;padding:10px 0}
.success-icon{font-size:64px;margin-bottom:12px;animation:pop .4s ease}
@keyframes pop{0%{transform:scale(.5);opacity:0}80%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
.success-title{font-size:22px;font-weight:900;color:#15803d;margin-bottom:8px}
.booking-id-box{background:#f0fdf4;border:2px dashed #86efac;border-radius:12px;padding:12px;margin:12px 0;font-size:13px;color:#166534}
.booking-id-box strong{font-size:16px;font-family:monospace}
.wa-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:56px;background:#25D366;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:800;text-decoration:none;margin-top:16px;font-family:inherit;cursor:pointer}
.wa-btn:active{transform:scale(.97)}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <div class="brand-logo">🎾 TENNIS<span>ANS</span></div>
    <div class="brand-sub">Tennis Community & Coaching — Cirebon</div>
  </div>

  <div class="card" id="formView">
    <div class="class-badge">
      <div class="class-name">🎾 ${kelas}</div>
      <div class="info-grid">
        ${tanggal ? `<div class="info-item"><div class="info-icon">📅</div><div class="info-val">${tanggal}</div><div class="info-lbl">Tanggal</div></div>` : ''}
        ${waktu   ? `<div class="info-item"><div class="info-icon">⏰</div><div class="info-val">${waktu}</div><div class="info-lbl">Waktu</div></div>` : ''}
        ${lokasi  ? `<div class="info-item"><div class="info-icon">📍</div><div class="info-val">${lokasi.length > 20 ? lokasi.substring(0,20)+'...' : lokasi}</div><div class="info-lbl">Lokasi</div></div>` : ''}
        ${harga   ? `<div class="info-item"><div class="info-icon">💰</div><div class="info-val">Rp ${harga.toLocaleString('id-ID')}</div><div class="info-lbl">Per orang</div></div>` : ''}
        <div class="info-item"><div class="info-icon">👥</div><div class="info-val">${sisa} slot</div><div class="info-lbl">Sisa tersedia</div></div>
      </div>
    </div>

    <div class="section-title">Data Peserta</div>

    <div class="field">
      <label class="lbl">Nama Lengkap <span class="req">*</span></label>
      <input id="f-nama" placeholder="Nama kamu" autocomplete="name">
      <div class="err" id="e-nama">Nama wajib diisi</div>
    </div>
    <div class="field">
      <label class="lbl">Nomor WhatsApp <span class="req">*</span></label>
      <input id="f-wa" placeholder="08xxx atau 628xxx" type="tel" inputmode="numeric" autocomplete="tel">
      <div class="err" id="e-wa">Nomor WA wajib diisi</div>
    </div>
    <div class="field">
      <label class="lbl">Username Instagram <span style="color:#94a3b8;font-weight:400">(opsional)</span></label>
      <input id="f-ig" placeholder="@username">
    </div>
    <div class="field">
      <label class="lbl">Jumlah Peserta <span class="req">*</span></label>
      <select id="f-pax">${paxOptions}</select>
    </div>

    <div class="total-box">
      <div class="total-lbl">💳 Total Bayar</div>
      <div class="total-val" id="totalVal">Rp ${harga.toLocaleString('id-ID')}</div>
    </div>

    <button class="btn-submit" id="btnSubmit" onclick="kirimBooking()">
      ✅ KIRIM BOOKING
    </button>
    <div class="footer-note">
      Setelah submit, klik tombol WA untuk konfirmasi ke admin.<br>
      Admin akan membalas dalam 1×24 jam. 🎾
    </div>
  </div>

  <div class="card" id="successView">
    <div class="success-icon">🎉</div>
    <div class="success-title">Booking Terkirim!</div>
    <p style="font-size:13px;color:#64748b;line-height:1.6;margin-bottom:12px">
      Booking kamu sudah kami terima. Klik tombol di bawah untuk konfirmasi ke admin via WhatsApp.
    </p>
    <div class="booking-id-box">
      ID Booking: <strong id="bkId">-</strong><br>
      Kelas: <strong>${kelas}</strong><br>
      <span id="bkSummary"></span>
    </div>
    <a id="waBtn" href="#" class="wa-btn" target="_blank">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Chat Admin — Konfirmasi Booking
    </a>
    <div class="footer-note" style="margin-top:12px">
      Setelah konfirmasi, admin akan kirim info rekening pembayaran. 💚
    </div>
  </div>
</div>

<script>
const HARGA   = ${harga};
const KELAS   = ${JSON.stringify(kelas)};
const TANGGAL = ${JSON.stringify(tanggal)};
const WAKTU   = ${JSON.stringify(waktu)};
const LOKASI  = ${JSON.stringify(lokasi)};
const ROW     = ${JSON.stringify(row)};
const SHEET   = ${JSON.stringify(sheet)};
const API_URL = ${JSON.stringify(selfUrl)};
const ADM_WA  = '${CFG.ADMIN_WA}';

document.getElementById('f-pax').addEventListener('change', function() {
  const n = parseInt(this.value) || 1;
  document.getElementById('totalVal').textContent = 'Rp ' + (HARGA * n).toLocaleString('id-ID');
});

async function kirimBooking() {
  const nama = document.getElementById('f-nama').value.trim();
  const wa   = document.getElementById('f-wa').value.trim();
  const ig   = document.getElementById('f-ig').value.trim();
  const pax  = parseInt(document.getElementById('f-pax').value) || 1;

  // validate
  let ok = true;
  if (!nama) { show('e-nama'); ok = false; } else hide('e-nama');
  if (!wa)   { show('e-wa');   ok = false; } else hide('e-wa');
  if (!ok)   return;

  const waClean = wa.replace(/\\D/g,'').replace(/^0/,'62').replace(/^(?!62)/,'62');
  const total   = HARGA * pax;
  const bkId    = 'TN' + Date.now().toString(36).toUpperCase();

  const btn = document.getElementById('btnSubmit');
  btn.disabled    = true;
  btn.textContent = '⏳ Mengirim...';

  try {
    const res = await fetch(API_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body   : JSON.stringify({
        action        : 'submitBooking',
        booking_id    : bkId,
        nama_customer : nama,
        whatsapp      : waClean,
        instagram     : ig,
        jumlah_pax    : pax,
        total_bayar   : total,
        nama_kelas    : KELAS,
        tanggal_sesi  : TANGGAL,
        waktu_sesi    : WAKTU,
        lokasi        : LOKASI,
        row_jadwal    : ROW,
        sheet_jadwal  : SHEET,
      }),
    });

    const data = await res.json();
    if (!data.success && !data.booking_id) throw new Error(data.error || 'Server error');

    // Show success
    document.getElementById('bkId').textContent = bkId;
    document.getElementById('bkSummary').innerHTML =
      'Tanggal: <strong>' + TANGGAL + ' ' + WAKTU + '</strong><br>' +
      'Peserta: <strong>' + pax + ' orang</strong> — Total: <strong>Rp ' + total.toLocaleString('id-ID') + '</strong>';

    const waMsg = encodeURIComponent(
      '🎾 *BOOKING TENNISANS*\n\n' +
      'ID: ' + bkId + '\n' +
      'Nama: ' + nama + '\n' +
      'Kelas: ' + KELAS + '\n' +
      'Tanggal: ' + TANGGAL + ' | ' + WAKTU + '\n' +
      'Peserta: ' + pax + ' orang\n' +
      'Total: Rp ' + total.toLocaleString('id-ID') + '\n\n' +
      'Mohon konfirmasi pembayaran. Terima kasih! 🙏'
    );
    document.getElementById('waBtn').href = 'https://wa.me/' + ADM_WA + '?text=' + waMsg;

    document.getElementById('formView').style.display    = 'none';
    document.getElementById('successView').style.display = 'block';
  } catch(err) {
    btn.disabled    = false;
    btn.textContent = '✅ KIRIM BOOKING';
    alert('Gagal mengirim. Coba lagi atau hubungi admin WA langsung.');
  }
}

function show(id) { document.getElementById(id).style.display = 'block'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }
</script>
</body>
</html>`;
}

// ─── HTML slot FULL ───
function buildFullHTML(kelas, tanggal, waktu) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Slot Penuh</title><style>body{font-family:sans-serif;text-align:center;padding:40px;background:#fff9eb}h1{font-size:40px}h2{color:#b45309}p{color:#78716c;margin-top:8px}</style></head><body><h1>😔</h1><h2>Slot ${kelas} Sudah Penuh</h2><p>${tanggal} — ${waktu}</p><p style="margin-top:20px">Hubungi admin via WA untuk waitlist:</p><a href="https://wa.me/${CFG.ADMIN_WA}" style="display:inline-block;margin-top:12px;background:#25D366;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold">💬 Chat Admin</a></body></html>`;
}

// ─── HTML konfirmasi (diakses admin) ───
function buildKonfirmasiHTML(p) {
  return `<!DOCTYPE html><html><body><h1>Konfirmasi Booking</h1><p>ID: ${p.id || '-'}</p></body></html>`;
}

// ─── Helpers ───
function getCurrentMonthName() {
  const months = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
                  'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
  const now = new Date();
  return months[now.getMonth()] + ' ' + now.getFullYear();
}

function jsonResp(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
