// Zero-dependency local server: serves /public and accepts form submissions at POST /api/lead
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const LEADS = path.join(__dirname, 'leads.jsonl');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
};

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

function handleLead(req, res) {
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 10_000) req.destroy(); });
  req.on('end', () => {
    let d;
    try { d = JSON.parse(raw); } catch { return json(res, 400, { ok: false, error: 'bad_json' }); }
    if (d.website) return json(res, 200, { ok: true }); // honeypot: silently drop bots
    const name = String(d.name || '').trim();
    const phone = String(d.phone || '').trim();
    if (name.length < 2) return json(res, 422, { ok: false, field: 'name' });
    if (phone.replace(/\D/g, '').length < 10) return json(res, 422, { ok: false, field: 'phone' });
    const lead = {
      name, phone,
      format: d.format === 'pair' ? 'pair' : 'solo',
      interest: String(d.interest || '').trim().slice(0, 100),
      utm: d.utm && typeof d.utm === 'object' ? Object.fromEntries(Object.entries(d.utm).slice(0, 10).map(([k, v]) => [String(k).slice(0, 30), String(v).slice(0, 100)])) : {},
      message: String(d.message || '').trim().slice(0, 1000),
      createdAt: new Date().toISOString(),
    };
    fs.appendFile(LEADS, JSON.stringify(lead) + '\n', (err) => {
      if (err) return json(res, 500, { ok: false, error: 'write_failed' });
      console.log('New lead:', lead.name, lead.phone, lead.format);
      // TODO: forward to Telegram / email / CRM
      json(res, 200, { ok: true });
    });
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/api/lead') return handleLead(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false });

  let file = path.normalize(path.join(PUBLIC, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Сторінку не знайдено'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
