# Agent discovery and AI usage policy

Updated: 2026-10-19

## Discovery

The site allows normal public crawling in `robots.txt`, publishes an XML sitemap and provides complete Markdown and JSON representations. These are discovery and access conventions. They do not authenticate clients or grant additional rights to reuse content.

## AI usage policy

No AI-specific permission or prohibition is currently asserted for search indexing, AI input, or model training. The `Content-Signal` proposal and the IETF AI Preferences work distinguish these usage purposes, and choosing values would make a substantive rights and preference statement. Until Miguel makes that decision, the site does not publish `Content-Signal` directives or an AIPREF policy. The absence of a signal must not be interpreted as permission or prohibition.

`/llms.txt` is provided as a community discovery convention. It is not an access-control mechanism. `agents.txt`, MCP, A2A, and a custom capability manifest are not included because this site publishes content and exposes no agent actions.

## Hosting limitation

The site currently uses GitHub Pages. It serves explicit `.md` representations but does not negotiate the HTML page URL based on `Accept: text/markdown`. Add `Vary: Accept` negotiation only after the hosting layer supports it, keeping HTML as the default response.

## Maintaining representations

Run `python3 scripts/build_agent_content.py` after changing People, Quotes, or Trends JSON data, then review the generated Markdown. The homepage Markdown is a compact index; the detailed CV remains at `documents/Miguel-Cordero-CV.md`.
