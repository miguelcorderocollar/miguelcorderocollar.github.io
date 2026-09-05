# Refreshing the trends page

The `/trends/` page is a static snapshot. Google Trends values are normalized search interest from 0 to 100, not search counts or stock prices. The JSON keeps the exact Explore URL beside every series so a future refresh can be checked against the same filters. Optional `contextMarkdown` fields hold the personal story shown by each card’s Info button. A `displayUntil` field can intentionally shorten a card when the useful story ends before the source window; the card must say when that happens.

Google’s supported workflow is browser-based:

1. Open the `sourceUrl` for a signal.
2. Confirm the query type, geography, date range, category, and search property.
3. Use the chart’s `Download CSV` control.
4. Convert the CSV into a point list with `python3 scripts/parse_google_trends_csv.py export.csv --query Tesla --url 'EXACT_URL'`.
5. Update `trends/trends-data.json`, keeping `retrievedAt` and `partialLast` honest.

Google’s official Trends API is currently an alpha program with limited access. The page therefore does not call undocumented widget endpoints from the browser. See the reusable `google-trends` skill in the local Codex skills directory for URL parameters, the compact series format, and the reasons not to compare separately scaled requests numerically.

Sources:

- [Export, embed, and cite Trends data](https://support.google.com/trends/answer/4365538)
- [Compare search terms and topics](https://support.google.com/trends/answer/17309543)
- [Google Trends API](https://developers.google.com/search/apis/trends)
