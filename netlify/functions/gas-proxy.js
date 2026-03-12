/**
 * Netlify Function: proxy requests to Google Apps Script Web App.
 * Fixes browser CORS/CSP/redirect issues by making the request server-side.
 *
 * Usage (GET):
 *   /.netlify/functions/gas-proxy?base=<SYSTEM_API_URL>&action=getMonths&month=...
 *
 * Usage (POST):
 *   POST /.netlify/functions/gas-proxy?base=<SYSTEM_API_URL>
 *   body: JSON (will be forwarded to GAS with text/plain;charset=utf-8)
 */
exports.handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const base = (qs.base || '').trim();

    if (!isValidGasBase(base)) {
      return json(400, { success: false, error: 'Invalid base URL. Must be a Google Apps Script /exec URL.' });
    }

    if (event.httpMethod === 'GET') {
      const passthrough = { ...qs };
      delete passthrough.base;
      const url = base + '?' + new URLSearchParams({ ...passthrough, _t: String(Date.now()) }).toString();

      const resp = await fetch(url, { redirect: 'follow' });
      const text = await resp.text();
      return {
        statusCode: resp.ok ? 200 : resp.status,
        headers: corsHeaders(),
        body: text,
      };
    }

    if (event.httpMethod === 'POST') {
      const payload = event.body || '{}';
      const resp = await fetch(base + '?_t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload,
        redirect: 'follow',
      });
      const text = await resp.text();
      return {
        statusCode: resp.ok ? 200 : resp.status,
        headers: corsHeaders(),
        body: text,
      };
    }

    return json(405, { success: false, error: 'Method not allowed' });
  } catch (e) {
    return json(200, { success: false, error: e?.message || 'Unknown error' });
  }
};

function isValidGasBase(base) {
  try {
    const u = new URL(base);
    const okHost = u.host === 'script.google.com';
    const okPath = u.pathname.includes('/macros/s/') && u.pathname.endsWith('/exec');
    return u.protocol === 'https:' && okHost && okPath;
  } catch {
    return false;
  }
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Cache-Control': 'no-store',
  };
}

function json(statusCode, obj) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(obj) };
}

