/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   TENNISANS — SYSTEM CODE v5.0                                  ║
 * ║   Paste ke: Apps Script → SYSTEM Spreadsheet (Code.gs)          ║
 * ║   System SS ID: 12kOj7sM_aZr_HdyjrIcLF06nSeC73SRYw9vAYk5lDO0  ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║   COLUMN MAP (Booking Spreadsheet)                               ║
 * ║   A(1)=empty  B(2)=HARI   C(3)=TANGGAL  D(4)=WAKTU             ║
 * ║   E(5)=KELAS  F(6)=KUOTA  G(7)=TERISI   H(8)=SISA              ║
 * ║   I(9)=STATUS J(10)=LINK  K(11)=HARGA   L(12)=COACH            ║
 * ║   M(13)=PESERTA  N(14)=LOKASI  O(15)=RECLUB ← NEW              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 * CHANGELOG v5.0:
 * - Kolom O (15) = RECLUB link baru
 * - handleGenerateNextMonth: rewrite total, weekday-occurrence mapping
 *   + update week headers (MINGGU 1, MINGGU 2, ...) dengan tanggal akurat
 * - handleUpdateScheduleRow: tambah kelas, waktu, lokasi, kuota, catatan, reclub
 * - handleAddScheduleRow: tambah catatan, reclub
 * - handleGetSchedule: return reclub_link
 */

// ═══════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════
const SYS = {
  SYSTEM_SS_ID  : '12kOj7sM_aZr_HdyjrIcLF06nSeC73SRYw9vAYk5lDO0',
  BOOKING_SS_ID : '1i-bXXzvlo7tjO8iOd_B-_fF81hL21NIj9EDi5gHUMpw',
  BRIDGE_URL    : 'https://script.google.com/macros/s/AKfycbxAcKyvInXSBWHAvf734xDr1Z0hCJ8KcbiGU63DYqgQtKkpOKR_9ItVjhPO_tJOnosn/exec',
  ADMIN_WA      : '6285121197200',
  OWNER_PIN     : '1234',
  DASHBOARD_TITLE: 'Tennisans Owner Dashboard',
  TZONE         : 'Asia/Jakarta',
};

// Kolom booking spreadsheet (1-indexed)
const COL = {
  A:1, HARI:2, TANGGAL:3, WAKTU:4, KELAS:5, KUOTA:6,
  TERISI:7, SISA:8, STATUS:9, LINK:10, HARGA:11, COACH:12,
  PESERTA:13, LOKASI:14, RECLUB:15,
};

const DEFAULT_CONFIG = {
  fixed_lapang_bkpsdm : 500000,
  fixed_lapang_denpom : 400000,
  fixed_marketing     : 3000000,
  fixed_raket         : 500000,
  fixed_air_mineral   : 200000,
  coach_fee_full      : 200000,
  coach_fee_normal    : 200000,
  ballboy_fee         : 50000,
  foto_fee_openclass  : 350000,
  foto_fee_weekend    : 350000,
  target_fill_rate    : 80,
  target_revenue_month: 25000000,
};

const MONTH_NAMES_ID = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
                        'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
const DAY_NAMES_ID   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

// ═══════════════════════════════════════════
//  DO GET
// ═══════════════════════════════════════════
function doGet(e) {
  const p      = e.parameter || {};
  const action = (p.action || '').toLowerCase();

  const apiActions = ['getbookings','getschedule','getfinancial','getdashboard',
                      'getconfig','getmonths','getcustomers'];
  if (apiActions.includes(action)) {
    if (action === 'getbookings')   return ok(handleGetBookings(p));
    if (action === 'getschedule')   return ok(handleGetSchedule(p));
    if (action === 'getfinancial')  return ok(handleGetFinancial(p));
    if (action === 'getdashboard')  return ok(handleGetDashboard(p));
    if (action === 'getconfig')     return ok(handleGetConfig());
    if (action === 'getmonths')     return ok(handleGetMonths());
    if (action === 'getcustomers')  return ok(handleGetCustomers());
  }

  const selfUrl = ScriptApp.getService().getUrl();
  return HtmlService
    .createHtmlOutput(getDashboardHTML(selfUrl))
    .setTitle(SYS.DASHBOARD_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width,initial-scale=1,maximum-scale=1');
}

// ═══════════════════════════════════════════
//  DO POST
// ═══════════════════════════════════════════
function doPost(e) {
  try {
    const raw = (e && e.postData) ? (e.postData.contents || '{}') : '{}';
    let body;
    try {
      body = JSON.parse(raw);
    } catch(parseErr) {
      Logger.log('[doPost] JSON parse error: ' + parseErr.message + ' | raw: ' + raw.slice(0,200));
      return ok({ success: false, error: 'JSON parse error: ' + parseErr.message });
    }
    const action = (body.action || '').toLowerCase();

    if (action === 'syncbooking')         return ok(handleSyncBooking(body));
    if (action === 'confirmbooking')      return ok(handleConfirmBooking(body));
    if (action === 'rejectbooking')       return ok(handleRejectBooking(body));
    if (action === 'updateschedulerow')   return ok(handleUpdateScheduleRow(body));
    if (action === 'addschedulerow')      return ok(handleAddScheduleRow(body));
    if (action === 'deleteschedulerow')   return ok(handleDeleteScheduleRow(body));
    if (action === 'saveconfig')          return ok(handleSaveConfig(body));
    if (action === 'generatenextmonth')   return ok(handleGenerateNextMonth(body));
    if (action === 'generatemonthsheet')  return ok(handleGenerateNextMonth(body)); // alias

    return ok({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    Logger.log('[doPost] ' + err.message + '\n' + err.stack);
    return ok({ success: false, error: err.message });
  }
}

// ═══════════════════════════════════════════
//  GET HANDLERS
// ═══════════════════════════════════════════

function handleGetBookings(p) {
  const ss    = SpreadsheetApp.openById(SYS.SYSTEM_SS_ID);
  const sheet = ss.getSheetByName('BOOKINGS');
  if (!sheet || sheet.getLastRow() < 2) return { success: true, bookings: [], total: 0 };

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 20).getValues();
  let bookings = rows
    .filter(r => r[0] || r[5])
    .map(r => ({
      booking_id    : r[0],  jadwal_id    : r[1],  nama_kelas   : r[2],
      tanggal_sesi  : fmtDate(r[3]),               waktu_sesi   : r[4],
      nama          : r[5],  whatsapp     : r[6],  pax          : r[7],
      total_bayar   : r[8],  metode_bayar : r[9],  status       : r[10],
      source        : r[11], confirmed_by : r[12], confirmed_at : fmtDate(r[13]),
      submitted_at  : fmtDate(r[14]),              catatan      : r[15],
      payment_status: r[16], row_jadwal   : r[17], sheet_jadwal : r[18],
      instagram     : r[19] || '',
    }));

  if (p.status && p.status !== 'ALL')
    bookings = bookings.filter(b => b.status === p.status);

  bookings.sort((a, b) => {
    const da = new Date(b.submitted_at || 0), db = new Date(a.submitted_at || 0);
    return isNaN(da) ? 1 : isNaN(db) ? -1 : da - db;
  });
  return { success: true, bookings, total: bookings.length };
}

function handleGetSchedule(p) {
  const month = p.month || getCurrentMonthName();
  const ss    = SpreadsheetApp.openById(SYS.BOOKING_SS_ID);
  const sheet = ss.getSheetByName(month);

  if (!sheet) {
    const avail = ss.getSheets().map(s => s.getName()).filter(n => MONTH_NAMES_ID.some(m => n.includes(m)));
    return { success: false, error: 'Sheet tidak ditemukan', available: avail };
  }

  const lastRow  = Math.max(sheet.getLastRow() - 1, 1);
  const lastCol  = Math.max(sheet.getLastColumn(), 15);
  const rows     = sheet.getRange(2, 1, lastRow, lastCol).getValues();
  const schedule = [];
  let actualRow  = 2;

  for (let i = 0; i < rows.length; i++, actualRow++) {
    const r = rows[i];
    // Data row validation: col E (kelas) = non-empty string (not a header), col C (tanggal) = valid Date
    const kelasVal = r[4];
    const tanggalVal = r[2];
    const isHeader = typeof r[1] === 'string' && (r[1].includes('MINGGU') || r[1].includes('📅'));
    const isDataRow = !isHeader
      && kelasVal && typeof kelasVal === 'string' && kelasVal.trim().length > 0
      && !String(kelasVal).includes('MINGGU')
      && (tanggalVal instanceof Date) && !isNaN(tanggalVal.getTime());
    if (!isDataRow) continue;

    const harga  = Number(r[10]) || 0;
    const kuota  = Number(r[5])  || 0;
    const terisi = Number(r[6])  || 0;
    const sisa   = Number(r[7])  || Math.max(kuota - terisi, 0);

    schedule.push({
      row          : actualRow,
      tanggal      : fmtDate(r[2]),
      tanggal_raw  : r[2],
      hari         : String(r[1] || ''),
      waktu        : String(r[3] || ''),
      nama_kelas   : String(r[4]),
      max_pax      : kuota,
      terisi       : terisi,
      sisa         : sisa,
      status       : String(r[8]  || 'Tersedia'),
      harga        : harga,
      coach        : String(r[11] || ''),
      peserta      : String(r[12] || ''),
      lokasi       : String(r[13] || 'BKPSDM'),
      reclub_link  : String(r[14] || ''),   // col O
      fill_rate    : kuota > 0 ? Math.round((terisi / kuota) * 100) : 0,
      revenue      : harga * terisi,
      sheet_name   : month,
    });
  }

  const summary = {
    total_sessions   : schedule.length,
    total_terisi     : schedule.reduce((s,r) => s + r.terisi, 0),
    total_capacity   : schedule.reduce((s,r) => s + r.max_pax, 0),
    revenue_actual   : schedule.reduce((s,r) => s + r.revenue, 0),
    revenue_potential: schedule.reduce((s,r) => s + (r.harga * r.max_pax), 0),
    avg_fill_rate    : schedule.length > 0
      ? Math.round(schedule.reduce((s,r) => s + r.fill_rate, 0) / schedule.length) : 0,
  };

  return { success: true, schedule, summary, month };
}

function handleGetFinancial(p) {
  const cfg = loadConfig();
  const ss  = SpreadsheetApp.openById(SYS.BOOKING_SS_ID);
  const monthSheets = ss.getSheets().map(s => s.getName())
    .filter(n => MONTH_NAMES_ID.some(m => n.includes(m))).sort();

  const monthlyData = [];

  for (const sheetName of monthSheets) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) continue;

    const lastRow = Math.max(sheet.getLastRow() - 1, 1);
    const lastCol = Math.max(sheet.getLastColumn(), 11); // min col K (HARGA)
    const rows    = sheet.getRange(2, 1, lastRow, lastCol).getValues();
    const classData = {};

    rows.forEach(r => {
      // Data row validation: col C (tanggal) = Date, col E (kelas) = non-empty string
      const tanggal  = r[2]; // col C index 2
      const kelasRaw = r[4]; // col E index 4
      const isDataRow = kelasRaw && typeof kelasRaw === 'string' && kelasRaw.trim().length > 0
        && !kelasRaw.includes('📅') && !kelasRaw.includes('📋') && !kelasRaw.includes('MINGGU')
        && (tanggal instanceof Date) && !isNaN(tanggal.getTime());
      if (!isDataRow) return;
      const kelas  = String(kelasRaw).trim();
      const harga  = Number(r[10]) || 0;
      const kuota  = Number(r[5])  || 0;
      const terisi = Number(r[6])  || 0;
      const kelasLow = kelas.toLowerCase();
      const hasPhoto = kelasLow.includes('open') || kelasLow.includes('intensive') || kelasLow.includes('weekend');
      const varCost = cfg.coach_fee_normal + cfg.ballboy_fee + (hasPhoto ? cfg.foto_fee_openclass : 0);

      if (!classData[kelas]) classData[kelas] = { sessions:0, revenue:0, cost:0, pax:0, capacity:0 };
      classData[kelas].sessions++;
      classData[kelas].revenue  += harga * terisi;
      classData[kelas].cost     += varCost;
      classData[kelas].pax      += terisi;
      classData[kelas].capacity += kuota;
    });

    Object.keys(classData).forEach(k => {
      const c = classData[k];
      c.margin = c.revenue > 0 ? Math.round(((c.revenue - c.cost) / c.revenue) * 100) : 0;
      c.profit = c.revenue - c.cost;
    });

    const totalRevenue = Object.values(classData).reduce((s,c) => s + c.revenue, 0);
    const totalVarCost = Object.values(classData).reduce((s,c) => s + c.cost,    0);
    const fixedCost    = cfg.fixed_lapang_bkpsdm + cfg.fixed_lapang_denpom
                       + cfg.fixed_marketing + cfg.fixed_raket + cfg.fixed_air_mineral;
    const totalCost    = totalVarCost + fixedCost;
    const profit       = totalRevenue - totalCost;
    const totalPax     = Object.values(classData).reduce((s,c) => s + c.pax,      0);
    const totalCap     = Object.values(classData).reduce((s,c) => s + c.capacity, 0);

    const totalSessions = Object.values(classData).reduce((s,c) => s + c.sessions, 0);
    monthlyData.push({
      month          : sheetName,
      revenue        : totalRevenue,
      variable_cost  : totalVarCost,
      fixed_cost     : fixedCost,
      total_cost     : totalCost,
      profit         : profit,
      margin         : totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0,
      total_pax      : totalPax,
      total_capacity : totalCap,
      fill_rate      : totalCap > 0 ? Math.round((totalPax / totalCap) * 100) : 0,
      total_sessions : totalSessions,
      by_class       : classData,
    });
  }

  return { success: true, monthly: monthlyData, config: cfg };
}

function handleGetDashboard(p) {
  const month    = p.month || getCurrentMonthName();
  const bookings = handleGetBookings({ status: 'ALL' });
  const schedule = handleGetSchedule({ month });
  const financial= handleGetFinancial({});
  const config   = loadConfig();

  const thisMonth = financial.monthly.find(m => m.month === month) || {};
  const pending   = (bookings.bookings || []).filter(b => b.status === 'PENDING');
  const allMonths = financial.monthly;
  const thisIdx   = allMonths.findIndex(m => m.month === month);
  const prevMonth = thisIdx > 0 ? allMonths[thisIdx - 1] : null;
  const custData  = handleGetCustomers();

  return {
    success          : true,
    current_month    : month,
    kpi              : {
      revenue        : thisMonth.revenue        || 0,
      profit         : thisMonth.profit         || 0,
      margin         : thisMonth.margin         || 0,
      fill_rate      : schedule.summary?.avg_fill_rate || 0,
      total_sessions : schedule.summary?.total_sessions || thisMonth.total_sessions || 0,
      total_pax      : thisMonth.total_pax      || 0,
      pending_count  : pending.length,
      revenue_prev   : prevMonth?.revenue       || 0,
      profit_prev    : prevMonth?.profit        || 0,
    },
    bookings          : bookings.bookings         || [],
    schedule          : schedule.schedule         || [],
    schedule_summary  : schedule.summary          || {},
    financial_monthly : financial.monthly         || [],
    customers         : custData.customers        || [],
    config,
  };
}

function handleGetConfig() { return { success: true, config: loadConfig() }; }

function handleGetMonths() {
  const ss = SpreadsheetApp.openById(SYS.BOOKING_SS_ID);
  const months = ss.getSheets().map(s => s.getName())
    .filter(n => MONTH_NAMES_ID.some(m => n.includes(m))).sort();
  return { success: true, months };
}

function handleGetCustomers() {
  const ss    = SpreadsheetApp.openById(SYS.SYSTEM_SS_ID);
  const sheet = ss.getSheetByName('CUSTOMERS');
  if (!sheet || sheet.getLastRow() < 2) return { success: true, customers: [] };
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  const customers = rows.filter(r => r[0] || r[1]).map(r => ({
    whatsapp        : r[0], nama: r[1], instagram: r[2],
    kelas_terakhir  : r[3], total_booking: r[4],
    pertama_booking : fmtDate(r[5]), terakhir_booking: fmtDate(r[6]),
  }));
  return { success: true, customers, total: customers.length };
}

// ═══════════════════════════════════════════
//  POST HANDLERS
// ═══════════════════════════════════════════

function handleSyncBooking(body) {
  const ss = SpreadsheetApp.openById(SYS.SYSTEM_SS_ID);
  let sheet = ss.getSheetByName('BOOKINGS');
  if (!sheet) {
    sheet = ss.insertSheet('BOOKINGS');
    const hdr = [['BOOKING_ID','JADWAL_ID','NAMA_KELAS','TANGGAL','WAKTU',
                  'NAMA','WHATSAPP','PAX','TOTAL_BAYAR','METODE_BAYAR',
                  'STATUS','SOURCE','CONFIRMED_BY','CONFIRMED_AT','SUBMITTED_AT',
                  'CATATAN','PAYMENT_STATUS','ROW_JADWAL','SHEET_JADWAL','INSTAGRAM']];
    sheet.getRange(1,1,1,20).setValues(hdr)
      .setBackground('#1A1A2E').setFontColor('#FFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const existing = sheet.getDataRange().getValues();
  for (let r = 1; r < existing.length; r++) {
    if (String(existing[r][0]) === String(body.booking_id || '')) {
      Logger.log('[SYNC] Duplikat: ' + body.booking_id);
      return { success: true, duplicate: true, booking_id: body.booking_id };
    }
  }

  sheet.appendRow([
    body.booking_id    || '',   '',
    body.nama_kelas    || '',
    body.tanggal_sesi  ? new Date(body.tanggal_sesi.split('-').reverse().join('-')) : '',
    body.waktu_sesi    || '',
    body.nama_customer || '',   body.whatsapp      || '',
    parseInt(body.jumlah_pax) || 1,
    Number(body.total_bayar) || 0,
    body.metode_bayar  || '',   'PENDING',          'BOOKING_FORM',
    '', '',                     new Date(),
    body.catatan       || '',   'BELUM_BAYAR',
    parseInt(body.row_jadwal) || 0,
    body.sheet_jadwal  || getCurrentMonthName(),
    body.instagram     || '',
  ]);

  SpreadsheetApp.flush();
  upsertCustomer(body);
  Logger.log('[SYNC] ' + body.booking_id + ' | ' + body.nama_customer);
  return { success: true, booking_id: body.booking_id };
}

function handleConfirmBooking(body) {
  return updateBookingStatus(body.booking_id, 'CONFIRMED', body.admin_name || 'Owner', body);
}
function handleRejectBooking(body) {
  return updateBookingStatus(body.booking_id, 'REJECTED', body.admin_name || 'Owner', body);
}

function updateBookingStatus(bookingId, newStatus, byWho, body) {
  const ss    = SpreadsheetApp.openById(SYS.SYSTEM_SS_ID);
  const sheet = ss.getSheetByName('BOOKINGS');
  if (!sheet) return { success: false, error: 'BOOKINGS sheet tidak ada' };

  const rows  = sheet.getDataRange().getValues();
  const hdrs  = rows[0];
  const iStat  = hdrs.indexOf('STATUS');
  const iConfB = hdrs.indexOf('CONFIRMED_BY');
  const iConfA = hdrs.indexOf('CONFIRMED_AT');
  const iPayS  = hdrs.indexOf('PAYMENT_STATUS');
  const iRowJ  = hdrs.indexOf('ROW_JADWAL');
  const iShJ   = hdrs.indexOf('SHEET_JADWAL');
  const iPax   = hdrs.indexOf('PAX');

  for (let r = 1; r < rows.length; r++) {
    if (String(rows[r][0]) === String(bookingId)) {
      if (iStat  >= 0) sheet.getRange(r+1, iStat  +1).setValue(newStatus);
      if (iConfB >= 0) sheet.getRange(r+1, iConfB +1).setValue(byWho);
      if (iConfA >= 0) sheet.getRange(r+1, iConfA +1).setValue(new Date());
      if (newStatus === 'CONFIRMED' && iPayS >= 0)
        sheet.getRange(r+1, iPayS+1).setValue('LUNAS');

      if (newStatus === 'CONFIRMED') {
        const rowJ = parseInt(rows[r][iRowJ]) || parseInt(body.row_jadwal) || 0;
        const shJ  = rows[r][iShJ] || body.sheet_jadwal || getCurrentMonthName();
        const pax  = parseInt(rows[r][iPax]) || parseInt(body.pax) || 1;
        if (rowJ > 1) updateBookingSlot(shJ, rowJ, pax);
        updateBridgeStatus(bookingId, newStatus, rowJ, shJ, pax);
      }

      SpreadsheetApp.flush();
      return { success: true, booking_id: bookingId, new_status: newStatus };
    }
  }
  return { success: false, error: 'Booking tidak ditemukan: ' + bookingId };
}

function updateBookingSlot(sheetName, rowNum, addPax) {
  try {
    const ss    = SpreadsheetApp.openById(SYS.BOOKING_SS_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || rowNum < 2) return;
    const maxPax    = Number(sheet.getRange(rowNum, COL.KUOTA).getValue()) || 0;
    const terisi    = Number(sheet.getRange(rowNum, COL.TERISI).getValue()) || 0;
    const newTerisi = Math.min(terisi + addPax, maxPax > 0 ? maxPax : terisi + addPax);
    const newSisa   = Math.max((maxPax > 0 ? maxPax : newTerisi) - newTerisi, 0);
    sheet.getRange(rowNum, COL.TERISI).setValue(newTerisi);
    sheet.getRange(rowNum, COL.SISA).setValue(newSisa);
    if (newSisa === 0) sheet.getRange(rowNum, COL.STATUS).setValue('Penuh');
    SpreadsheetApp.flush();
    Logger.log('[SLOT] Row ' + rowNum + ' terisi=' + newTerisi + ' sisa=' + newSisa);
  } catch(e) { Logger.log('[SLOT-ERR] ' + e.message); }
}

function updateBridgeStatus(bookingId, status, rowJadwal, sheetJadwal, pax) {
  try {
    if (!SYS.BRIDGE_URL || SYS.BRIDGE_URL.includes('PASTE_')) return;
    UrlFetchApp.fetch(SYS.BRIDGE_URL, {
      method: 'post', contentType: 'text/plain;charset=utf-8',
      payload: JSON.stringify({ action:'updateStatus', booking_id:bookingId,
        status, row_jadwal:rowJadwal, sheet_jadwal:sheetJadwal, jumlah_pax:pax }),
      muteHttpExceptions: true,
    });
  } catch(e) { Logger.log('[BRIDGE-ERR] ' + e.message); }
}

// ── Update schedule row — full field support ──
function handleUpdateScheduleRow(body) {
  const ss    = SpreadsheetApp.openById(SYS.BOOKING_SS_ID);
  const sheet = ss.getSheetByName(body.sheet_name || getCurrentMonthName());
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan' };
  const row = parseInt(body.row);
  if (!row || row < 2) return { success: false, error: 'Row tidak valid' };

  // ── Full field updates ──
  if (body.nama_kelas !== undefined) sheet.getRange(row, COL.KELAS).setValue(String(body.nama_kelas));
  if (body.waktu      !== undefined) sheet.getRange(row, COL.WAKTU).setValue(String(body.waktu));
  if (body.harga      !== undefined) sheet.getRange(row, COL.HARGA).setValue(Number(body.harga));
  if (body.coach      !== undefined) sheet.getRange(row, COL.COACH).setValue(String(body.coach));
  if (body.lokasi     !== undefined) sheet.getRange(row, COL.LOKASI).setValue(String(body.lokasi));
  if (body.reclub_link !== undefined) sheet.getRange(row, COL.RECLUB).setValue(String(body.reclub_link));
  if (body.peserta    !== undefined) sheet.getRange(row, COL.PESERTA).setValue(String(body.peserta));

  // Kuota update + recalc sisa
  if (body.kuota !== undefined) {
    const newKuota = Number(body.kuota);
    sheet.getRange(row, COL.KUOTA).setValue(newKuota);
    const curTerisi = Number(sheet.getRange(row, COL.TERISI).getValue()) || 0;
    sheet.getRange(row, COL.SISA).setValue(Math.max(newKuota - curTerisi, 0));
  }

  // Terisi update + recalc sisa + auto-status
  if (body.terisi !== undefined) {
    const newTerisi = Number(body.terisi);
    const kuota     = Number(sheet.getRange(row, COL.KUOTA).getValue()) || 0;
    const newSisa   = Math.max(kuota - newTerisi, 0);
    sheet.getRange(row, COL.TERISI).setValue(newTerisi);
    sheet.getRange(row, COL.SISA).setValue(newSisa);
    if (!body.status) {
      const autoStatus = newSisa === 0 ? 'Penuh'
                       : newTerisi / (kuota || 1) >= 0.7 ? 'Hampir Penuh' : 'Tersedia';
      sheet.getRange(row, COL.STATUS).setValue(autoStatus);
    }
  }

  if (body.status !== undefined) sheet.getRange(row, COL.STATUS).setValue(String(body.status));
  if (body.sisa   !== undefined) sheet.getRange(row, COL.SISA).setValue(Number(body.sisa));

  // Regenerate booking link if kelas/waktu/harga changed
  if (body.nama_kelas !== undefined || body.waktu !== undefined || body.harga !== undefined) {
    const kelas  = String(sheet.getRange(row, COL.KELAS).getValue() || '');
    const waktu  = String(sheet.getRange(row, COL.WAKTU).getValue() || '');
    const harga  = Number(sheet.getRange(row, COL.HARGA).getValue()) || 0;
    const lokasi = String(sheet.getRange(row, COL.LOKASI).getValue() || 'BKPSDM');
    const kuota  = Number(sheet.getRange(row, COL.KUOTA).getValue()) || 0;
    const dateVal= sheet.getRange(row, COL.TANGGAL).getValue();
    if (dateVal instanceof Date) {
      const dateStr = Utilities.formatDate(dateVal, SYS.TZONE, 'dd-MM-yyyy');
      const sheetName = body.sheet_name || getCurrentMonthName();
      const link = buildBookingLink({ kelas, tanggal: dateStr, waktu, harga, maxPax: kuota, lokasi }, row, sheetName);
      if (link) {
        const rich = SpreadsheetApp.newRichTextValue().setText('💬 BOOKING').setLinkUrl(link).build();
        sheet.getRange(row, COL.LINK).setRichTextValue(rich);
      }
    }
  }

  sheet.getRange(row, COL.HARGA).setNumberFormat('#,##0');
  SpreadsheetApp.flush();
  return { success: true, row, sheet: body.sheet_name };
}

// ── Add schedule row — full field support ──
function handleAddScheduleRow(body) {
  const ss    = SpreadsheetApp.openById(SYS.BOOKING_SS_ID);
  const sName = body.sheet_name || getCurrentMonthName();
  const sheet = ss.getSheetByName(sName);
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan: ' + sName };

  const parts  = (body.tanggal || '').split('-');
  const tgl    = parts.length === 3 ? new Date(Number(parts[2]), Number(parts[1])-1, Number(parts[0]), 12) : new Date();
  const hari   = DAY_NAMES_ID[tgl.getDay()];
  const newRow = sheet.getLastRow() + 1;
  const maxPax = parseInt(body.max_pax) || 0;
  const harga  = Number(body.harga) || 0;

  const waktuStr  = body.waktu || (body.waktu_mulai && body.waktu_selesai
    ? body.waktu_mulai + ' – ' + body.waktu_selesai : body.waktu_mulai || '');
  const coachStr  = body.coach   || '';
  const lokasiStr = body.lokasi  || 'BKPSDM';
  const catatanStr= body.catatan || '';
  const reclubStr = body.reclub_link || '';

  const dateStr = Utilities.formatDate(tgl, SYS.TZONE, 'dd-MM-yyyy');
  const link = buildBookingLink({ kelas:body.nama_kelas, tanggal:dateStr, waktu:waktuStr,
    harga, maxPax, lokasi:lokasiStr }, newRow, sName);

  sheet.appendRow([
    '',           // A
    hari,         // B HARI
    tgl,          // C TANGGAL
    waktuStr,     // D WAKTU
    body.nama_kelas || '',  // E KELAS
    maxPax,       // F KUOTA
    0,            // G TERISI
    maxPax,       // H SISA
    'Tersedia',   // I STATUS
    '',           // J LINK (set below)
    harga,        // K HARGA
    coachStr,     // L COACH
    '',           // M PESERTA
    lokasiStr,    // N LOKASI
    reclubStr,    // O RECLUB ← NEW
  ]);

  sheet.getRange(newRow, COL.TANGGAL).setNumberFormat('dd MMMM yyyy');
  sheet.getRange(newRow, COL.HARGA).setNumberFormat('#,##0');

  if (link) {
    const rich = SpreadsheetApp.newRichTextValue().setText('💬 BOOKING').setLinkUrl(link).build();
    sheet.getRange(newRow, COL.LINK).setRichTextValue(rich);
  }

  SpreadsheetApp.flush();
  return { success: true, row: newRow, sheet: sName };
}

// ── Delete schedule row ──
function handleDeleteScheduleRow(body) {
  const ss    = SpreadsheetApp.openById(SYS.BOOKING_SS_ID);
  const sheet = ss.getSheetByName(body.sheet_name || getCurrentMonthName());
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan' };
  const row = parseInt(body.row);
  if (!row || row < 2) return { success: false, error: 'Row tidak valid' };

  const terisi = Number(sheet.getRange(row, COL.TERISI).getValue()) || 0;
  if (terisi > 0 && !body.force) {
    return { success: false, error: 'Kelas sudah ada ' + terisi + ' peserta. Gunakan force:true.' };
  }

  sheet.deleteRow(row);
  SpreadsheetApp.flush();
  return { success: true, row, deleted: true };
}

function handleSaveConfig(body) {
  const ss  = SpreadsheetApp.openById(SYS.SYSTEM_SS_ID);
  let sheet = ss.getSheetByName('CONFIG');
  if (!sheet) {
    sheet = ss.insertSheet('CONFIG');
    sheet.getRange(1,1,1,2).setValues([['KEY','VALUE']])
      .setBackground('#1A1A2E').setFontColor('#FFF').setFontWeight('bold');
  }
  const cfg  = { ...DEFAULT_CONFIG, ...(body.config || {}) };
  const rows = Object.entries(cfg).map(([k,v]) => [k, v]);
  sheet.clearContents();
  sheet.getRange(1,1,1,2).setValues([['KEY','VALUE']])
    .setBackground('#1A1A2E').setFontColor('#FFF').setFontWeight('bold');
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  SpreadsheetApp.flush();
  return { success: true, config: cfg };
}

// ═══════════════════════════════════════════
//  GENERATE MONTH SHEET — COMPLETE REWRITE
//  Algoritma: weekday-occurrence mapping
//  Semua format/visual/formula dari template
//  dipertahankan 100% via copyTo()
// ═══════════════════════════════════════════
function handleGenerateNextMonth(body) {
  const ss          = SpreadsheetApp.openById(SYS.BOOKING_SS_ID);
  const targetMonth = body.month;
  if (!targetMonth) return { success: false, error: 'Parameter month wajib diisi' };

  // ── Cari source/template sheet ──
  const allMonthSheets = ss.getSheets().map(s => s.getName())
    .filter(n => MONTH_NAMES_ID.some(m => n.includes(m))).sort();
  if (allMonthSheets.length === 0)
    return { success: false, error: 'Tidak ada template sheet. Buat sheet bulan pertama secara manual.' };

  let sourceMonth = body.source;
  if (!sourceMonth || !ss.getSheetByName(sourceMonth)) {
    // Auto-pick: cari sheet yang paling mendekati target (atau yang terbaru)
    sourceMonth = allMonthSheets[allMonthSheets.length - 1];
  }
  const sourceSheet = ss.getSheetByName(sourceMonth);
  if (!sourceSheet) return { success: false, error: 'Source sheet tidak ada: ' + sourceMonth };

  // ── Cek target sudah ada ──
  const existing = ss.getSheetByName(targetMonth);
  if (existing) {
    if (!body.force) {
      return { success: false, error: 'Sheet ' + targetMonth + ' sudah ada. Centang "Overwrite" untuk timpa.' };
    }
    ss.deleteSheet(existing);
    Utilities.sleep(800);
  }

  // ── Parse target month ──
  const parts  = targetMonth.split(' ');
  const monIdx = MONTH_NAMES_ID.indexOf(parts[0]);
  const year   = parseInt(parts[1]);
  if (monIdx < 0 || isNaN(year))
    return { success: false, error: 'Format bulan tidak valid: ' + targetMonth };

  // ── COPY SHEET — preserves ALL: format, merge, color, formula ──
  const newSheet = sourceSheet.copyTo(ss);
  newSheet.setName(targetMonth);
  Utilities.sleep(300);

  // ── Baca SEMUA data dari sheet baru ──
  const lastRow = newSheet.getLastRow();
  const lastCol = Math.max(newSheet.getLastColumn(), 15);
  const allVals = newSheet.getRange(1, 1, lastRow, lastCol).getValues();

  // ── ALGORITMA: weekday-occurrence mapping ──
  // Kumpulkan semua tanggal di source, group by hari (0=Min..6=Sab)
  const srcByWD = {};  // weekday → [{rowIdx, date}] sorted by date
  for (let i = 1; i < allVals.length; i++) {
    const dateVal = allVals[i][COL.TANGGAL - 1]; // col C
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const wd = dateVal.getDay();
      if (!srcByWD[wd]) srcByWD[wd] = [];
      srcByWD[wd].push({ rowIdx: i, date: dateVal });
    }
  }
  Object.keys(srcByWD).forEach(wd => srcByWD[wd].sort((a,b) => a.date - b.date));

  // Kumpulkan semua tanggal di target month, group by hari
  const daysInTarget = new Date(year, monIdx + 1, 0).getDate();
  const tgtByWD = {};
  for (let d = 1; d <= daysInTarget; d++) {
    const date = new Date(year, monIdx, d, 12, 0, 0);
    const wd   = date.getDay();
    if (!tgtByWD[wd]) tgtByWD[wd] = [];
    tgtByWD[wd].push(date);
  }

  // Build final map: rowIdx → new Date
  const rowDateMap = {};
  const skippedRows = [];
  Object.keys(srcByWD).forEach(wd => {
    const srcList = srcByWD[wd];
    const tgtList = tgtByWD[wd] || [];
    srcList.forEach((src, i) => {
      if (i < tgtList.length) {
        rowDateMap[src.rowIdx] = tgtList[i];
      } else {
        skippedRows.push(src.rowIdx); // lebih banyak occurrence di source
      }
    });
  });

  // ── Update tiap baris ──
  let updatedCount = 0;
  const weekHeaderInfo = []; // { rowIdx, rowNum, colIdx } untuk update MINGGU headers

  for (let i = 0; i < allVals.length; i++) {
    const rowNum = i + 1;
    const cellB  = allVals[i][COL.HARI - 1]; // col B
    const cellC  = allVals[i][COL.TANGGAL - 1]; // col C

    // ── Deteksi week header row ──
    if (typeof cellB === 'string' && cellB.includes('MINGGU') && cellB.includes('📅')) {
      weekHeaderInfo.push({ rowIdx: i, rowNum, text: cellB });
      continue;
    }

    // ── Data row dengan tanggal ──
    if (cellC instanceof Date && !isNaN(cellC.getTime())) {
      const newDate = rowDateMap[i];
      if (!newDate) continue; // occurrence tidak ada di bulan ini

      newSheet.getRange(rowNum, COL.TANGGAL).setValue(newDate);
      newSheet.getRange(rowNum, COL.TANGGAL).setNumberFormat('dd MMMM yyyy');
      newSheet.getRange(rowNum, COL.HARI).setValue(DAY_NAMES_ID[newDate.getDay()]);

      // Reset data booking
      newSheet.getRange(rowNum, COL.TERISI).setValue(0);
      newSheet.getRange(rowNum, COL.PESERTA).setValue('');
      // Col O RECLUB: clear untuk bulan baru
      if (lastCol >= COL.RECLUB) newSheet.getRange(rowNum, COL.RECLUB).setValue('');

      // Update booking link
      const kelas  = String(allVals[i][COL.KELAS   - 1] || '');
      const waktu  = String(allVals[i][COL.WAKTU   - 1] || '');
      const harga  = Number(allVals[i][COL.HARGA   - 1]) || 0;
      const lokasi = String(allVals[i][COL.LOKASI  - 1] || 'BKPSDM');
      const kuota  = Number(allVals[i][COL.KUOTA   - 1]) || 0;
      const dateStr= Utilities.formatDate(newDate, SYS.TZONE, 'dd-MM-yyyy');

      const link = buildBookingLink({ kelas, tanggal:dateStr, waktu, harga, maxPax:kuota, lokasi }, rowNum, targetMonth);
      if (link) {
        const existingText = newSheet.getRange(rowNum, COL.LINK).getRichTextValue()?.getText() || '💬 BOOKING';
        const rich = SpreadsheetApp.newRichTextValue().setText(existingText).setLinkUrl(link).build();
        newSheet.getRange(rowNum, COL.LINK).setRichTextValue(rich);
      }

      updatedCount++;
    }
  }

  SpreadsheetApp.flush();
  Utilities.sleep(300);

  // ── Update WEEK HEADER TEXT (MINGGU 1, MINGGU 2, ...) ──
  // Untuk tiap week header, cari tanggal sesi yang ada di antara header ini & berikutnya
  for (let h = 0; h < weekHeaderInfo.length; h++) {
    const headerRowIdx = weekHeaderInfo[h].rowIdx;
    const nextHeaderIdx = h + 1 < weekHeaderInfo.length ? weekHeaderInfo[h+1].rowIdx : allVals.length;

    const weekDates = [];
    for (let i = headerRowIdx + 1; i < nextHeaderIdx; i++) {
      if (rowDateMap[i]) weekDates.push(rowDateMap[i]);
    }
    if (weekDates.length === 0) continue;

    weekDates.sort((a,b) => a - b);
    const minD = weekDates[0];
    const maxD = weekDates[weekDates.length - 1];
    const weekNum = h + 1;
    const minStr = ('0' + minD.getDate()).slice(-2);
    const maxStr = ('0' + maxD.getDate()).slice(-2);
    const monName = MONTH_NAMES_ID[monIdx];
    const monNameCap = monName.charAt(0) + monName.slice(1).toLowerCase(); // "Maret"

    const newHeaderText = '📅 MINGGU ' + weekNum + ' (' + minStr + ' - ' + maxStr + ' ' + monNameCap + ')';
    newSheet.getRange(weekHeaderInfo[h].rowNum, COL.HARI).setValue(newHeaderText);
  }

  // ── Update referensi nama bulan di info section (baris 1–30) ──
  const srcMonthName  = sourceMonth.split(' ')[0];  // "JANUARI"
  const tgtMonthName  = targetMonth.split(' ')[0];  // "MARET"
  const srcMonNameCap = srcMonthName.charAt(0) + srcMonthName.slice(1).toLowerCase(); // "Januari"
  const tgtMonNameCap = tgtMonthName.charAt(0) + tgtMonthName.slice(1).toLowerCase(); // "Maret"

  for (let i = 0; i < Math.min(30, allVals.length); i++) {
    const rowNum = i + 1;
    for (let j = 0; j < allVals[i].length; j++) {
      const v = allVals[i][j];
      if (typeof v !== 'string') continue;
      let updated = v;
      if (updated.includes(sourceMonth)) updated = updated.split(sourceMonth).join(targetMonth);
      if (updated.includes(srcMonNameCap)) updated = updated.split(srcMonNameCap).join(tgtMonNameCap);
      if (updated.includes(srcMonthName)) updated = updated.split(srcMonthName).join(tgtMonthName);
      if (updated !== v) newSheet.getRange(rowNum, j + 1).setValue(updated);
    }
  }

  SpreadsheetApp.flush();

  // ── Posisikan sheet di urutan yang benar ──
  const allSheets = ss.getSheets();
  const curIdx    = allSheets.findIndex(s => s.getName() === targetMonth);
  // Sort: cari posisi yang benar berdasarkan nama bulan
  const targetSortKey = MONTH_NAMES_ID.indexOf(parts[0]) + year * 12;
  let insertPos = allSheets.length;
  allSheets.forEach((s, idx) => {
    if (s.getName() === targetMonth) return;
    const sp = s.getName().split(' ');
    const mi = MONTH_NAMES_ID.indexOf(sp[0]);
    const yr = parseInt(sp[1]);
    if (mi >= 0 && !isNaN(yr)) {
      const sortKey = mi + yr * 12;
      if (sortKey < targetSortKey) insertPos = idx + 1;
    }
  });
  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(Math.min(insertPos + 1, allSheets.length));

  Logger.log('[GEN] ' + targetMonth + ' dari ' + sourceMonth + ' — ' + updatedCount + ' rows updated');
  return {
    success       : true,
    month         : targetMonth,
    source        : sourceMonth,
    rows_updated  : updatedCount,
    skipped_rows  : skippedRows.length,
    message       : 'Sheet ' + targetMonth + ' berhasil dibuat dari template ' + sourceMonth + '. ' + updatedCount + ' sesi diperbarui.',
  };
}

// ═══════════════════════════════════════════
//  CUSTOMER DB
// ═══════════════════════════════════════════
function upsertCustomer(body) {
  const ss = SpreadsheetApp.openById(SYS.SYSTEM_SS_ID);
  let sheet = ss.getSheetByName('CUSTOMERS');
  if (!sheet) {
    sheet = ss.insertSheet('CUSTOMERS');
    sheet.getRange(1,1,1,7).setValues([['WHATSAPP','NAMA','INSTAGRAM','KELAS_TERAKHIR',
      'TOTAL_BOOKING','PERTAMA_BOOKING','TERAKHIR_BOOKING']])
      .setBackground('#1A1A2E').setFontColor('#FFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  const rows = sheet.getDataRange().getValues();
  const wa   = String(body.whatsapp || '');
  for (let r = 1; r < rows.length; r++) {
    if (String(rows[r][0]) === wa) {
      sheet.getRange(r+1, 4).setValue(body.nama_kelas || rows[r][3]);
      sheet.getRange(r+1, 5).setValue((rows[r][4] || 0) + 1);
      sheet.getRange(r+1, 7).setValue(new Date());
      return;
    }
  }
  sheet.appendRow([wa, body.nama_customer||'', body.instagram||'',
    body.nama_kelas||'', 1, new Date(), new Date()]);
}

// ═══════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════
function loadConfig() {
  try {
    const ss    = SpreadsheetApp.openById(SYS.SYSTEM_SS_ID);
    const sheet = ss.getSheetByName('CONFIG');
    if (!sheet || sheet.getLastRow() < 2) return { ...DEFAULT_CONFIG };
    const rows   = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    const result = { ...DEFAULT_CONFIG };
    rows.forEach(r => { if (r[0]) result[String(r[0])] = isNaN(r[1]) ? r[1] : Number(r[1]); });
    return result;
  } catch(e) { return { ...DEFAULT_CONFIG }; }
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function buildBookingLink(data, rowNum, sheetName) {
  if (!SYS.BRIDGE_URL || SYS.BRIDGE_URL.includes('PASTE_')) return '';
  return SYS.BRIDGE_URL + '?' + [
    'action=bookingForm',
    'row='     + rowNum,
    'sheet='   + encodeURIComponent(sheetName),
    'kelas='   + encodeURIComponent(data.kelas || data.nama_kelas || ''),
    'tanggal=' + encodeURIComponent(data.tanggal || ''),
    'waktu='   + encodeURIComponent(data.waktu || ''),
    'harga='   + (data.harga || 0),
    'maxPax='  + (data.maxPax || data.max_pax || 0),
    'sisa='    + (data.maxPax || data.max_pax || 0),
    'lokasi='  + encodeURIComponent(data.lokasi || 'BKPSDM'),
  ].join('&');
}

function fmtDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return Utilities.formatDate(val, SYS.TZONE, 'dd-MM-yyyy HH:mm');
  }
  return String(val);
}

function getCurrentMonthName() {
  const now = new Date();
  return MONTH_NAMES_ID[now.getMonth()] + ' ' + now.getFullYear();
}

function getNextMonthName() {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return MONTH_NAMES_ID[next.getMonth()] + ' ' + next.getFullYear();
}

function ok(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── Dashboard HTML (redirect ke Netlify) ──
function getDashboardHTML(selfUrl) {
  let html = getDashboardHTMLContent();
  if (selfUrl) {
    html = html.replace('__SYSTEM_URL__', selfUrl);
    html = html.replace('__BRIDGE_URL__', SYS.BRIDGE_URL);
    html = html.replace('__ADMIN_WA__', SYS.ADMIN_WA);
  }
  return html;
}

function getDashboardHTMLContent() {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tennisans — Redirecting...</title>
<meta http-equiv="refresh" content="2;url=https://tennisans.netlify.app">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#060A0D;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
  h1{font-size:26px;font-weight:900;margin-bottom:8px}h1 em{color:#3EE07F;font-style:normal}
  p{color:#8B9AB0;font-size:14px;margin:6px 0}a{color:#3EE07F;text-decoration:none;font-weight:700}
  .dot{display:inline-block;animation:blink 1s infinite}.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
</style>
</head>
<body>
<div>
  <div style="font-size:48px;margin-bottom:16px">🎾</div>
  <h1>TENNIS<em>ANS</em></h1>
  <p>✅ System API v5.0 aktif</p>
  <p style="margin-top:16px">Mengarahkan ke Owner Dashboard<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></p>
  <p style="margin-top:24px"><a href="https://tennisans.netlify.app">→ Buka Dashboard Sekarang</a></p>
  <p style="margin-top:32px;font-size:11px;color:#445567">API: <code style="color:#3EE07F">__SYSTEM_URL__</code></p>
</div>
</body></html>`;
}
