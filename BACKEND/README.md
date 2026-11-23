# OddsGPT Backend V70 — Deploy Steps
1. GitHub repo oddsgpt-backend → Upload EXTRACTED files (not zip) → Commit api/ + lib/ + package.json + index.html + .npmrc + schema.sql
2. Vercel → Import GitHub oddsgpt-backend → Framework: Other → Node 22.x → Clear Build Cache → Deploy → Must show Ready
3. Vercel Env (oddsgpt-backend): PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, API_FOOTBALL_KEY (optional), OPENAI_API_KEY (tomorrow)
4. Paystack Dashboard: Webhook URL https://oddsgpt-backend.vercel.app/api/paystack-webhook → Enable charge.success → Fees: Merchant pays
5. Supabase: Run schema.sql (payments + payment_audit + plan_prices)
6. Test: /api/health, /api/football-today, /api/nba-today, /api/sportybet-code, Paystack DAILY ₦300 popup test
Frontend repo oddsgpt → Upload frontend/index.html → Deploy → Hard refresh → Footer must be OddsGPT © 2026
