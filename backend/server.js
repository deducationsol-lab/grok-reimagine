const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Very basic in-memory rate limit (protect public abuse)
const requestLog = new Map(); // ip → {count, timestamp}

app.post('/api/generate', async (req, res) => {
  const { prompt, type = 'image' } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
    return res.status(400).json({ error: 'Valid prompt required (min 5 chars)' });
  }

  // Rate limit: ~8 req/min per IP (simple protection)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const userData = requestLog.get(ip) || { count: 0, reset: now + 60000 };

  if (now > userData.reset) {
    userData.count = 0;
    userData.reset = now + 60000;
  }

  if (userData.count >= 8) {
    return res.status(429).json({ error: 'Rate limit: 8 requests per minute' });
  }
  userData.count++;
  requestLog.set(ip, userData);

  try {
    let imageUrl = null;

    // Fallback 1: Try Craiyon reverse-engineered public endpoint (slow, but free/no key)
    try {
      const craiyonResponse = await axios.post(
        'https://backend.craiyon.com/generate',
        { prompt: prompt.trim() },
        { timeout: 60000 }
      );
      // Craiyon usually returns array of base64 or urls in response.data.images
      if (craiyonResponse.data?.images?.[0]) {
        imageUrl = `data:image/png;base64,${craiyonResponse.data.images[0]}`;
      }
    } catch (e) {
      console.log('Craiyon failed:', e.message);
    }

    // Fallback 2: Pollinations legacy-style (if still works in your region)
    if (!imageUrl) {
      try {
        const encoded = encodeURIComponent(prompt.trim());
        imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=flux&seed=${Date.now()}`;
        
        // Quick head check if URL likely works
        await axios.head(imageUrl, { timeout: 8000 });
      } catch (e) {
        console.log('Pollinations legacy failed:', e.message);
      }
    }

    // Fallback 3: Any other public proxy (example placeholder - replace if you find working one)
    // e.g. some Replit-hosted wrappers, but they change often

    if (!imageUrl) {
      return res.status(503).json({
        error: 'All free public image services are currently unavailable or rate-limited',
        suggestion: 'Try again later or consider client-side Puter.js integration'
      });
    }

    // For video → no reliable free public endpoint exists right now
    if (type === 'video') {
      return res.status(501).json({
        error: 'Free public text-to-video generation not available yet (2026)',
        note: 'Most services require API keys / credits (Runway, Kling, Pika, etc.)'
      });
    }

    // Return direct image URL (frontend can <img src={imageUrl}>)
    res.json({
      success: true,
      url: imageUrl,
      source: imageUrl.includes('pollinations') ? 'Pollinations' : 'Craiyon',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generation error:', error.message);
    res.status(500).json({
      error: 'Image generation failed',
      details: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', services: 'Multiple free public image APIs (Craiyon + Pollinations fallback)' });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port} • Free public multi-API proxy mode`);
});
