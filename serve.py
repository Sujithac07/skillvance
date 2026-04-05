#!/usr/bin/env python3
"""Local static server: extensionless page URLs and redirects from *.html to clean paths."""
from __future__ import annotations

import os
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))

_STATIC_EXT = {
    ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
    ".woff", ".woff2", ".ttf", ".map", ".json", ".txt", ".xml", ".webmanifest",
}


def _html_stems() -> set[str]:
    return {
        f[:-5]
        for f in os.listdir(ROOT)
        if f.endswith(".html") and os.path.isfile(os.path.join(ROOT, f))
    }


HTML_STEMS = _html_stems()


class CleanURLHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        raw = urllib.parse.unquote(parsed.path)
        query = parsed.query

        if raw != "/" and raw.endswith("/"):
            raw = raw.rstrip("/") or "/"

        # /page.html -> /page (or / for index.html)
        if raw.endswith(".html"):
            base = os.path.basename(raw)
            if base.endswith(".html"):
                stem = base[:-5]
                if stem in HTML_STEMS:
                    loc = "/" if stem == "index" else f"/{stem}"
                    if query:
                        loc += "?" + query
                    self.send_response(302)
                    self.send_header("Location", loc)
                    self.end_headers()
                    return

        serve = raw
        if raw in ("/", ""):
            serve = "/index.html"
        else:
            ext = os.path.splitext(raw)[1].lower()
            if not ext or ext not in _STATIC_EXT:
                rel = raw.lstrip("/")
                if rel and ".." not in rel.split("/"):
                    candidate = os.path.normpath(os.path.join(ROOT, rel + ".html"))
                    root_norm = os.path.normpath(ROOT)
                    if candidate.startswith(root_norm) and os.path.isfile(candidate):
                        serve = raw + ".html"

        self.path = serve + ("?" + query if query else "")
        return super().do_GET()


def main() -> None:
    port = int(os.environ.get("PORT", "8080"))
    httpd = HTTPServer(("", port), CleanURLHandler)
    print(f"Serving {ROOT} at http://127.0.0.1:{port}/  (clean URLs, no .html)")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
