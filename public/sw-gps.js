// Service Worker — GPS background sync
let gpsInterval = null;

self.addEventListener('message', event => {
  if (event.data.type === 'START_GPS') {
    const { motoristaId, nome, supabaseUrl, supabaseKey } = event.data;

    if (gpsInterval) clearInterval(gpsInterval);

    // Envia posição a cada 15s mesmo em background
    gpsInterval = setInterval(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'REQUEST_POSITION' });
        });
      });
    }, 15000);

    // Confirma início
    event.source?.postMessage({ type: 'GPS_STARTED' });
  }

  if (event.data.type === 'STOP_GPS') {
    if (gpsInterval) { clearInterval(gpsInterval); gpsInterval = null; }
  }

  if (event.data.type === 'SEND_POSITION') {
    const { lat, lng, motoristaId, nome, supabaseUrl, supabaseKey } = event.data;
    fetch(`${supabaseUrl}/rest/v1/rastreamento_gps`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        motorista_id: motoristaId,
        nome_motorista: nome,
        latitude: lat.toString(),
        longitude: lng.toString(),
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
