export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { username, password } = body;

    const ADMIN_USER = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'techblaze2026';

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      // Create a simple signed token (base64 payload + secret hash)
      const payload = { admin: true, exp: Date.now() + 8 * 60 * 60 * 1000 }; // 8hr
      const payloadB64 = btoa(JSON.stringify(payload));
      const secret = process.env.JWT_SECRET || 'tb3secret';
      
      // Simple HMAC-SHA256 using Web Crypto API
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
      const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
      const token = `${payloadB64}.${sigB64}`;

      return new Response(JSON.stringify({ success: true, token }), { status: 200, headers: corsHeaders });
    } else {
      return new Response(JSON.stringify({ error: 'invalid_credentials' }), { status: 401, headers: corsHeaders });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: corsHeaders });
  }
}
