// Temporary hotspot test: no user-controlled URL, headers or body reach the API.
const http = require('node:http');
const path = '/api/v1/health';
http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url !== path || req.method !== 'GET') {
    res.writeHead(404).end();
    return;
  }
  try {
    const upstream = await fetch('http://127.0.0.1:8090' + path, {signal: AbortSignal.timeout(3000), redirect: 'error'});
    const data = await upstream.json();
    const up = upstream.ok && data.status === 'UP';
    res.writeHead(up ? 200 : 503, {'Content-Type': 'application/json'}).end(JSON.stringify({
      status: up ? 'UP' : 'DOWN', service: 'entry-payment-api', timestamp: data.timestamp
    }));
  } catch {
    res.writeHead(503, {'Content-Type': 'application/json'}).end('{"status":"DOWN"}');
  }
}).listen(18090, '127.0.0.1');
