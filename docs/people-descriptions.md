# Writing People descriptions

The People page is a record of influence, not a hall of fame. Each summary should explain what the person changed in Miguel's thinking, work or conduct.

## Start with the effect

Name the book, lecture, decision or habit that mattered, then explain its effect. "She influenced me" says little. "Her novel showed me that a story can carry a philosophy" gives the reader something concrete.

Prefer first-person statements. They make the scope of a claim clear and keep the entry from sounding like a universal verdict.

## Admire something specific

Separate the person from the quality being admired. A useful description identifies a particular achievement, manner of thinking or way of acting. It does not imply approval of everything the person has said or done.

Keep background facts in the short bio. In the summary, describe the traits Miguel values and how they affect his own thinking or work. Mention an example when it clarifies the influence, but do not retell a career or echo Miguel's notes event by event.

Read nearby entries before drafting. Vary openings and sentence patterns so the summaries sound like Miguel's distinct observations, not repetitions of the same praise.

When admiration has changed over time, say so plainly. Disagreement can make a description more credible when it reveals what still matters and what no longer convinces.

## Be accurate and fair

Check political, historical and biographical claims against reliable sources. Use the narrowest accurate term. For example, describe Orwell's warning about Stalinism or authoritarianism rather than treating his work as a rejection of every form of socialism.

Treat Miguel's notes as a starting point to check. Compare factual claims and descriptions of the person's approach with their own work and reliable accounts. Flag mistakes, overstatements or impressions that lack support before turning them into polished copy. Explain the correction plainly. Keep personal admiration in the first person, so it does not become a claim that the person is always honest, right or representative of a consensus.

Do not turn a private event into a neat lesson unless the person has publicly described it that way. Sensitive details should be relevant, documented and phrased with restraint.

Avoid relative terms such as "recent" and "today" when the date matters. They become stale. Name the event without the time marker or give the year.

## Prefer plain, durable language

Use concrete verbs and nouns. Replace claims such as "made the world better" or "changed everything" with the idea, practice or decision that produced the effect.

Avoid promotional language, clichés and praise that could describe anyone. Phrases such as "visionary leader," "extraordinary journey," "reached the top" and "built the future" hide the interesting part of the story.

Keep each sentence focused. Name the quality Miguel values and what it changes in him. An encounter, work or decision can make that connection clearer, but the summary does not need a list of biographical examples. Vary the rhythm and structure so the collection sounds like one person thinking, not a set of templates.

Keep the `summary` at or below 399 characters, including spaces and punctuation. This is the length of the longest summary in the collection before the George Hotz entry. Run `python3 scripts/validate_people.py` to check the limit across all People entries.

## Review questions

Before publishing, ask:

- Could this description fit several other people unchanged?
- Does it explain influence, or merely announce admiration?
- Is every factual claim accurate and current?
- Does the wording confuse eloquence, fame or success with being right?
- Have personal or sensitive details been included with a clear reason?
- Would a thoughtful critic understand why this person belongs here?
- Does the description still sound like Miguel?

Run `python3 scripts/validate_people.py`, `git diff --check` and inspect the final diff. Content-only edits do not require browser verification unless the user asks for it.
