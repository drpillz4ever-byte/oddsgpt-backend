# OddsGPT Backend V71 FLAT - No folders needed

Why flat? GitHub web upload flattens folders (api/index.js becomes index.js).
This version puts the single function at BACKEND/index.js, not BACKEND/api/index.js.
Vercel builds index.js as the only function via vercel.json builds.

Files (all flat, drag all together):
- index.js = single function, handles ALL endpoints: /api/health, /api/auth-login, /api/auth-register, /api/auth-verify, /api/auth-forgot, /api/football-today, /api/nba-today, /api/ai-pick, /api/paystack-initialize, /api/paystack-verify, /api/paystack-webhook, /api/payments, /api/admin-payments, /api/cleanup-pending, /api/sportybet-code
- package.json
- vercel.json (builds index.js, rewrites /api/* -> /index.js)
- schema.sql
- README.md

Plans exact: FREE 0, BANGER 100 (1/day, note BANGER is for fun, small stake only, NO % , NO WhatsApp VIP), QUICK_WIN 200, DAILY_HUSTLE 300, TRY_AM 500, SHARP_GUY 2000, BABA_NLA 5000
Deploy: BACKEND folder, Root Directory BACKEND, Node 22.x, Env SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY
Webhook: https://oddsgpt-backend.vercel.app/api/paystack-webhook
