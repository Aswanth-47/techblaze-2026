import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

const PHONE_REGEX = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function clean(val) {
  return (val || '').toString().trim().replace(/[<>"']/g, '');
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const origin = req.headers.get('origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await req.json();

    const team      = clean(body.team);
    const college   = clean(body.college);
    const team_size = parseInt(body.team_size) || 1;
    const medical   = clean(body.medical);

    const p1       = clean(body.p1);
    const p1_phone = clean(body.p1_phone);
    const p1_email = clean(body.p1_email).toLowerCase();
    const p1_food  = clean(body.p1_food);

    const p2       = clean(body.p2);
    const p2_phone = clean(body.p2_phone);
    const p2_email = clean(body.p2_email).toLowerCase();
    const p2_food  = clean(body.p2_food);

    const p3       = clean(body.p3);
    const p3_phone = clean(body.p3_phone);
    const p3_email = clean(body.p3_email).toLowerCase();
    const p3_food  = clean(body.p3_food);

    const p4       = clean(body.p4);
    const p4_phone = clean(body.p4_phone);
    const p4_email = clean(body.p4_email).toLowerCase();
    const p4_food  = clean(body.p4_food);

    // ─── Validate required fields ───
    if (!team || !college || !p1 || !p1_phone || !p1_email || !p1_food) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: corsHeaders });
    }

    if (!PHONE_REGEX.test(p1_phone)) {
      return new Response(JSON.stringify({ error: 'invalid_phone' }), { status: 400, headers: corsHeaders });
    }

    if (!EMAIL_REGEX.test(p1_email)) {
      return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders });
    }

    // Validate optional members
    const optionals = [
      { phone: p2_phone, email: p2_email, name: p2 },
      { phone: p3_phone, email: p3_email, name: p3 },
      { phone: p4_phone, email: p4_email, name: p4 },
    ];

    for (const m of optionals) {
      if (m.phone && !PHONE_REGEX.test(m.phone)) {
        return new Response(JSON.stringify({ error: 'invalid_phone' }), { status: 400, headers: corsHeaders });
      }
      if (m.email && !EMAIL_REGEX.test(m.email)) {
        return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400, headers: corsHeaders });
      }
    }

    const sql = neon(process.env.DATABASE_URL);

    // ─── Ensure table exists ───
    await sql`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        ref_id TEXT,
        team TEXT NOT NULL,
        college TEXT NOT NULL,
        team_size INT NOT NULL,
        p1 TEXT, p1_phone TEXT, p1_email TEXT, p1_food TEXT,
        p2 TEXT, p2_phone TEXT, p2_email TEXT, p2_food TEXT,
        p3 TEXT, p3_phone TEXT, p3_email TEXT, p3_food TEXT,
        p4 TEXT, p4_phone TEXT, p4_email TEXT, p4_food TEXT,
        medical TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // ─── Duplicate check ───
    const dup = await sql`
      SELECT id FROM registrations
      WHERE p1_phone = ${p1_phone} OR p1_email = ${p1_email}
      LIMIT 1
    `;

    if (dup.length > 0) {
      return new Response(JSON.stringify({ error: 'duplicate' }), { status: 409, headers: corsHeaders });
    }

    // ─── Insert ───
    const result = await sql`
      INSERT INTO registrations
        (team, college, team_size,
         p1, p1_phone, p1_email, p1_food,
         p2, p2_phone, p2_email, p2_food,
         p3, p3_phone, p3_email, p3_food,
         p4, p4_phone, p4_email, p4_food,
         medical)
      VALUES
        (${team}, ${college}, ${team_size},
         ${p1}, ${p1_phone}, ${p1_email}, ${p1_food},
         ${p2||null}, ${p2_phone||null}, ${p2_email||null}, ${p2_food||null},
         ${p3||null}, ${p3_phone||null}, ${p3_email||null}, ${p3_food||null},
         ${p4||null}, ${p4_phone||null}, ${p4_email||null}, ${p4_food||null},
         ${medical||null})
      RETURNING id
    `;

    const newId = result[0].id;
    const ref_id = 'TB3-' + String(newId).padStart(4, '0');

    await sql`UPDATE registrations SET ref_id = ${ref_id} WHERE id = ${newId}`;

    return new Response(JSON.stringify({
      success: true,
      ref_id,
      team,
      leader: p1,
      email: p1_email,
      team_size,
      college,
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('Register error:', err);
    return new Response(JSON.stringify({ error: 'server_error', message: err.message }), {
      status: 500, headers: corsHeaders
    });
  }
}
