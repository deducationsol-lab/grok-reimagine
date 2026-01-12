// backend/server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Simple in-memory rate limit (very basic – 10 req/min per IP)
// In production → use express-rate-limit package or redis
const requestLog = new Map(); // ip → {count, timestamp}

app.post('/api/generate', async (req, res) => {
  const { prompt, width = 1024, height = 1024, model = 'flux', seed, nologo = true } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.length < 5) {
    return res.status(400).json({ error: 'Valid prompt is required (min 5 chars)' });
  }

  // Very basic rate limiting (protect public abuse)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const userData = requestLog.get(ip) || { count: 0, resetTime: now + 60000 };

  if (now > userData.resetTime) {
    userData.count = 0;
    userData.resetTime = now + 60000; // 1 minute window
  }

  if (userData.count >= 10) { // 10 requests per minute max
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in 1 minute.' });
  }

  userData.count++;
  requestLog.set(ip, userData);

  try {
    // Build Pollinations.ai URL
    let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    const params = new URLSearchParams();
    if (width) params.append('width', width);
    if (height) params.append('height', height);
    if (model) params.append('model', model);           // flux, turbo, anything, etc.
    if (seed) params.append('seed', seed);
    if (nologo) params.append('nologo', 'true');

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Fetch the image
    const response = await axios.get(url, {
      responseType: 'arraybuffer', // Get raw binary
      timeout: 45000               // 45s timeout – generations can be slow
    });

    // Send image back to client
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
    res.send(response.data);

  } catch (error) {
    console.error('Pollinations error:', error.message);
    const status = error.response?.status || 500;
    res.status(status).json({
      error: 'Image generation failed',
      details: error.message.includes('timeout') ? 'Generation timeout' : 'Service unavailable'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', using: 'pollinations.ai public endpoint' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port} • Using Pollinations.ai public API`);
});
