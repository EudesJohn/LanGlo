// api/lib/auth.js
const supabase = require('./supabase');

async function verifyAdmin(req) {
  let token = null;

  // 1. Check cookies (populated by cookie-parser or Vercel helpers)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Check Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 3. Fallback manually parsing req.headers.cookie
  if (!token && req.headers.cookie) {
    try {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const parts = cookie.split('=');
        if (parts[0]) {
          acc[parts[0].trim()] = (parts[1] || '').trim();
        }
        return acc;
      }, {});
      if (cookies.token) {
        token = cookies.token;
      }
    } catch (err) {
      console.error("Manual cookie parsing error:", err);
    }
  }

  if (!token) {
    console.warn("ADMIN API WARNING: No token found in request headers or cookies.");
    return null;
  }

  try {
    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.warn("ADMIN API WARNING: Invalid token or user not found. Error:", error?.message);
      return null;
    }

    // Retrieve user details from the database public.users table to verify role
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError || !dbUser) {
      // Fallback: check user metadata if public.users is not synced
      if (user.user_metadata && user.user_metadata.role === 'admin') {
        return user;
      }
      console.warn("ADMIN API WARNING: User not found in public.users table and no admin metadata found.");
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
  verifyAdmin
};
