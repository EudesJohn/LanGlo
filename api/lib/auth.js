// api/lib/auth.js
const supabase = require('./supabase');

async function extractToken(req) {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  if (req.headers.cookie) {
    try {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const parts = cookie.split('=');
        if (parts[0]) {
          acc[parts[0].trim()] = (parts[1] || '').trim();
        }
        return acc;
      }, {});
      if (cookies.token) {
        return cookies.token;
      }
    } catch (err) {
      console.error("Manual cookie parsing error:", err);
    }
  }

  return null;
}

async function verifyUser(req) {
  const token = await extractToken(req);
  if (!token) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
}

async function verifyAdmin(req) {
  const token = await extractToken(req);
  if (!token) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError || !dbUser) {
      console.warn("ADMIN API WARNING: User not found in public.users table.");
      return null;
    }

    if (dbUser.role !== 'admin') {
      console.warn(`ADMIN API WARNING: User ${user.email} attempted admin action without admin role (role: ${dbUser.role}).`);
      return null;
    }

    return user;
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
}

// Polyfill Express-like cookie methods for Vercel serverless (no Express)
function setCookie(res, name, value, options = {}) {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.sameSite === 'strict') cookie += '; SameSite=Strict';
  if (options.sameSite === 'lax') cookie += '; SameSite=Lax';
  if (options.secure !== false) cookie += '; Secure';
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.maxAge) cookie += `; Max-Age=${Math.floor(options.maxAge / 1000)}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  // Attach to existing Set-Cookie headers if any
  const existing = res.getHeader('Set-Cookie');
  if (existing) {
    res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : [existing]), cookie]);
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

function clearCookie(res, name, options = {}) {
  const expires = new Date(0);
  let cookie = `${encodeURIComponent(name)}=; Expires=${expires.toUTCString()}`;
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.sameSite === 'strict') cookie += '; SameSite=Strict';
  if (options.sameSite === 'lax') cookie += '; SameSite=Lax';
  if (options.secure !== false) cookie += '; Secure';
  if (options.path) cookie += `; Path=${options.path}`;
  const existing = res.getHeader('Set-Cookie');
  if (existing) {
    res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : [existing]), cookie]);
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

module.exports = {
  verifyAdmin,
  verifyUser,
  setCookie,
  clearCookie
};
