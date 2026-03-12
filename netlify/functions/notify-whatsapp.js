/**
 * Netlify serverless function: notify admin via WhatsApp Cloud API when a new booking is submitted.
 *
 * Set in Netlify: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, ADMIN_WHATSAPP_NUMBER (E.164, e.g. 6285121197200)
 * Optional: BOOKING_NOTIFY_TEMPLATE_NAME, BOOKING_NOTIFY_LANG (default: id)
 *
 * Call from SpreadsheetBridge after syncToSystemAPI (add a second UrlFetchApp.fetch to this URL with POST body).
 */

const WHATSAPP_API = 'https://graph.facebook.com/v18.0';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  const templateName = process.env.BOOKING_NOTIFY_TEMPLATE_NAME || 'booking_notification';
  const lang = process.env.BOOKING_NOTIFY_LANG || 'id';

  if (!token || !phoneNumberId || !adminNumber) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        error: 'Missing WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, or ADMIN_WHATSAPP_NUMBER',
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const booking_id = payload.booking_id || payload.bookingId || '-';
  const nama = payload.nama_customer || payload.nama || '-';
  const wa = payload.whatsapp || '-';
  const kelas = payload.nama_kelas || payload.kelas || '-';
  const tanggal = payload.tanggal_sesi || payload.tanggal || '-';
  const waktu = payload.waktu_sesi || payload.waktu || '-';
  const pax = payload.jumlah_pax || payload.pax || 1;
  const total = payload.total_bayar || payload.total_bayar || 0;
  const numTotal = typeof total === 'number' ? total : parseInt(String(total).replace(/\D/g, ''), 10) || 0;
  const totalStr = 'Rp ' + (numTotal || 0).toLocaleString('id-ID');

  // WhatsApp Cloud API: send template message (must be pre-approved in Meta Business Manager)
  // If you don't have a template, we send a text message via the messages API (requires 24h window or template)
  // For new booking we use template. Example template name: booking_notification with body params.
  const templateBody = {
    messaging_product: 'whatsapp',
    to: adminNumber.replace(/\D/g, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(booking_id) },
            { type: 'text', text: String(nama) },
            { type: 'text', text: String(kelas) },
            { type: 'text', text: String(tanggal) },
            { type: 'text', text: String(waktu) },
            { type: 'text', text: String(pax) },
            { type: 'text', text: totalStr },
          ],
        },
      ],
    },
  };

  try {
    const url = `${WHATSAPP_API}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(templateBody),
    });
    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          error: data.error?.message || res.statusText,
          raw: data,
        }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, messageId: data.messages?.[0]?.id }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      body: JSON.stringify({ success: false, error: e.message }),
    };
  }
};
