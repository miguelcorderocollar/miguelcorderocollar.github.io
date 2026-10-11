#!/usr/bin/env python3
"""Validate the People data and its summary length limit."""

import json
import sys
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[1] / "people/people-data.json"
MAX_SUMMARY_LENGTH = 399


def main() -> int:
    try:
        people = json.loads(DATA_PATH.read_text(encoding="utf-8"))["people"]
    except (OSError, json.JSONDecodeError, KeyError) as error:
        print(f"Could not read {DATA_PATH}: {error}", file=sys.stderr)
        return 1

    errors = []
    for index, person in enumerate(people, start=1):
        if not isinstance(person, dict):
            errors.append(f"Entry {index}: expected an object")
            continue
        name = person.get("name", f"Entry {index}")
        summary = person.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            errors.append(f"{name}: summary must be non-empty text")
        elif len(summary) > MAX_SUMMARY_LENGTH:
            errors.append(
                f"{name}: summary is {len(summary)} characters "
                f"(maximum {MAX_SUMMARY_LENGTH})"
            )

    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1

    print(f"Validated {len(people)} People summaries (maximum {MAX_SUMMARY_LENGTH} characters).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
