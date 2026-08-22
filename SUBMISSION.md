# AjaDocs — assessment submission

## Project summary

AjaDocs is a JWT-authenticated document workspace. Users register, create and edit rich-text documents, share them by email with view or edit rights, import `.txt` / `.md`, and export Markdown. The backend (Django REST Framework) owns authorization. The frontend (React + Vite + TipTap) is a SPA. Optional stretch work includes Markdown export, light/dark theme, an activity history modal, and a responsive hamburger shell.

## Completed requirements

| Requirement | Status |
| --- | --- |
| React frontend (Vite) | Done |
| Django REST backend | Done |
| JWT register / login / refresh / me | Done |
| Unique username and email; hashed passwords | Done |
| Document list (owned + shared) | Done |
| Document create, retrieve, update (PATCH) | Done |
| TipTap rich text (bold, italic, underline, headings, lists) | Done |
| Autosave title + content | Done |
| Share by email (`view` / `edit`) | Done |
| Owner-only share management | Done |
| View cannot PATCH (403); stranger 404 | Done |
| Import `.txt` and `.md`, max 1MB UTF-8 | Done |
| Server-side access control | Done |
| Automated API tests (auth, CRUD isolation, share ACL, activity) | Done |
| Local SQLite + documented Postgres production path | Done |

## Optional stretch implemented

- **Export to Markdown** — Client-side HTML → `.md` download from the editor and document card menu
- **Dark / light theme** — CSS variables, `localStorage`, system preference on first visit, toggle in the chrome

Additional (beyond the named stretch): document activity history, click-to-rename, import-from-dashboard, mobile hamburger menu.

Not implemented (out of original scope unless requested): realtime multi-cursor collab, comments, snapshot version restore, hosted production (URLs below are placeholders).

## Live URLs

| Item | URL |
| --- | --- |
| Frontend | `<PASTE_LIVE_FRONTEND_URL>` |
| Backend | `<PASTE_LIVE_BACKEND_URL>` |

Local fallback: frontend `http://localhost:5173/`, API `http://127.0.0.1:8000/`.

## Walkthrough video

See `VIDEO_LINK.txt`.

Walkthrough Video: `<PASTE_YOUR_LOOM_OR_YOUTUBE_LINK_HERE>`

Suggested demo order: register → create → format → rename → share view/edit → import → export → theme → History as owner vs viewer → narrow viewport menu.

## Test accounts

| Role | Email | Password |
| --- | --- | --- |
| Owner | `<PASTE_OWNER_EMAIL>` | `<PASTE_PASSWORD>` |
| Editor | `<PASTE_EDITOR_EMAIL>` | `<PASTE_PASSWORD>` |
| Viewer | `<PASTE_VIEWER_EMAIL>` | `<PASTE_PASSWORD>` |

Accounts must already exist in the deployed (or local) database. Share using the collaborator’s **email**.

## Files included in submission

```text
README.md           Product overview, setup, env, structure
ARCHITECTURE.md     Diagrams, JWT, sharing, schema, tradeoffs, security
AI_WORKFLOW.md      Cursor + ChatGPT usage, rejects, verification
SUBMISSION.md       This checklist and placeholders
VIDEO_LINK.txt      Walkthrough URL
requirements.txt    Python dependencies for the API
backend/            Django project
frontend/           Vite React app
```

Do not submit `.env`, `db.sqlite3`, `node_modules/`, or `.venv/`.
