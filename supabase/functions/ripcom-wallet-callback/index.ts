import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-ripcom-operator, x-ripcom-timestamp, x-ripcom-request-id, x-ripcom-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((v) => v.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}

function pemToBytes(pem: string) {
  const normalized = pem.replace(/-----BEGIN PUBLIC KEY-----/g, '').replace(/-----END PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  if (!normalized) throw new Error('PUBLIC_KEY_INVALID');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function b64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verify(publicKeyPem: string, canonical: string, signature: string) {
  const key = await crypto.subtle.importKey(
    'spki', pemToBytes(publicKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
  );
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64ToBytes(signature), new TextEncoder().encode(canonical));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json({ error: 'RIPCOM_NOT_CONFIGURED' }, 500);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const operatorCode = req.headers.get('X-Ripcom-Operator')?.trim() ?? '';
  const timestamp = req.headers.get('X-Ripcom-Timestamp')?.trim() ?? '';
  const requestId = req.headers.get('X-Ripcom-Request-Id')?.trim() ?? '';
  const signature = req.headers.get('X-Ripcom-Signature')?.trim() ?? '';
  if (!operatorCode || !timestamp || !requestId || !signature) return json({ error: 'B2B_AUTH_HEADERS_REQUIRED' }, 401);

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return json({ error: 'B2B_TIMESTAMP_INVALID' }, 401);

  const rawBody = await req.text();
  let body: Record<string, unknown> = {};
  try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { return json({ error: 'INVALID_JSON' }, 400); }

  const { data: operator, error: operatorError } = await admin
    .from('ripcom_operators')
    .select('id,code,name,status,environment,public_key_pem,callback_url,wallet_mode,max_requests_per_minute')
    .eq('code', operatorCode)
    .maybeSingle();
  if (operatorError || !operator) return json({ error: 'OPERATOR_NOT_FOUND' }, 401);
  if (operator.status !== 'ACTIVE') return json({ error: 'OPERATOR_INACTIVE' }, 403);
  if (!operator.public_key_pem) return json({ error: 'OPERATOR_PUBLIC_KEY_NOT_CONFIGURED' }, 503);
  if (operator.wallet_mode !== 'EXTERNAL_CALLBACK') return json({ error: 'CALLBACK_WALLET_NOT_ENABLED' }, 409);
  if (!operator.callback_url) return json({ error: 'CALLBACK_URL_NOT_CONFIGURED' }, 409);

  const bodyHash = await sha256(rawBody);
  const canonical = `POST\n/v1/wallet/callback-test\n${timestamp}\n${requestId}\n${bodyHash}`;
  try {
    if (!(await verify(operator.public_key_pem, canonical, signature))) return json({ error: 'B2B_SIGNATURE_INVALID' }, 401);
  } catch {
    return json({ error: 'B2B_SIGNATURE_INVALID' }, 401);
  }

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from('ripcom_wallet_callback_events')
    .select('id', { count: 'exact', head: true })
    .eq('operator_id', operator.id)
    .gte('created_at', oneMinuteAgo);
  if ((count ?? 0) >= Math.max(1, Math.min(Number(operator.max_requests_per_minute ?? 120), 6000))) {
    return json({ error: 'RATE_LIMIT' }, 429);
  }

  const eventType = String(body.event_type ?? body.eventType ?? 'PING').toUpperCase();
  if (!['BALANCE', 'BET', 'WIN', 'REFUND', 'PING'].includes(eventType)) return json({ error: 'INVALID_EVENT_TYPE' }, 400);

  const eventId = crypto.randomUUID();
  const callbackPayload = {
    event_id: eventId,
    event_type: eventType,
    sandbox: true,
    provider: 'RIPCOM',
    operator: operator.code,
    player_id: String(body.player_id ?? body.playerId ?? 'sandbox-player'),
    session_token: body.session_token ?? body.sessionToken ?? null,
    amount: Number(body.amount ?? 0),
    reference_event_id: body.reference_event_id ?? body.referenceEventId ?? null,
    challenge: body.challenge ?? requestId,
    occurred_at: new Date().toISOString(),
  };

  const { data: delivery, error: insertError } = await admin
    .from('ripcom_wallet_callback_events')
    .insert({
      operator_id: operator.id,
      event_id: eventId,
      event_type: eventType,
      callback_url: operator.callback_url,
      request_payload: callbackPayload,
    })
    .select('id')
    .single();
  if (insertError || !delivery) return json({ error: 'CALLBACK_LOG_CREATE_FAILED' }, 500);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const started = performance.now();
  let responseStatus: number | null = null;
  let responseBody = '';
  let errorCode: string | null = null;
  let success = false;

  try {
    const response = await fetch(operator.callback_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ripcom-Sandbox': 'true',
        'X-Ripcom-Event-Id': eventId,
        'X-Ripcom-Event-Type': eventType,
        'X-Ripcom-Operator': operator.code,
        'X-Ripcom-Body-SHA256': await sha256(JSON.stringify(callbackPayload)),
      },
      body: JSON.stringify(callbackPayload),
      signal: controller.signal,
    });
    responseStatus = response.status;
    responseBody = (await response.text()).slice(0, 2000);
    success = response.ok;
    if (!response.ok) errorCode = `CALLBACK_HTTP_${response.status}`;
  } catch (error) {
    errorCode = error instanceof DOMException && error.name === 'AbortError' ? 'CALLBACK_TIMEOUT' : 'CALLBACK_NETWORK_ERROR';
  } finally {
    clearTimeout(timeout);
  }

  const latency = Math.round(performance.now() - started);
  await admin
    .from('ripcom_wallet_callback_events')
    .update({
      response_status: responseStatus,
      response_body: responseBody || null,
      latency_ms: latency,
      success,
      error_code: errorCode,
      completed_at: new Date().toISOString(),
    })
    .eq('id', delivery.id);

  return json({
    data: {
      event_id: eventId,
      event_type: eventType,
      success,
      callback_status: responseStatus,
      latency_ms: latency,
      error_code: errorCode,
      sandbox: true,
    },
  }, success ? 200 : 502);
});
