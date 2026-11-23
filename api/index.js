export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;
  if (path === '/api/health' || path === '/api/health/') {
    return res.status(200).json({ ok: true, version: 'V71-api-folder', time: new Date().toISOString() });
  }
  return res.status(200).json({ ok: true, message: 'OddsGPT backend alive', path });
}
