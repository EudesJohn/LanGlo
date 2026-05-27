// api/lib/rateLimit.js
// Best-effort in-memory rate limiter for Vercel serverless functions.
// Note: each cold start resets counters. For production with multiple instances,
// this is a deterrent, not a hard guarantee. Pair with Vercel Firewall for strict limits.

const requests = new Map();

module.exports = function rateLimit({ windowMs = 60000, max = 100 } = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.socket?.remoteAddress
      || 'unknown';

    const now = Date.now();
    const windowStart = now - windowMs;
    let hits = requests.get(ip) || [];

    // Remove expired entries
    hits = hits.filter(t => t > windowStart);

    if (hits.length >= max) {
      res.status(429).json({ error: 'Trop de requêtes. Veuillez réessayer plus tard.' });
      return true; // signaled blocked
    }

    hits.push(now);
    requests.set(ip, hits);

    // Clean up old entries periodically
    if (requests.size > 10000) {
      for (const [key, timestamps] of requests) {
        const valid = timestamps.filter(t => t > Date.now() - windowMs);
        if (valid.length === 0) requests.delete(key);
        else requests.set(key, valid);
      }
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - hits.length));
    return false;
  };
};
