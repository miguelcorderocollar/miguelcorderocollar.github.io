# Refreshing the trends page

The `/trends/` page is a static snapshot. Google Trends values are normalized search interest from 0 to 100, not search counts or stock prices. The JSON keeps the exact Explore URL beside every series so a future refresh can be checked against the same filters. Each signal should have a `personalInterestDate` and `personalInterestLabel`; optional `contextMarkdown` fields hold the personal story shown by a card’s Info button. A `displayUntil` field can intentionally shorten a chart when the useful story ends before the source window; the chart ends at that cutoff.

Google’s supported workflow is browser-based. A signal can also use an optional
`personalInterestEndDate` and `endMarkerLabel` to show when an interest period ended;
the chart renders the period before and after that window more softly.

Optional `aboutMarkdown` fields can hold a short plain-language explanation and a
small bullet list of links for the question-mark button on each card. The
`contextMarkdown` field is reserved for the personal story shown by the Info
button.

### Date-window rule

When a signal has a known personal start date, do not leave Google Trends on the
relative `today 5-y` range. Use the visible date control and enter a custom range
instead. Set the first date to at least three full months before
`personalInterestDate`, and set the last date to the current date. The extra lead-in
keeps the chart from beginning exactly at the personal marker and gives the reader
some context before it.

After entering the dates, verify the rendered range on the page before downloading
the CSV. Keep that same custom range in `dateRange` and `sourceUrl`, and make
`series.start` match the first month in the export. Google may align a monthly
export to the adjacent month before the entered boundary; keep that point rather
than trimming it away. For example, a personal start of `2021-03-01` should use a
chart beginning no later than `2020-12-01`.

The snapshot workflow remains browser-based:

1. Open the `sourceUrl` for a signal.
2. Set the custom date range through the visible date input using the rule above.
3. Confirm the query type, geography, date range, category, and search property.
4. Use the chart’s `Download CSV` control.
5. Convert the CSV into a point list with `python3 scripts/parse_google_trends_csv.py export.csv --query Tesla --url 'EXACT_URL'`.
6. Update `trends/trends-data.json`, keeping `retrievedAt` and `partialLast` honest.

Google’s official Trends API is currently an alpha program with limited access. The page therefore does not call undocumented widget endpoints from the browser. See the reusable `google-trends` skill in the local Codex skills directory for URL parameters, the compact series format, and the reasons not to compare separately scaled requests numerically.

Sources:

- [Export, embed, and cite Trends data](https://support.google.com/trends/answer/4365538)
- [Compare search terms and topics](https://support.google.com/trends/answer/17309543)
- [Google Trends API](https://developers.google.com/search/apis/trends)
