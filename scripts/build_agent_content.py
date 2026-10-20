#!/usr/bin/env python3
"""Build the static Markdown representations advertised to web agents."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://miguelcorderocollar.com"


def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def write(path, content):
    (ROOT / path).write_text(content.rstrip() + "\n", encoding="utf-8")


def people_markdown():
    data = load("people/people-data.json")
    rows = ["# People", "", "Public figures whose work has shaped how Miguel Cordero Collar thinks and works. His family and friends come first; this is a collection of public influences, not an endorsement of everything they have said or done.", "", f"Updated: {data['updated']}", "", f"Source data: [{BASE}/people/people-data.json]({BASE}/people/people-data.json)", ""]
    for p in data["people"]:
        rows.extend([f"## {p['name']}", "", f"**{p.get('role', '')}** · {p.get('categoryLabel', p.get('category', ''))}", "", p.get("summary", ""), ""])
        if p.get("bio"):
            rows.extend([p["bio"], ""])
        links = p.get("links", [])
        if links:
            rows.append("Links:")
            rows.extend(f"- [{link['label']}]({link['url']})" for link in links)
            rows.append("")
        if p.get("photo", {}).get("sourceUrl"):
            photo = p["photo"]
            rows.extend([f"Portrait credit: {photo.get('credit', 'Unspecified')} · [{photo.get('license', 'Source')}]({photo['sourceUrl']})", ""])
    return "\n".join(rows)


def quotes_markdown():
    data = load("quotes/quotes-data.json")
    rows = ["# Quotes", "", "A notebook of lines Miguel Cordero Collar returns to. Text and attributions are reproduced as collected; follow the source link for context.", "", f"Updated: {data['updated']}", "", f"Source data: [{BASE}/quotes/quotes-data.json]({BASE}/quotes/quotes-data.json)", ""]
    for q in data["quotes"]:
        rows.extend([f"## {q['author']} · {q.get('categoryLabel', q.get('category', ''))}", "", "> " + q["text"].replace("\n", "\n> "), ""])
        if q.get("originalText"):
            rows.extend(["Original wording:", "", "> " + q["originalText"].replace("\n", "\n> "), ""])
        source = f"[{q['source']}]({q['sourceUrl']})" if q.get("sourceUrl") else q.get("source", "Source not provided")
        rows.extend([f"— {q['author']}, {source}", ""])
    return "\n".join(rows)


def trends_markdown():
    data = load("trends/trends-data.json")
    rows = ["# Trends", "", "Personal interests alongside Google Trends search interest. Values are relative within each query, geography, property and time range; they are not search counts.", "", f"Snapshot retrieved: {data['retrievedAt']}", f"Geography: {data.get('defaultGeo', 'Not specified')} · Property: {data.get('defaultProperty', 'Not specified')}", "", f"Source data: [{BASE}/trends/trends-data.json]({BASE}/trends/trends-data.json)", ""]
    for s in data["signals"]:
        rows.extend([f"## {s['label']}", "", f"**Category:** {s.get('categoryLabel', s.get('category', ''))}", f"**Personal marker:** {s.get('personalInterestLabel', 'Not specified')}", f"**Query:** {s.get('query', s['label'])} · {s.get('dateRange', 'date range not specified')} · {s.get('defaultGeo', data.get('defaultGeo', 'Worldwide'))}", "", f"[Open this Google Trends query]({s['sourceUrl']})", ""])
        if s.get("aboutMarkdown"):
            rows.extend([s["aboutMarkdown"], ""])
        if s.get("contextMarkdown"):
            rows.extend(["### Personal context", "", s["contextMarkdown"], ""])
        series = s.get("series", {})
        if series.get("start") and series.get("values"):
            values = ", ".join(map(str, series["values"]))
            rows.extend([f"Snapshot series ({series.get('interval', 'interval unspecified')}, starting {series['start']}, relative values 0–100): {values}.", ""])
    return "\n".join(rows)


def main():
    write("people/index.md", people_markdown())
    write("quotes/index.md", quotes_markdown())
    write("trends/index.md", trends_markdown())
    profile = (ROOT / "documents/Miguel-Cordero-Profile.md").read_text(encoding="utf-8")
    profile = re.sub(r"\]\(\.\./([^)]*)\)", rf"]({BASE}/\1)", profile)
    profile = profile.replace("https://miguelcorderocollar.github.io/", f"{BASE}/")
    profile = re.sub(r"[ \t]{2,}$", "<br>", profile, flags=re.MULTILINE)
    profile += """

## Machine-readable collections

- [People](/people/index.md): Public figures whose work has influenced Miguel. [JSON data](/people/people-data.json).
- [Quotes](/quotes/index.md): Sourced quotations with attribution and original wording where available. [JSON data](/quotes/quotes-data.json).
- [Trends](/trends/index.md): Personal interest markers with Google Trends context and source links. [JSON data](/trends/trends-data.json).

Updated: 2026-10-19
"""
    write("index.md", profile)


if __name__ == "__main__":
    main()
