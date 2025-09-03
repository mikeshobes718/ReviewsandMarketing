-- Users mirrored from Firebase (uid TEXT primary key)
create table if not exists users (
  uid text primary key,
  email text not null,
  created_at timestamptz default now()
);

-- Businesses owned by a user
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null references users(uid) on delete cascade,
  name text not null,
  google_place_id text,
  google_rating numeric,
  review_link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Customers (targets for outreach)
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text,
  email text,
  phone text,
  created_at timestamptz default now()
);

-- Outreach / review requests
create type if not exists request_status as enum ('queued','sent','clicked','reviewed','bounced','failed');
create type if not exists request_channel as enum ('email','sms');

create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  channel request_channel not null default 'email',
  status request_status not null default 'queued',
  google_place_id text,
  review_link text,
  provider_message_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stripe mapping and subscriptions
create table if not exists stripe_customers (
  uid text primary key references users(uid) on delete cascade,
  stripe_customer_id text unique not null
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  uid text not null references users(uid) on delete cascade,
  stripe_subscription_id text unique not null,
  plan_id text not null,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Email events log
create table if not exists email_log (
  id bigserial primary key,
  provider text not null,
  to_email text not null,
  template text,
  status text,
  provider_message_id text,
  payload jsonb,
  created_at timestamptz default now()
);

-- Webhook event log (idempotency)
create table if not exists webhook_events (
  id text primary key,
  type text,
  payload jsonb,
  created_at timestamptz default now()
);

-- Places cache
create table if not exists place_cache (
  place_id text primary key,
  data jsonb not null,
  fetched_at timestamptz default now()
);
