# AI workflow

AjaDocs was implemented with AI-assisted development. Models did not ship unreviewed output. Architecture, access control, and product rules were specified first; generation filled in boilerplate and UI; humans (and tests) verified behavior.

## Tools

| Tool | Role |
| --- | --- |
| **Cursor** | In-repo agent: Django apps, React pages, CSS, tests, migrations, refactors against the live tree |
| **ChatGPT** | Architecture and product framing: stack split, JWT vs session, HTML vs Markdown storage, share ACL (404 vs 403), slice order before code |

Cursor operated on `backend/` and `frontend/` with file context. ChatGPT was used for design discussion and review-style questions, not as the source of truth for the repository.

## How AI accelerated development

- Django project layout, DRF serializers, SimpleJWT wiring, and CORS settings
- TipTap toolbar + autosave PATCH loop
- Share dialog and permission matrix tests
- Import pipeline (size, encoding, `.txt` / `.md`)
- HTML → Markdown export
- Theme tokens and FOUC-avoidance approach
- Activity log model + coalescing + viewer filter
- Responsive hamburger drawer after the stacked-header layout failed in split view
- Assessment documentation in the project root

Estimated effect: days of CRUD/auth/editor scaffolding compressed into hours, with time spent on ACL, autosave, and UI polish instead of boilerplate.

## AI-generated code that was modified

| Area | What changed after generation |
| --- | --- |
| Dashboard stats | Fake `+12%` pills removed; counts kept as real aggregates |
| Editor chrome | Theme-only topbar merged into the document header to stop scroll “leak” |
| Title editing | Always-on input replaced with click-to-rename and focus-on-create |
| Card `···` menu | Prop named `document` shadowed `window.document` and crashed; renamed |
| History | Coalesce window and viewer-only-owner-events added to match the product rule |
| `DocumentActivity.created_at` | `timezone` import crash on reload; switched to an explicit `timezone_now` default |
| Mobile nav | Horizontal sidebar replaced with an overlay drawer + hamburger |
| Requirements | Project deps kept as a short pin list at repo root, not a full machine `pip freeze` |

## Suggestions that were intentionally rejected

- **Realtime collaboration / CRDT / WebSockets** — Out of scope; last-write-wins autosave is explicit.
- **Comments and full version restore** — Not required; activity is an audit feed, not snapshots.
- **Renaming from dashboard cards** — Titles edit only after opening the document.
- **Decorative / random dashboard metrics** — Would misrepresent data.
- **History as a full page** — Required to be a modal with outside-click and close.
- **Custom user model** — Built-in `User` is enough with unique email in the serializer.
- **Storing Markdown as the document source** — Rejected in favor of TipTap HTML (see `ARCHITECTURE.md`).
- **Cookie session auth** — JWT matches the SPA + DRF assessment stack.

## Verification

**Automated (Django `APITestCase`):**

- Register returns tokens; `/me` is 401 without JWT; password is hashed; duplicate username/email rejected
- Owner CRUD; other users get 404 on foreign documents
- Share: editor PATCH 200, viewer PATCH 403, stranger 404
- Activity: owner + editor messages; viewers omit editor changes; rapid PATCHes coalesce

Command:

```bash
cd backend
python manage.py test accounts documents
```

**Manual:**

- Register two (or three) users; share view and edit by email
- Confirm view-only cannot save; edit can; owner can share
- Import `.txt` and `.md`; reject a `.pdf` or oversized file
- Rename, edit, confirm Saving / Saved; export `.md`
- History as owner, editor, and viewer
- Theme toggle and refresh persistence
- Narrow/split viewport: hamburger opens Documents / History / Log out
- Expired access token: refresh then retry, or logout if refresh fails

## Manual testing strategy

1. **Auth path** — Register, logout, login, protected route redirect.
2. **Happy path** — Create, type, reload, title survives, content survives.
3. **ACL path** — Three browsers or profiles: owner / editor / viewer / unsigned-in.
4. **Import/export path** — Known `.md` fixture in and out.
5. **Regression path** — Card menu, editor header, History after a PATCH.
6. **Do not treat AI as an oracle** — If the UI and the API disagree, the API permission class wins.

## Responsible AI usage

AI drafted code and prose; it did not invent production secrets, scrape other products’ private data, or bypass the server ACL. Generated SQL/ORM and permission checks were read before merge. Dummy JWT secrets stay in `.env.example` / local DEBUG fallback only. This write-up describes the actual workflow; it does not claim the model “tested” the app in a browser without a human.
