#!/usr/bin/env node

const apiBase =
  process.env.API_BASE ||
  `http://localhost:${process.env.ADMIN_PANEL_PORT || '5500'}`;

const testReservationId = String(process.env.TEST_RESERVATION_ID || '').trim();
const testQrToken = String(process.env.TEST_QR_TOKEN || '').trim();
const allowMutation = String(process.env.ALLOW_MUTATION || 'false').toLowerCase() === 'true';

const results = [];

function pushResult(name, ok, detail) {
  results.push({ name, ok, detail });
  const prefix = ok ? '✅' : '❌';
  console.log(`${prefix} ${name}${detail ? ` - ${detail}` : ''}`);
}

async function request(method, path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = null;
  }

  return { response, text, json };
}

function finalize() {
  const failed = results.filter((item) => !item.ok);
  console.log('\n--- Resultado checklist QR/Reservas ---');
  console.log(`Total: ${results.length}`);
  console.log(`Exitosos: ${results.length - failed.length}`);
  console.log(`Fallidos: ${failed.length}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  console.log(`\n🔎 Ejecutando checklist QR/Reservas contra: ${apiBase}\n`);

  try {
    const configReq = await request('GET', '/api/config');
    const configOk =
      configReq.response.ok &&
      !!configReq.json?.supabaseUrl &&
      !!configReq.json?.supabaseKey;
    pushResult('GET /api/config', configOk, configOk ? 'config OK' : configReq.text);

    const listReq = await request('GET', '/api/get-reservations');
    const listOk = listReq.response.ok && Array.isArray(listReq.json);
    pushResult(
      'GET /api/get-reservations',
      listOk,
      listOk ? `${listReq.json.length} reservas` : listReq.text
    );

    let currentReservation = null;
    if (listOk && testReservationId) {
      currentReservation = listReq.json.find(
        (r) => String(r.id || '') === testReservationId
      );
      pushResult(
        'Buscar TEST_RESERVATION_ID en listado',
        !!currentReservation,
        currentReservation ? `estado actual: ${currentReservation.estado}` : 'no encontrada'
      );
    }

    if (currentReservation) {
      const statusReq = await request(
        'POST',
        `/api/reservations/${encodeURIComponent(testReservationId)}/status`,
        { status: currentReservation.estado }
      );
      const statusOk = statusReq.response.ok && statusReq.json?.ok === true;
      pushResult(
        'POST /api/reservations/:id/status (idempotente)',
        statusOk,
        statusOk ? `status: ${statusReq.json?.status}` : statusReq.text
      );
    } else if (testReservationId) {
      pushResult(
        'POST /api/reservations/:id/status (idempotente)',
        false,
        'no se pudo probar sin reserva valida'
      );
    } else {
      pushResult(
        'POST /api/reservations/:id/status (idempotente)',
        true,
        'omitido (define TEST_RESERVATION_ID)'
      );
    }

    if (testQrToken) {
      const lookupReq = await request(
        'GET',
        `/api/qr-lookup?token=${encodeURIComponent(testQrToken)}`
      );
      const lookupOk = lookupReq.response.ok && lookupReq.json?.found !== undefined;
      pushResult(
        'GET /api/qr-lookup',
        lookupOk,
        lookupOk
          ? `found=${lookupReq.json?.found}, status=${lookupReq.json?.status || 'n/a'}`
          : lookupReq.text
      );

      if (allowMutation) {
        const validateReq = await request('POST', '/api/qr-validate-and-complete', {
          token: testQrToken
        });
        const validateOk =
          validateReq.response.ok &&
          validateReq.json?.found === true &&
          typeof validateReq.json?.status === 'string';
        pushResult(
          'POST /api/qr-validate-and-complete',
          validateOk,
          validateOk ? `status final: ${validateReq.json?.status}` : validateReq.text
        );
      } else {
        pushResult(
          'POST /api/qr-validate-and-complete',
          true,
          'omitido (define ALLOW_MUTATION=true)'
        );
      }
    } else {
      pushResult('GET /api/qr-lookup', true, 'omitido (define TEST_QR_TOKEN)');
      pushResult(
        'POST /api/qr-validate-and-complete',
        true,
        'omitido (define TEST_QR_TOKEN y ALLOW_MUTATION=true)'
      );
    }
  } catch (error) {
    pushResult('Ejecucion checklist', false, error.message || String(error));
  } finally {
    finalize();
  }
}

main();
