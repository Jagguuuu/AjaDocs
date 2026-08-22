import html
import re
from pathlib import Path

import markdown


MAX_IMPORT_BYTES = 1 * 1024 * 1024
ALLOWED_IMPORT_EXTENSIONS = {".txt", ".md"}


def title_from_filename(filename):
    stem = Path(filename or "").stem.strip()
    return (stem or "Untitled")[:200]


def text_to_html(text):
    blocks = re.split(r"\n\s*\n", text.strip())
    if not blocks or blocks == [""]:
        return ""
    paragraphs = []
    for block in blocks:
        escaped = html.escape(block).replace("\n", "<br>")
        paragraphs.append(f"<p>{escaped}</p>")
    return "".join(paragraphs)


def markdown_to_html(text):
    return markdown.markdown(text, extensions=["sane_lists", "nl2br"])
