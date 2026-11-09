#!/usr/bin/env python3
"""Compatibility command: Astro now generates representations as static routes.

Markdown and JSON are emitted into dist/ without rewriting source files.
"""
from pathlib import Path
import subprocess

if __name__ == '__main__':
    raise SystemExit(subprocess.call(['npm', 'run', 'build'], cwd=Path(__file__).resolve().parents[1]))
