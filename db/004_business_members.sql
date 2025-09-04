-- Team members per business with roles
create table if not exists business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  uid text not null references users(uid) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  added_at timestamptz default now(),
  primary key (business_id, uid)
);

