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

## Team Workflow

Authenfluence AI uses a protected `main` branch and pull-request based development.
See [docs/GITHUB_WORKFLOW.md](docs/GITHUB_WORKFLOW.md) for the full team workflow,
branch protection checklist, CODEOWNERS setup, and Git commands.

| Person | Branch | Responsibility |
| --- | --- | --- |
| P1 `@dish3` | `feature/backend-api` | Backend APIs, YouTube API integration, trust scoring |
| P2 `@avyuktshuklaa` | `feature/ai-engine` | AI prompts, Gemini logic, AI analysis |
| P3 | `feature/frontend-ui` | UI, pages, components, styling |
| P4 | `feature/analytics-engine` | Fraud signals, analytics, reports |

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
+-- CODEOWNERS
+-- docs/
+-- .github/
```

Target production structure:

```txt
Authenfluence-AI/
+-- frontend/
+-- backend/
+-- docs/
+-- .github/
+-- README.md
+-- .gitignore
+-- CODEOWNERS
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

## Core Git Rule

Do not push directly to `main`. Create a feature branch, push it, open a pull
request, and request review from `@dish3` or `@avyuktshuklaa`.
