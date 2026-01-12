const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const XAI_API_KEY = process.env.XAI_API_KEY;

if (!XAI_API_KEY) {
  console.error('ERROR: XAI_API_KEY is not set in environment variables!');
}

const XAI_API_URL = 'https://api.x.ai/v1/images/generations';

app.post('/api/generate', async (req, res) => {
  const { prompt, style = 'realistic', count = 1 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await axios.post(
      XAI_API_URL,
      {
        model: 'grok-beta',           // update when new model names are released
        prompt: prompt,
        n: Math.min(count, 4),       // reasonable limit
        response_format: 'url',
        // style: style,             // may or may not be supported - check docs
      },
      {
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Generation error:', error?.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to generate image',
      details: error?.response?.data?.error?.message || error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', apiKeySet: !!XAI_API_KEY });
});

app.listen(port, () => {
  console.log(`Grok Imagine backend running on port ${port}`);
});
