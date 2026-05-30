// api/lib/rateLimit.js
// Simple in-memory rate limiter for Vercel serverless functions.
// Note: in-memory = par instance. En production avec plusieurs instances,
// chaque instance a son compteur. Suffisant pour ralentir les attaques basiques.

const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

// Nettoyage périodique toutes les 5 minutes
if (!globalThis.__rateLimitCleanup) {
  globalThis.__rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (now - entry.start > WINDOW_MS) attempts.delete(key);
    }
  }, 5 * 60 * 1000);
  if (globalThis.__rateLimitCleanup.unref) {
    globalThis.__rateLimitCleanup.unref();
  }
}

function rateLimit(req, { max = MAX_ATTEMPTS, windowMs = WINDOW_MS } = {}) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';

  const action = req.params?.action || req.query?.action || req.url.split('/').pop().split('?')[0];
  const key = `${ip}:${action}`;
  const now = Date.now();

  const entry = attempts.get(key);
  if (!entry || now - entry.start > windowMs) {
    attempts.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count++;
  if (entry.count > max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((windowMs - (now - entry.start)) / 1000) };
  }

  return { allowed: true, remaining: max - entry.count };
}

module.exports = { rateLimit };
