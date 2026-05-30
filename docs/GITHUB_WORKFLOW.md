# Authenfluence-AI GitHub Workflow

This guide defines the production-grade GitHub workflow for the 4-member Authenfluence-AI hackathon team.

## 1. GitHub Architecture

Recommended repository:

```txt
Authenfluence-AI/
|-- frontend/
|-- backend/
|-- docs/
|   `-- GITHUB_WORKFLOW.md
|-- .github/
|   `-- PULL_REQUEST_TEMPLATE.md
|-- README.md
|-- .gitignore
`-- CODEOWNERS
```

Current note: the existing application code is under `dev-server/`. Keep it there until the team intentionally migrates it into `frontend/` and `backend/` so active hackathon work is not broken by a folder move.

## 2. Organization And Repository Plan

Create a GitHub Organization for the team if the project will continue beyond the hackathon. Use a single private or public repository named `Authenfluence-AI`.

Recommended teams:

| Team | Members | Repository permission | Purpose |
| --- | --- | --- | --- |
| `maintainers` | `@dish3`, `@avyuktshuklaa` | Maintain or Admin | Review, approve, configure, and merge PRs |
| `contributors` | P3, P4 | Write | Create branches, push code, and open PRs |

Repository roles:

| Member | Role | Why |
| --- | --- | --- |
| `@dish3` | Admin | Team lead and owner. Needs full access to settings, branch protection, secrets, collaborators, and emergency fixes. |
| `@avyuktshuklaa` | Maintain | Co-maintainer. Can manage issues, PRs, branches, and releases without unrestricted ownership-level control. Use Admin only if Krishna must edit repository settings or branch protection directly. |
| P3 | Write | Can push branches and open PRs, but cannot bypass protected `main`. |
| P4 | Write | Can push branches and open PRs, but cannot bypass protected `main`. |

Do not grant Admin to all teammates. For a hackathon, this keeps velocity high while protecting the final demo branch.

## 3. Repository Settings Checklist

In GitHub repository settings:

- General -> Pull Requests:
  - Enable `Allow squash merging`
  - Disable `Allow merge commits`
  - Disable `Allow rebase merging` unless the team explicitly wants it
  - Enable `Automatically delete head branches`
- Collaborators and teams:
  - Add `@dish3` as Admin
  - Add `@avyuktshuklaa` as Maintain, or Admin if repository settings access is required
  - Add P3 as Write
  - Add P4 as Write
- Branches:
  - Add a branch protection rule for `main`
- Rulesets, if available:
  - Prefer a repository ruleset targeting `main` for stronger enforcement

## 4. Branch Protection For `main`

Create a branch protection rule with branch name pattern:

```txt
main
```

Required settings:

- Require a pull request before merging: enabled
- Required approvals: `1` minimum for hackathon speed, `2` if both maintainers must approve every PR
- Dismiss stale pull request approvals when new commits are pushed: enabled
- Require review from Code Owners: enabled
- Require conversation resolution before merging: enabled
- Require status checks to pass before merging: enabled once CI exists
- Require branches to be up to date before merging: enabled once CI exists
- Restrict who can push to matching branches: enabled
- Allowed push actors: only `@dish3` and `@avyuktshuklaa` if GitHub requires an actor list; do not use this for normal development
- Allow force pushes: disabled
- Allow deletions: disabled
- Do not allow bypassing the above settings: enabled for everyone except emergency admins if your plan supports it

Expected result:

- Nobody pushes directly to `main`.
- P3 and P4 can create branches, push code, and open PRs.
- `@dish3` and `@avyuktshuklaa` are automatically requested through `CODEOWNERS`.
- Only maintainers should approve and merge PRs.

Important GitHub behavior: branch protection controls pushes and merge requirements. Repository role permissions control who can click merge. Use Write for P3/P4 and Maintain/Admin for P1/P2 so only maintainers are responsible for merging.

## 5. CODEOWNERS

Place `CODEOWNERS` at the repository root:

```txt
* @dish3 @avyuktshuklaa
```

This means every changed file requires review from one of the listed code owners when `Require review from Code Owners` is enabled for `main`.

Alternative valid locations are `.github/CODEOWNERS` or `docs/CODEOWNERS`, but root is easiest to discover.

## 6. Branch Strategy

Permanent branch:

| Branch | Purpose | Access |
| --- | --- | --- |
| `main` | Stable demo and production-ready code | Protected; PR-only |

Working branches:

| Branch | Owner | Responsibility |
| --- | --- | --- |
| `feature/frontend-ui` | P3 | UI, pages, components, styling, responsive fixes |
| `feature/backend-api` | P1 `@dish3` | API routes, server logic, data integrations |
| `feature/analytics-engine` | P4 | Fraud signals, scoring, analytics, reports |
| `feature/ai-engine` | P2 `@avyuktshuklaa` | Gemini prompts, AI analysis, model response handling |

Rules:

- Branch from latest `main`.
- Keep feature branches small and focused.
- Open PRs early as drafts if work is still in progress.
- Merge to `main` only after approval and resolved conversations.
- Delete merged feature branches.

## 7. Merge Strategy

Use Squash Merge.

Why it is best for this hackathon:

- Keeps `main` history clean and demo-ready.
- Lets teammates commit freely on feature branches.
- Makes rollback easier because each PR becomes one logical commit.
- Avoids noisy merge commits during fast collaboration.

Avoid Rebase Merge for this team unless everyone is comfortable rewriting local history. Avoid Merge Commit for the hackathon because it makes the final history harder to scan.

## 8. Git Commands

Replace the repository URL if your local remote uses different capitalization:

```bash
git clone https://github.com/dish3/Authenfluence-AI.git
cd Authenfluence-AI
```

### P1: `@dish3`

```bash
git clone https://github.com/dish3/Authenfluence-AI.git
cd Authenfluence-AI
git switch main
git pull origin main
git switch -c feature/backend-api
```

Commit and push:

```bash
git status
git add backend/ dev-server/src/lib/ dev-server/src/routes/
git commit -m "feat(backend): add creator analysis API"
git push -u origin feature/backend-api
```

Create PR:

```bash
gh pr create --base main --head feature/backend-api --title "feat: add backend analysis API" --body "Adds backend API work for creator trust analysis."
```

After approval, merge with squash:

```bash
gh pr merge --squash --delete-branch
```

### P2: `@avyuktshuklaa`

```bash
git clone https://github.com/dish3/Authenfluence-AI.git
cd Authenfluence-AI
git switch main
git pull origin main
git switch -c feature/ai-engine
```

Commit and push:

```bash
git status
git add dev-server/src/lib/services/gemini.server.ts dev-server/src/lib/analyze.functions.ts
git commit -m "feat(ai): improve creator authenticity reasoning"
git push -u origin feature/ai-engine
```

Create PR:

```bash
gh pr create --base main --head feature/ai-engine --title "feat: improve AI authenticity engine" --body "Updates AI analysis prompts and response handling."
```

After approval, merge with squash:

```bash
gh pr merge --squash --delete-branch
```

### P3

```bash
git clone https://github.com/dish3/Authenfluence-AI.git
cd Authenfluence-AI
git switch main
git pull origin main
git switch -c feature/frontend-ui
```

Commit and push:

```bash
git status
git add frontend/ dev-server/src/components/ dev-server/src/routes/ dev-server/src/styles.css
git commit -m "feat(frontend): add creator analysis dashboard"
git push -u origin feature/frontend-ui
```

Create PR:

```bash
gh pr create --base main --head feature/frontend-ui --title "feat: add frontend dashboard" --body "Adds the main creator analysis UI."
```

P3 should not merge. Request review from `@dish3` or `@avyuktshuklaa`.

### P4

```bash
git clone https://github.com/dish3/Authenfluence-AI.git
cd Authenfluence-AI
git switch main
git pull origin main
git switch -c feature/analytics-engine
```

Commit and push:

```bash
git status
git add dev-server/src/lib/services/fraud.ts dev-server/src/lib/services/scoring.ts dev-server/src/lib/report.ts
git commit -m "feat(analytics): add fraud signal scoring"
git push -u origin feature/analytics-engine
```

Create PR:

```bash
gh pr create --base main --head feature/analytics-engine --title "feat: add analytics scoring engine" --body "Adds scoring and fraud signal analytics."
```

P4 should not merge. Request review from `@dish3` or `@avyuktshuklaa`.

## 9. Daily Team Workflow

Start work:

```bash
git switch main
git pull origin main
git switch feature/your-branch
git merge main
```

Before pushing:

```bash
git status
git diff
git pull origin feature/your-branch
git push
```

Before opening PR:

```bash
git switch main
git pull origin main
git switch feature/your-branch
git merge main
```

Resolve conflicts locally, run tests, then push again.

## 10. Naming Conventions

Branch names:

```txt
feature/frontend-ui
feature/backend-api
feature/analytics-engine
feature/ai-engine
fix/search-empty-state
docs/github-workflow
chore/project-config
```

PR titles:

```txt
feat(frontend): add creator analysis dashboard
feat(backend): add YouTube profile lookup
feat(ai): improve authenticity explanation
fix(analytics): handle missing engagement data
docs(workflow): add GitHub team process
```

Commit messages:

```txt
feat(scope): short present-tense summary
fix(scope): short present-tense summary
docs(scope): short present-tense summary
test(scope): short present-tense summary
chore(scope): short present-tense summary
```

Examples:

```txt
feat(frontend): add comparison view
fix(api): validate missing channel id
docs(workflow): add branch protection checklist
```

## 11. Security Setup

The repository `.gitignore` excludes:

| Pattern | Why |
| --- | --- |
| `node_modules/` | Dependencies are installed from lockfiles and should not be committed. |
| `.env` | Contains local secrets such as API keys. |
| `*.env` | Prevents accidental commits of environment-specific secrets. |
| `dist/` | Generated production build output. |
| `.vscode/` | Local editor settings should not affect the team unless intentionally shared. |
| `coverage/` | Generated test coverage output. |
| `*.log` | Runtime/debug logs can leak secrets and add noise. |

Never commit API keys. Store production secrets in GitHub Actions secrets or the deployment provider.

## 12. Merge Conflict Prevention

- Pull latest `main` before creating a branch.
- Keep PRs under one feature or fix.
- Avoid multiple teammates editing the same file at the same time.
- Announce ownership of shared files like router files, config files, and scoring logic.
- Merge `main` into your feature branch before requesting final review.
- Resolve conflicts locally and push the resolved branch.
- Do not use `git push --force` on shared branches.

## 13. Final Hackathon Rules

- `main` must always run and be demo-ready.
- All changes go through PRs.
- P1 and P2 own review quality and merge decisions.
- P3 and P4 contribute through feature branches and PRs.
- Every PR should have a clear title, short summary, and local test note.
- Use squash merge and delete merged branches.
- Freeze `main` before final submission except for maintainer-approved critical fixes.
