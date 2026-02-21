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

function csvEscape(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export default async function handler(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!await verifyToken(token)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM registrations ORDER BY id ASC`;

  const headers = ['Ref ID','Team','College','Size','P1 Name','P1 Phone','P1 Email','P1 Food','P2 Name','P2 Phone','P2 Email','P2 Food','P3 Name','P3 Phone','P3 Email','P3 Food','P4 Name','P4 Phone','P4 Email','P4 Food','Medical','Registered At'];

  const csvRows = [headers.join(',')];
  for (const r of rows) {
    csvRows.push([
      r.ref_id, r.team, r.college, r.team_size,
      r.p1, r.p1_phone, r.p1_email, r.p1_food,
      r.p2, r.p2_phone, r.p2_email, r.p2_food,
      r.p3, r.p3_phone, r.p3_email, r.p3_food,
      r.p4, r.p4_phone, r.p4_email, r.p4_food,
      r.medical, r.created_at
    ].map(csvEscape).join(','));
  }

  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return new Response(csvRows.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="techblaze3_${now}.csv"`,
    }
  });
}
