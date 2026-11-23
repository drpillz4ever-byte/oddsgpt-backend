-- OddsGPT Settlement / Payments History — Supabase
create table if not exists payments (
 id uuid primary key default gen_random_uuid(),
 reference text unique not null, user_id text not null, user_email text not null,
 plan text not null, amount_kobo int not null, currency text default 'NGN',
 status text default 'pending', channel text, paystack_transaction_id text, paystack_access_code text,
 created_at timestamptz default now(), paid_at timestamptz, plan_starts_at timestamptz, plan_expires_at timestamptz,
 raw_event jsonb, refund_amount_kobo int, refund_reason text, refunded_by text, refunded_at timestamptz,
 manual_activation_note text, manual_activated_by text, admin_note text
);
create table if not exists payment_audit (
 id uuid primary key default gen_random_uuid(), payment_id uuid references payments(id),
 reference text not null, action text not null, actor text, detail text, created_at timestamptz default now()
);
create table if not exists plan_prices (plan text primary key, price_kobo int not null, duration_days int not null);
insert into plan_prices values ('FREE',0,0),('BANGER',10000,0),('QUICK',20000,0),('DAILY',30000,1),('TRYAM',50000,3),('SHARP',200000,7),('BABA',500000,30) on conflict (plan) do update set price_kobo=excluded.price_kobo;
create index if not exists idx_payments_ref on payments(reference);
create index if not exists idx_payments_email on payments(user_email);
