const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-ripcom-sandbox, x-ripcom-event-id, x-ripcom-event-type, x-ripcom-operator, x-ripcom-body-sha256',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });

  const sandbox = req.headers.get('X-Ripcom-Sandbox') === 'true';
  if (!sandbox) return new Response(JSON.stringify({ error: 'SANDBOX_HEADER_REQUIRED' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { return new Response(JSON.stringify({ error: 'INVALID_JSON' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }

  const eventId = req.headers.get('X-Ripcom-Event-Id') ?? String(payload.event_id ?? '');
  const eventType = req.headers.get('X-Ripcom-Event-Type') ?? String(payload.event_type ?? '');

  console.log('ripcom_demo_wallet_callback_received', {
    eventId,
    eventType,
    operator: req.headers.get('X-Ripcom-Operator'),
    playerId: payload.player_id ?? null,
    amount: payload.amount ?? null,
  });

  return new Response(JSON.stringify({
    accepted: true,
    sandbox: true,
    event_id: eventId,
    event_type: eventType,
    challenge: payload.challenge ?? null,
    received_at: new Date().toISOString(),
  }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
});
