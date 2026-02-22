import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

async function verifyToken(token) {
  if (!token) return false;
  try {
    const [payloadB64, sigB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));
    if (!payload.admin || Date.now() > payload.exp) return false;

    const secret = process.env.JWT_SECRET || 'tb3secret';
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payloadB64));
  } catch { return false; }
}

export default async function handler(req) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!await verifyToken(token)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const sql = neon(process.env.DATABASE_URL);
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';

  try {
    // Stats — counts individual participants, not teams
    const statsRes = await sql`
      SELECT
        COUNT(*) as total_teams,
        COALESCE(SUM(team_size), 0) as total_members,
        COALESCE(SUM(
          (CASE WHEN p1_food='Vegetarian' THEN 1 ELSE 0 END) +
          (CASE WHEN p2_food='Vegetarian' THEN 1 ELSE 0 END) +
          (CASE WHEN p3_food='Vegetarian' THEN 1 ELSE 0 END) +
          (CASE WHEN p4_food='Vegetarian' THEN 1 ELSE 0 END)
        ), 0) as veg,
        COALESCE(SUM(
          (CASE WHEN p1_food='Non-Vegetarian' THEN 1 ELSE 0 END) +
          (CASE WHEN p2_food='Non-Vegetarian' THEN 1 ELSE 0 END) +
          (CASE WHEN p3_food='Non-Vegetarian' THEN 1 ELSE 0 END) +
          (CASE WHEN p4_food='Non-Vegetarian' THEN 1 ELSE 0 END)
        ), 0) as nonveg
      FROM registrations
    `;
    const stats = statsRes[0];

    // Rows with optional search
    let rows;
    if (q) {
      rows = await sql`
        SELECT * FROM registrations
        WHERE team ILIKE ${'%' + q + '%'}
           OR college ILIKE ${'%' + q + '%'}
           OR p1 ILIKE ${'%' + q + '%'}
           OR ref_id ILIKE ${'%' + q + '%'}
        ORDER BY id DESC
      `;
    } else {
      rows = await sql`SELECT * FROM registrations ORDER BY id DESC`;
    }

    return new Response(JSON.stringify({ stats, rows }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'db_error', message: err.message }), { status: 500, headers: corsHeaders });
  }
}
