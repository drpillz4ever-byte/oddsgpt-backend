
-- OddsGPT Backend V71 - Supabase schema
CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT, phone TEXT, full_name TEXT, is_admin BOOLEAN DEFAULT FALSE, verified BOOLEAN DEFAULT FALSE, verify_code TEXT, verify_expires TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, plan TEXT NOT NULL, start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ, paystack_reference TEXT, source TEXT DEFAULT 'paystack', granted_by TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE SET NULL, email TEXT NOT NULL, plan TEXT NOT NULL, amount INTEGER NOT NULL, reference TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'pending', verified_at TIMESTAMPTZ, end_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS payment_audit (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference TEXT NOT NULL, email TEXT NOT NULL, plan TEXT NOT NULL, amount INTEGER NOT NULL, event TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS plan_prices (plan TEXT PRIMARY KEY, price INTEGER NOT NULL, currency TEXT DEFAULT 'NGN', updated_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO plan_prices (plan, price) VALUES ('FREE',0),('BANGER',100),('QUICK_WIN',200),('DAILY_HUSTLE',300),('TRY_AM',500),('SHARP_GUY',2000),('BABA_NLA',5000) ON CONFLICT (plan) DO UPDATE SET price=EXCLUDED.price;
CREATE TABLE IF NOT EXISTS booking_codes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE, share_code TEXT, share_url TEXT, picks JSONB, total_odds NUMERIC, plan TEXT, is_banger BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE users ENABLE ROW LEVEL SECURITY; ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY; ALTER TABLE payments ENABLE ROW LEVEL SECURITY; ALTER TABLE booking_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "service_role_all_users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_subs" ON subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service_role_all_codes" ON booking_codes FOR ALL USING (true) WITH CHECK (true);
