---
name: blog-writing
description: Turn Miguel's spoken or typed rambling into a blog article for miguelcorderocollar.com, then review it critically before publishing. Use when Miguel wants to write, draft, edit or review a blog post, or brain-dumps an idea "for the blog".
---

# Blog writing

Miguel usually dictates a loose brain dump in chat. Your job is to act as an editor, not a transcriber. Find the point, organise it, keep his voice, and push back where the thinking is thin.

## Voice

- Casual, first person, curious and direct. He is a person who cares about the topic, not a brand.
- Natural but deliberate: it should read like Miguel on a good day, not like his raw transcript and not like a press release.
- Reference point: his 2019–2020 [Sustainable Knowledge](https://sustainable-knowledge.vercel.app/) articles (source: `miguelcorderocollar/sk_2025`, `content/posts/`). Keep their honesty and curiosity. Drop their long run-on sentences, filler and self-deprecation.
- Avoid AI tells: "In today's fast-paced world", "let's dive in", "delve", "it's not just X, it's Y", triads for rhythm, em-dash chains, a summary paragraph that repeats the post, rhetorical questions as section openers, and hype words (game-changer, revolutionary, unlock).
- Keep his concrete details, opinions and small jokes. Cut hedging that adds nothing. Do not invent experiences, numbers, quotes or opinions he did not give you. Ask instead.
- Rewrite, don't transcribe. His dictation is raw material: restructure sentences, tighten wording and replace weak phrasing freely. If a draft still reads like his ramble, it needs another pass.
- Be precise about tools and products. Name them ("Codex with Computer Use", not "an AI agent that can use the computer"). Miguel is happy to mention what he uses.

## Workflow

1. **Listen.** Read the whole ramble before writing. List the ideas you heard, in his order.
2. **Find the spine.** State the post's one main point in a sentence. If you cannot, ask before drafting.
3. **Propose an outline** with what you would keep, cut, move or add, and why. Be critical: flag tangents, repeated ideas, weak claims and anything that belongs in a separate post. For a short post you may draft directly and put these notes after the draft.
4. **Draft** in `src/content/blog/<slug>.md` (or `.mdx` when it needs a component or interactive piece) with `draft: true` until Miguel approves it. Follow `docs/blog.md` for frontmatter, slugs and links.
5. **Show the work in progress.** Start `npm run dev` in the background if it isn't running and open `http://localhost:8000/blog/<slug>/` in the host's integrated browser so Miguel can read it as it will look. Drafts are visible only in local dev, with a Draft label. Fall back to `xdg-open` if there is no integrated browser. After each round of edits, tell him to refresh.
6. **Review** against the checklist below and report what you changed or still doubt. Do not silently accept everything he said.
7. **Get a second opinion.** After the first full draft (and after any major rewrite), start a delegated review by a different model: Codex `gpt-6.1-sol` at `medium` reasoning effort (via T3 Code `delegate_task`, role `review`, async). Brief it with the draft path and this skill, and ask for critical, read-only feedback against the voice rules and checklist: weakest sentences with rewrites, structure, cuts, unclear claims and precision. It must not edit files. Weigh its points yourself, apply the ones you agree with, and tell Miguel which you took and which you rejected and why. If that model is unavailable, say so instead of switching.
8. **Publish** only when Miguel says so: set `draft: false` and the real `published` date, run `npm run check` and `npm test`, and inspect the diff.

## Shape

- Most posts are short: a hook, two to four sections, a clear ending. 500–1,200 words is typical.
- Open with the actual point or a concrete moment, not with background.
- Headings are plain labels a skimmer can follow. Paragraphs carry one idea each.
- End with something specific: a prediction, an open question, or what he will do next. No "In conclusion".
- Link generously to the site instead of repeating it: `/projects/`, `/trends/`, `/people/`, `/quotes/`, and earlier posts. Use root-relative links. Check every external link works.

## Visuals

Add a visual only when it explains something faster than text.

- **Animated or static SVG** (preferred): inline in `.mdx` inside `<figure className="article-diagram-frame">` with `className="article-diagram"`, a `<title>`, `role="img"` and `currentColor` strokes. See `src/content/blog/sample-post.mdx`. Use the site's design system (`miguel-personal-style`: mono type, thin rules, square corners, orange only as a marker). Animate with CSS, keep it subtle, and stop motion under `prefers-reduced-motion`.
- **Images**: photographs go through the shader pipeline in `AGENTS.md` with credit and source documented.
- **Interactive HTML**: an Astro component in `src/components/` imported into the `.mdx`. Reserve it for posts that explain or teach something.
- Avoid GIFs and video unless there is no better option.

## Review checklist

Run through this on every draft and say what failed:

- [ ] **Point:** the main idea is clear within the first two paragraphs.
- [ ] **Order:** each section follows from the previous one; nothing would read better elsewhere.
- [ ] **Cut:** no repeated ideas, tangents or filler sentences. Every paragraph earns its place.
- [ ] **Rewritten:** no sentence is just his dictation cleaned up; wording has been sharpened, especially claims and predictions.
- [ ] **Precise:** tools, products and people are named, not described vaguely.
- [ ] **Voice:** sounds like Miguel speaking carefully. Read it aloud; rewrite anything stiff, corporate or AI-flavoured.
- [ ] **Honesty:** claims, dates and facts are his or are sourced. Predictions are framed as his predictions.
- [ ] **Links:** internal links resolve; external links work and point to the right page.
- [ ] **Title and description:** the title is specific, the `description` is one plain sentence for the listing and feed.
- [ ] **Visuals:** each one earns its place, has alt text or a `<title>`, and works in light, dark and reduced-motion modes.
- [ ] **Suggestions:** you told Miguel what you would add, remove or question, even if the draft is good.
