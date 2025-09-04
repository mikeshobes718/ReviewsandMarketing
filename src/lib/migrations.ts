import { Pool } from 'pg';

function getProjectRef(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.host; // e.g., rhnxzpbhoqbvoqyqmfox.supabase.co
    const parts = host.split('.');
    return parts[0] || null;
  } catch {
    return null;
  }
}

export async function runSupabaseMigrations(): Promise<{ ran: string[] }> {
  const supaUrl = process.env.SUPABASE_URL || '';
  const ref = getProjectRef(supaUrl) || '';
  const host = ref ? `db.${ref}.supabase.co` : process.env.SUPABASE_DB_HOST || '';
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || '';
  if (!host || !password) throw new Error('Missing DB host or password for migrations');

  const pool = new Pool({
    host,
    port: 5432,
    user: 'postgres',
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    const ran: string[] = [];
    const sql004 = `
create table if not exists business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  uid text not null references users(uid) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  added_at timestamptz default now(),
  primary key (business_id, uid)
);
`;
    const sql005 = `
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
`;
    await client.query('begin');
    await client.query(sql004); ran.push('004_business_members');
    await client.query(sql005); ran.push('005_member_invites');
    await client.query('commit');
    return { ran };
  } catch (e) {
    try { await client.query('rollback'); } catch {}
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

