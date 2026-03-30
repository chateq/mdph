function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 200_000) {
        reject(new Error('Payload too large'));
        try { req.destroy(); } catch {}
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function mollieGetPayment(paymentId) {
  const apiKeyRaw = process.env.MOLLIE_API_KEY;
  const apiKey = String(apiKeyRaw || '').replace(/[\r\n]+/g, '').trim();
  if (!apiKey) throw new Error('Missing MOLLIE_API_KEY');

  const resp = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const text = await resp.text().catch(() => '');
  if (!resp.ok) {
    throw new Error(`Mollie error ${resp.status}: ${text || resp.statusText}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const raw = await readRawBody(req);

    const params = new URLSearchParams(String(raw || ''));
    const paymentId = params.get('id') || '';

    if (!paymentId) {
      return json(res, 400, { error: 'Missing payment id' });
    }

    // Sans DB, on se contente de vérifier que l'id existe.
    await mollieGetPayment(paymentId);

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Webhook failed', details: String(e?.message || e) });
  }
}
