# Grok Reimagine for All Region

Simple web interface for generating images & short videos using xAI Grok API  
**No sign-in • Free tier • Basic region proxy via backend**

**Current status:** Very early MVP / Proof of concept

## Features planned
- Text → Image generation
- Text → Short video generation (when available)
- Backend proxy (helps bypass some regional blocks)
- Very simple, no-auth frontend

## Tech stack
- Frontend: React (Create React App)
- Backend: Node.js + Express
- AI: xAI Grok image generation API

## Important notes
You **must** provide your own xAI API key in backend/.env  
The API is **not free** after trial/credits run out

## Deployment recommendation
1. Deploy backend to Render / Railway / Fly.io / Vercel Serverless Functions
2. Deploy frontend to Vercel / Netlify / Cloudflare Pages
