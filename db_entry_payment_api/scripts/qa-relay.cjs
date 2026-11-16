// Opt-in temporary QA access to the local test API. Run instead of the
// health-only relay; do not run against a production database.
const http = require('node:http');
const {randomBytes, timingSafeEqual} = require('node:crypto');
const origin = 'http://127.0.0.1:8090';
const routes = {
  GET: /^\/api\/v1\/(?:health|trainers|membership-plans|personal-trainings|members(?:\/\d+)?|payments|reminder-settings|whatsapp\/messages)$/,
  POST: /^\/api\/v1\/(?:management\/auth\/(?:login-method|verify-otp|verify-password)|app-auth\/(?:members|trainers)\/(?:login-method|verify-otp)|members|payments|whatsapp\/(?:messages|broadcasts))$/,
  PUT: /^\/api\/v1\/reminder-settings$/,
  PATCH: /^\/api\/v1\/members\/\d+\/whatsapp-updates$/,
};
function createRelay(code) {
  const secret = Buffer.from(code);
  return http.createServer(async (req, res) => {
    const reply = (status, body = {}) => res.writeHead(status, {'Content-Type': 'application/json','Cache-Control': 'no-store'}).end(JSON.stringify(body));
    const path = req.url.split('?')[0];
    const probe = path === '/api/v1/qa/access' && req.method === 'GET';
    if (!probe && !routes[req.method]?.test(path)) return reply(404);
    if (!(path === '/api/v1/health' && req.method === 'GET')) {
      const supplied = Buffer.from(req.headers['x-qa-code'] || '');
      if (supplied.length !== secret.length || !timingSafeEqual(supplied, secret))
        return reply(401, {message: 'QA access code required'});
    }
    if (probe) { res.writeHead(204, {'Cache-Control':'no-store'}).end(); return; }
    try {
      let body;
      if (req.method !== 'GET') {
        if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return reply(415);
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 16 * 1024 * 1024) return reply(413);
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }
      const headers = body ? {'Content-Type':'application/json'} : {};
      if (req.headers.authorization) headers.Authorization = req.headers.authorization;
      const upstream = await fetch(origin + req.url, {method:req.method,headers,body,redirect:'error',signal:AbortSignal.timeout(30000)});
      res.writeHead(upstream.status, {'Content-Type':'application/json','Cache-Control':'no-store'});
      if (upstream.body) for await (const chunk of upstream.body) res.write(chunk);
      res.end();
    } catch {
      if (!res.headersSent) reply(502, {message:'Test API unavailable'});
      else res.destroy();
    }
  });
}
module.exports = {createRelay};
if (require.main === module) {
  const code = randomBytes(18).toString('base64url');
  const relay = createRelay(code);
  relay.on('error', err => { console.error(err.code === 'EADDRINUSE' ? 'Port 18090 is in use. Stop only the health-only relay, not cloudflared.' : err.message); process.exitCode = 1; });
  relay.listen(18090,'127.0.0.1',() => console.log('QA relay active. Share this temporary code privately with trusted testers: ' + code + '\nKeep this window open. Ctrl+C revokes access.'));
}
