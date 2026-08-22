import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponse

_FALLBACK_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AjaDocs</title>
  <style>
    body { font-family: Georgia, serif; margin: 3rem auto; max-width: 40rem; line-height: 1.5; }
    code { background: #f3f3f3; padding: 0.1rem 0.35rem; }
  </style>
</head>
<body>
  <h1>AjaDocs API is running</h1>
  <p>
    This URL is the Django API. The app UI is the Vite frontend.
  </p>
  <p>
    From <code>frontend/</code> run <code>npm install</code> then
    <code>npm run dev</code> and open
    <a href="http://localhost:5173">http://localhost:5173</a>.
  </p>
  <p>
    Or run <code>npm run build</code> in <code>frontend/</code> and refresh
    this page so Django can serve the built app.
  </p>
</body>
</html>
"""


def spa_view(request, path=""):
    dist = Path(settings.FRONTEND_DIST)
    if dist.is_dir():
        dist = dist.resolve()
        if path:
            target = (dist / path).resolve()
            try:
                target.relative_to(dist)
            except ValueError:
                return HttpResponse(_FALLBACK_HTML, content_type="text/html")
            if target.is_file():
                content_type, _ = mimetypes.guess_type(str(target))
                return FileResponse(
                    target.open("rb"),
                    content_type=content_type or "application/octet-stream",
                )
        index = dist / "index.html"
        if index.is_file():
            return FileResponse(index.open("rb"), content_type="text/html")
    return HttpResponse(_FALLBACK_HTML, content_type="text/html")
