# AjaDocs architecture

## System diagram

```text
                    Browser (React + Vite)
                    ┌─────────────────────────────────┐
                    │  AuthContext  JWT in localStorage│
                    │  Axios  →  Bearer + refresh 401  │
                    │  TipTap  HTML content            │
                    │  Export MD (client-only)         │
                    └──────────────┬──────────────────┘
                                   │ HTTPS JSON / multipart
                                   ▼
                    Django + DRF  (Render / local)
                    ┌─────────────────────────────────┐
                    │  SimpleJWT  access + refresh     │
                    │  ACL: owner / edit / view        │
                    │  Import: .txt / .md → HTML       │
                    │  Activity log on create / patch  │
                    └──────────────┬──────────────────┘
                                   │ ORM
                                   ▼
                    PostgreSQL (production)
                    SQLite (local development)
                    ┌─────────────────────────────────┐
                    │  auth_user                       │
                    │  documents_document              │
                    │  documents_documentshare         │
                    │  documents_documentactivity      │
                    └─────────────────────────────────┘
```

## Frontend → Django → PostgreSQL

1. The SPA calls `VITE_API_URL` (no Django templates for the product UI).
2. Authenticated requests send `Authorization: Bearer <access>`.
3. DRF authenticates the user, then queryset + object permissions decide visibility.
4. Document HTML is stored in `Document.content`. Shares and activity rows live in related tables.
5. **Local:** `ENGINE = django.db.backends.sqlite3` for zero-ops setup.
6. **Production:** same models on **PostgreSQL**. Django’s ORM is the portability layer; swap `DATABASES` (typically `DATABASE_URL`) without changing serializers.

```text
  React page
      │  GET/PATCH /api/documents/{id}/
      ▼
  views + serializers
      │  documents_visible_to(user)
      ▼
  PostgreSQL  (or SQLite locally)
      │  rows for Document / DocumentShare
      ▼
  JSON { id, title, content, access, owner_name, updated_at }
```

## JWT authentication flow

```text
Register  POST /api/auth/register/
          password hashed (Django create_user)
          → { user fields, access, refresh }

Login     POST /api/auth/token/
          → { access, refresh }

API       Authorization: Bearer <access>
          GET /api/auth/me/  → { id, username, email }

Expiry    401 on API (except login/refresh)
          POST /api/auth/token/refresh/  { refresh }
          → new access; retry original request
          refresh fail → clear tokens, force login
```

Tokens are stored in `localStorage` (SPA simplicity). They are not HttpOnly cookies. CORS is an origin allowlist, not `*`.

Passwords never appear in JSON responses. Emails are normalized; username and email are unique.

## Document sharing

```text
Owner ──creates──► Document
  │
  │  POST /shares/  { email, permission: view|edit }
  │  email must match an existing User
  │  cannot share with self; unique (document, shared_with)
  ▼
DocumentShare
  │
  ├── view  GET allowed; PATCH 403
  └── edit  GET + PATCH allowed
```

- **Owner** manages share list (list/create/update/delete). Non-owners who attempt share URLs get **403** if they can see the document, **404** if they cannot (no existence leak for strangers).
- **Document retrieve/update:** stranger → **404**; shared `view` + PATCH → **403**.
- List combines owned and shared rows and adds `access` + `owner_name`.
- History: owners and editors see owner + editor events on documents they can access. Viewers see **owner** events only. Viewers never write activity rows.

## Database schema

### `auth_user` (Django built-in)

No custom user model. Username, unique email, hashed password.

### `documents_document`

| Column | Notes |
| --- | --- |
| `id` | UUID PK |
| `owner_id` | FK user, CASCADE |
| `title` | max 200, stripped, non-blank |
| `content` | HTML text, blank allowed |
| `created_at` / `updated_at` | auto |

### `documents_documentshare`

| Column | Notes |
| --- | --- |
| `id` | UUID PK |
| `document_id` | FK document, CASCADE |
| `shared_with_id` | FK user, CASCADE |
| `permission` | `view` \| `edit` |
| Unique | `(document, shared_with)` |

### `documents_documentactivity`

| Column | Notes |
| --- | --- |
| `actor_id` | SET_NULL if user deleted |
| `actor_name` / `actor_role` | snapshots (`owner` \| `edit`) |
| `action` | `created` \| `updated` \| `renamed` |
| `document_title` | title at event time |
| Coalesce | same actor + document + action within 5 minutes updates one row (autosave) |

## Design decisions

1. **Built-in `User`** — Assessment scope does not need a custom user; email uniqueness is validated in the serializer.
2. **HTML in the database** — TipTap’s native document is HTML; the editor hydrates from HTML. One field, no dual Markdown/ProseMirror schema on the server.
3. **UUID document IDs** — Opaque IDs in URLs; still combined with 404-for-strangers.
4. **Server-side ACL** — UI disables controls; PATCH is still authorized in `IsDocumentOwnerOrShared`.
5. **Share by email** — Matches “invite a person who already has an account.”
6. **Import on the server** — `.md` conversion and size/type checks are not trusted to the client.
7. **Export on the client** — No extra endpoint; HTML → Markdown in the browser.
8. **SQLite locally, PostgreSQL in production** — Fast clone and migrate; production durability and concurrency on Postgres.
9. **Activity log, not OT/CRDT** — Records who changed which document, not character-level merge. Autosave coalescing avoids one row per keystroke.
10. **JWT in localStorage** — Standard SPA pattern; XSS would expose tokens, so the app avoids `dangerouslySetInnerHTML` for untrusted third-party HTML in the chrome. TipTap still renders document HTML for the owner’s/collaborators’ content by design.

## Tradeoffs

| Choice | Cost |
| --- | --- |
| HTML storage | Harder to diff than Markdown; export is a lossy mapping |
| Debounced PATCH | Last write wins; no realtime presence or conflict UI |
| localStorage JWT | XSS risk vs cookie+CSRF complexity |
| SQLite locally | Different locking/types than Postgres; run migrations on both |
| Coalesced history | Not a full version history or restore |
| No document delete API | Soft product gap; not required for the core share/edit loop |
| Viewers hide editor activity | Privacy for “view only”; editors still see the full feed |

## Why TipTap stores HTML

TipTap (ProseMirror) serializes the document to HTML for `content` / `getHTML()`. Persisting that string means:

- Load path is `editor.commands.setContent(html)` with no extra parser on the API.
- Toolbar marks (bold, italic, underline, headings, lists) round-trip in HTML tags the editor already understands.
- Import can target the same HTML field (escaped text or Markdown-rendered HTML).
- Export walks the HTML DOM to Markdown when the user downloads a file.

Storing Markdown on the server would require a second conversion on every save and every load, and underline/`<u>` is not native Markdown. HTML is the editor’s source of truth; Markdown is an export (and import) format.

## Security considerations

- Passwords hashed with Django’s hasher; Django password validators on register.
- JWT required for document and share routes; register and token obtain are the public exceptions.
- Object-level permissions: 404 vs 403 as above.
- Import: extension allowlist, 1MB cap, UTF-8 only.
- Title/content validation; share email must exist.
- CORS allowlist; `SECRET_KEY` required when `DEBUG` is false.
- Activity queryset is scoped to documents the caller owns or is shared into.
- Share management is owner-only.

Not in scope: realtime collab encryption, virus scanning of uploads, CSP hardening of stored HTML, or refresh-token rotation storage beyond SimpleJWT defaults.
