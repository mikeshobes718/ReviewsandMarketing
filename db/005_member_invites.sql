-- Pending invitations for business membership
create table if not exists member_invites (
  token text primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','member','viewer')),
  invited_by text references users(uid) on delete set null,
  invited_at timestamptz default now(),
  accepted_by text references users(uid) on delete set null,
  accepted_at timestamptz
);

