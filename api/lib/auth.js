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

module.exports = {
  verifyAdmin,
  verifyUser
};
