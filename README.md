# Authenfluence AI

Authenfluence AI is a creator trust intelligence platform for brands and agencies. It helps evaluate creator authenticity using YouTube data, engagement patterns, fraud signals, comment quality, and explainable trust scoring.

## Main Features

- Creator search using real YouTube API data
- Trust score JSON response for frontend use
- Engagement and audience-quality analysis
- Fraud and suspicious activity signal detection
- Comment authenticity analysis
- Creator comparison support
- PDF/report generation support

## Team Branches

Use separate branches so each person works only in their assigned area:

| Person | Branch | Responsibility |
| --- | --- | --- |
| P1 | `backend` | Backend APIs, YouTube API integration, trust scoring |
| P2 | `ai` | AI prompts, Gemini logic, AI analysis |
| P3 | `frontend` | UI, pages, components, styling |
| P4 | `deploy-config` | Deployment, config, build setup |

## Project Structure

```txt
authenfluence-ai/
+-- dev-server/
|   +-- src/
|   |   +-- components/          # Frontend UI components
|   |   +-- hooks/               # Frontend hooks
|   |   +-- lib/
|   |   |   +-- services/
|   |   |   |   +-- youtube.server.ts
|   |   |   |   +-- scoring.ts
|   |   |   |   +-- fraud.ts
|   |   |   |   +-- gemini.server.ts
|   |   |   +-- mock-data.ts
|   |   |   +-- report.ts
|   |   +-- routes/              # App routes/pages
|   |   +-- server.ts
|   |   +-- start.ts
|   +-- package.json
|   +-- tsconfig.json
|   +-- vite.config.ts
+-- README.md
```

## Local Setup

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

## Backend Workflow

P1 should work on the backend branch:

```bash
git checkout backend
git pull origin backend
```

Add only backend files:

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

Avoid `git add .` unless the whole team agrees on what should be committed.
