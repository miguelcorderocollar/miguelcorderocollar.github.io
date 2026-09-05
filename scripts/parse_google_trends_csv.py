#!/usr/bin/env python3
"""Turn a Google Trends Explore CSV export into a small JSON snapshot."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_rows(path: Path) -> tuple[str | None, list[dict[str, object]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))

    query = None
    for row in rows:
        if len(row) >= 2 and row[0].strip().lower() in {"search term", "search topic"}:
            query = row[1].strip()
            break

    points: list[dict[str, object]] = []
    for row in rows:
        if len(row) < 2:
            continue
        date = row[0].strip()
        value = row[-1].strip()
        if not DATE_RE.match(date) or not value:
            continue
        try:
            numeric_value = int(value)
        except ValueError:
            continue
        points.append({"date": date, "value": numeric_value})

    if not points:
        raise ValueError("No ISO-date/value rows found in the CSV export")

    return query, points


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_file", type=Path)
    parser.add_argument("--query", help="Override the query label when the export omits metadata")
    parser.add_argument("--url", required=True, help="Exact Google Trends Explore URL")
    parser.add_argument("--geo", default="Worldwide")
    parser.add_argument("--date-range", default="unknown")
    parser.add_argument("--property", default="web")
    parser.add_argument("--category", default="0")
    args = parser.parse_args()

    query, points = parse_rows(args.csv_file)
    output = {
        "source": "Google Trends",
        "query": args.query or query or "unknown",
        "geo": args.geo,
        "dateRange": args.date_range,
        "property": args.property,
        "category": args.category,
        "retrievedAt": datetime.now(timezone.utc).date().isoformat(),
        "sourceUrl": args.url,
        "points": points,
    }
    json.dump(output, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
