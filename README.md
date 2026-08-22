# AjaDocs

AjaDocs is a collaborative document workspace: register, write in a rich-text editor, share by email with view or edit access, import `.txt` / `.md`, and export Markdown. Access control is enforced on the server. Local development uses SQLite; production is intended to run Django against PostgreSQL.

## Features

- Email/username registration and JWT login (access + refresh)
- Dashboard of owned documents and documents shared with the current user
- Search (including `Ctrl+K`)
- TipTap editor with bold, italic, underline, headings, and lists
- Click-to-rename titles with debounced autosave of title and content
- Share by email: `view` or `edit`; owner-only share management
- Import `.txt` and `.md` (max 1MB, UTF-8)
- Client-side export to Markdown
- Activity history modal (owner and editor changes; viewers see owner activity only)
- Light/dark theme with system preference on first visit
- Responsive shell with a hamburger drawer on narrow viewports

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, Vite 6, React Router, Axios, TipTap |
| Backend | Django 5.2, Django REST Framework, SimpleJWT, django-cors-headers |
| Import | Python `markdown` (server-side `.md` → HTML) |
| Local database | SQLite |
| Production database | PostgreSQL (deployment target) |

## Screenshots

Replace these placeholders with captures from the walkthrough.

```text
docs/screenshots/login.png          — Login / register
docs/screenshots/dashboard.png      — Dashboard (owned vs shared)
docs/screenshots/editor.png         — Editor, toolbar, autosave
docs/screenshots/share.png          — Share dialog
docs/screenshots/history.png        — History timeline modal
docs/screenshots/theme.png          — Dark and light theme
```

![Login](docs/screenshots/login.png)

![Dashboard](docs/screenshots/dashboard.png)

![Editor](docs/screenshots/editor.png)

## Local setup

Requires Python 3.11+ and Node.js 18+.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r ..\requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver 8000
```

macOS / Linux:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 8000
```

API: `http://127.0.0.1:8000/`

Install from the **root** `requirements.txt` (project dependencies). Do not use a full `pip freeze` dump of an unrelated system environment.

Run tests:

```bash
python manage.py test accounts documents
```

### Frontend

```bash
cd frontend
copy .env.example .env    # Windows; or: cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173/` — `VITE_API_URL` must match the Django origin.

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose | Local default |
| --- | --- | --- |
| `SECRET_KEY` | Django signing key | Insecure fallback only when `DEBUG=True` |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Host allowlist | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Browser origins | `http://localhost:5173,http://127.0.0.1:5173` |

Production must set a real `SECRET_KEY`, `DEBUG=False`, and host/CORS values for the live frontend. Wire `DATABASES` to PostgreSQL (for example via `DATABASE_URL`) on the host.

### Frontend (`frontend/.env`)

| Variable | Purpose | Local default |
| --- | --- | --- |
| `VITE_API_URL` | Django origin, no trailing path | `http://127.0.0.1:8000` |

## Deployment overview

Intended split:

1. **Frontend** — Vite production build on Vercel (or equivalent). Set `VITE_API_URL` to the public API origin at build time.
2. **Backend** — Django on Render (or equivalent) with Gunicorn/Uvicorn, `DEBUG=False`, and PostgreSQL.
3. **CORS / hosts** — Add the Vercel origin to `CORS_ALLOWED_ORIGINS` and the API hostname to `ALLOWED_HOSTS`.

Local SQLite is for development only. Do not ship `db.sqlite3` or `.env` files.

## Supported file types

| Type | Behavior |
| --- | --- |
| `.txt` | UTF-8 text, escaped and wrapped as HTML paragraphs |
| `.md` | Server-side Markdown → HTML (`sane_lists`, `nl2br`) |

Rejected: other extensions, files larger than 1MB, non-UTF-8 bytes. Export is client-side Markdown download (`{title}.md`); it does not round-trip through the import API.

## Test accounts

Create users via **Register**, or fill in accounts used in the walkthrough:

| Role | Email | Password |
| --- | --- | --- |
| Owner | `<PASTE_OWNER_EMAIL>` | `<PASTE_PASSWORD>` |
| Editor (shared edit) | `<PASTE_EDITOR_EMAIL>` | `<PASTE_PASSWORD>` |
| Viewer (shared view) | `<PASTE_VIEWER_EMAIL>` | `<PASTE_PASSWORD>` |

Sharing is by **email** of an existing registered user. Unique username and email are required.

## API surface

**Auth**

- `POST /api/auth/register/`
- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `GET /api/auth/me/`

**Documents** (Bearer JWT)

- `GET/POST /api/documents/`
- `GET/PATCH /api/documents/{id}/`
- `POST /api/documents/import/`
- `GET/POST /api/documents/{id}/shares/`
- `PATCH/DELETE /api/documents/{id}/shares/{share_id}/`
- `GET /api/documents/activity/`

List returns owned and shared documents with `access`: `owner` | `view` | `edit`. Unrelated IDs return **404**. View-only PATCH returns **403**.

## Project structure

```text
AjaDocs/
├── README.md
├── ARCHITECTURE.md
├── AI_WORKFLOW.md
├── SUBMISSION.md
├── VIDEO_LINK.txt
├── requirements.txt
├── backend/
│   ├── manage.py
│   ├── config/          # Django settings, URLs, WSGI/ASGI
│   ├── accounts/        # Register, JWT, /me
│   └── documents/       # Documents, shares, import, activity
└── frontend/
    ├── src/
    │   ├── api/         # Axios + refresh-on-401
    │   ├── auth/
    │   ├── pages/       # Login, Register, Dashboard, Editor
    │   ├── components/  # Shell, TipTap, Share, History
    │   ├── export/      # HTML → Markdown
    │   └── theme/
    └── package.json
```
