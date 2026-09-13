# Writing Trends descriptions

The Trends page has two different kinds of supporting text. Keep their jobs separate.

## About this topic

Every signal in `trends/trends-data.json` must have a non-empty `aboutMarkdown` field. This is the neutral explanation opened by the question-mark button.

Write one short paragraph that answers what the topic, person, company, game or medium is. Use plain, durable language. For a person or creator, describe the work they are known for. Do not describe Miguel's opinion here.

Add a `### Links` section with at least one useful, reliable source. Prefer the person's or project's own site, official documentation, or an official profile. The link should help a visitor learn more about the subject, not merely point back to Google Trends.

Do not add generic praise, vague claims, promotional copy, or a sentence that says nothing beyond the label. If a description would fit several entries unchanged, rewrite it with the subject's specific work or identity.

## Personal context

Use `contextMarkdown` only when it gives the reader useful context for Miguel's marker. It can explain when the interest started, what he learned, or why the subject belongs on the page. Keep it concise and specific. Do not repeat the `personalInterestLabel` as the whole context, pad the card with a generic sentence, or invent a personal story. If the date helps explain the story, it can appear naturally in a fuller paragraph.

If there is no meaningful personal context, set `contextMarkdown` to `null`. An empty modal is worse than no Info button.

## Review checklist

Before committing a Trends update:

- Every signal has a non-empty `aboutMarkdown` field.
- Every About this topic description is neutral and includes at least one useful source link.
- Any `contextMarkdown` content adds specific context rather than filler.
- Personal dates and labels remain separate from the neutral description.
- The exact Google Trends source URL remains in `sourceUrl`.
- The JSON is valid and `git diff --check` passes.

## Theo Browne

Theo's neutral description should stay short and factual:

> Theo Browne is a software developer and technology creator associated with the T3 Stack, create-t3-app, T3 Chat, and Ping. His work and videos cover JavaScript, web development, software tools, and AI-assisted coding.

The entry links to [Theo Browne](https://t3.gg/), [T3 Stack and create-t3-app](https://create.t3.gg/), and [Theo Browne on YouTube](https://www.youtube.com/@t3dotgg). Its personal context records that Miguel started watching him in February 2022 and learned from the connection between high-level ideas, implementation details, and shipping real projects.

The JSON file is the source of truth for the published wording. This section records the editorial rule and the approved direction so future edits do not replace the useful context with filler.
