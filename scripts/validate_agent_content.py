#!/usr/bin/env python3
"""Validate static discovery files and representations through a local HTTP server."""

import json
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://127.0.0.1:8000"
ROOT = Path(__file__).resolve().parents[1]
errors = []


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.alternates = []
        self.jsonld = []
        self.in_jsonld = False
        self.current_jsonld = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link" and attrs.get("rel") == "alternate" and attrs.get("type") == "text/markdown":
            self.alternates.append(attrs.get("href", ""))
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.in_jsonld = True
            self.current_jsonld = []

    def handle_data(self, data):
        if self.in_jsonld:
            self.current_jsonld.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.in_jsonld:
            self.jsonld.append("".join(self.current_jsonld))
            self.in_jsonld = False


def get(path):
    try:
        response = urllib.request.urlopen(urljoin(BASE + "/", path.lstrip("/")), timeout=5)
        return response.status, response.headers.get_content_type(), response.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        errors.append(f"GET {path}: {exc}")
        return 0, "", ""


def check(path, content_type=None):
    status, actual_type, body = get(path)
    if status != 200:
        errors.append(f"{path}: expected 200, got {status}")
    if content_type and actual_type != content_type:
        errors.append(f"{path}: expected {content_type}, got {actual_type}")
    return body


for path, content_type in [
    ("robots.txt", "text/plain"), ("llms.txt", "text/plain"),
    ("sitemap.xml", "text/xml"), ("index.md", "text/markdown"),
    ("documents/Miguel-Cordero-CV.md", "text/markdown"),
    ("people/index.md", "text/markdown"), ("people/people-data.json", "application/json"),
    ("quotes/index.md", "text/markdown"), ("quotes/quotes-data.json", "application/json"),
    ("trends/index.md", "text/markdown"), ("trends/trends-data.json", "application/json"),
]:
    check(path, content_type)

try:
    tree = ET.fromstring((ROOT / "sitemap.xml").read_text(encoding="utf-8"))
    locs = [node.text for node in tree.iter() if node.tag.endswith("}loc")]
    if any("github.io" in loc for loc in locs):
        errors.append("sitemap contains a github.io URL")
    if not all(f"https://miguelcorderocollar.com/{p}" in locs for p in ["", "people/", "quotes/", "trends/", "shader/", "projects/"]):
        errors.append("sitemap is missing a public landing page")
except (ET.ParseError, OSError) as exc:
    errors.append(f"sitemap.xml is invalid: {exc}")

for page in ["index.html", "people/index.html", "quotes/index.html", "trends/index.html"]:
    html = check(page, "text/html")
    parser = PageParser()
    parser.feed(html)
    if not parser.alternates:
        errors.append(f"{page}: missing text/markdown alternate")
    for schema in parser.jsonld:
        try:
            json.loads(schema)
        except json.JSONDecodeError as exc:
            errors.append(f"{page}: invalid JSON-LD: {exc}")
    for href in parser.alternates:
        target = urlparse(urljoin(BASE + "/" + page, href))
        if target.netloc in ("127.0.0.1:8000", "localhost:8000"):
            check(target.path)

for path in ["people/people-data.json", "quotes/quotes-data.json", "trends/trends-data.json"]:
    try:
        json.loads((ROOT / path).read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        errors.append(f"{path} is invalid: {exc}")

for path in ["index.md", "people/index.md", "quotes/index.md", "trends/index.md"]:
    content = check(path, "text/markdown")
    for link in __import__("re").findall(r"\]\((https?://miguelcorderocollar\.com/[^)]+)\)", content):
        target = urlparse(link).path
        status, _, _ = get(target)
        if status != 200:
            errors.append(f"{path}: broken internal link {link} ({status})")

if errors:
    print("Agent readiness validation failed:")
    print("\n".join(f"- {error}" for error in errors))
    sys.exit(1)
print("Agent readiness files, HTTP responses, Markdown links, JSON, JSON-LD, sitemap and static representation links are valid.")
