// local-dev.js
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
// Rate limiting for API endpoints – 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

app.use(cookieParser());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Main handler for all requests
app.all('/api/:resource/:action', async (req, res) => {
  const { resource, action } = req.params;
  const filePath = path.join(__dirname, 'api', resource, `${action}.js`);
  
  if (fs.existsSync(filePath)) {
    try {
      // Clear cache for development
      delete require.cache[require.resolve(filePath)];
      
      // Also clear lib/supabase cache to pick up .env changes
      const libPath = path.join(__dirname, 'api', 'lib', 'supabase.js');
      if (fs.existsSync(libPath)) {
        delete require.cache[require.resolve(libPath)];
      }

      const handler = require(filePath);
      await handler(req, res);
    } catch (err) {
      console.error(`Error in ${filePath}:`, err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'app')));

// Simple fallback for SPA
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `🚀 Gbé Tché local server running at http://localhost:${PORT}`);
});
// Trigger Vercel redeploy

