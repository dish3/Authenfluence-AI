# Authenfluence AI

Ratefluencer AI — We measure trust, not popularity.

Prototype link: https://authenfluence-ai.onrender.com/
Live demo: https://authenfluence-ai.onrender.com/

Authenfluence AI is a creator trust intelligence platform for brands, agencies, and creators. It combines YouTube data, engagement signals, fraud detection, and AI-powered reasoning to help users evaluate creator authenticity with clear, explainable trust scores.

## Why this project matters

- Focuses on trust, credibility, and audience quality instead of vanity metrics.
- Helps brands make better creator-selection decisions.
- Provides explainable insights for fraud, engagement quality, and content risk.

## Key features

- Creator discovery using real YouTube API data
- Trust score generation for frontend and reporting use
- Engagement and audience-quality analysis
- Fraud, spam, and suspicious activity detection
- Comment authenticity and signal analysis
- Creator comparison support
- PDF/report generation support

## Tech stack

- Frontend: React + TypeScript + Vite
- Routing: TanStack Router
- Styling: Tailwind-style UI components
- APIs: YouTube, Gemini, Groq, Hugging Face integrations
- Deployment: Render

## Project structure

```txt
authenfluence-ai/
+-- dev-server/
|   +-- src/
|   |   +-- components/          # UI and analysis views
|   |   +-- hooks/               # Reusable hooks
|   |   +-- lib/
|   |   |   +-- services/         # API and analysis services
|   |   |   +-- mock-data.ts
|   |   |   +-- report.ts
|   |   +-- routes/              # App pages and flows
|   |   +-- server.ts
|   |   +-- start.ts
|   +-- package.json
|   +-- tsconfig.json
|   +-- vite.config.ts
+-- README.md
```

## Quick start

From the project root:

```bash
cd dev-server
npm install
npm run dev
```

Create `dev-server/.env` for local API keys:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Do not commit `.env`.

## Deployment

The live application is available here:

https://authenfluence-ai.onrender.com/

## Team workflow

Use separate branches for each responsibility:

| Person | Branch | Responsibility |
| --- | --- | --- |
| P1 | `backend` | Backend APIs, YouTube integration, trust scoring |
| P2 | `ai` | AI prompts, Gemini logic, analysis |
| P3 | `frontend` | UI, pages, components, styling |
| P4 | `deploy-config` | Deployment, config, build setup |

Example backend workflow:

```bash
git checkout backend
git pull origin backend
```

Add only relevant backend files:

```bash
git add dev-server/src/lib/services/youtube.server.ts
git add dev-server/src/lib/services/scoring.ts
git add dev-server/src/lib/services/fraud.ts
```

Then commit and push:

```bash
git commit -m "P1: Added YouTube API integration"
git push origin backend
```

Avoid `git add .` unless the whole team agrees on the final commit scope.
