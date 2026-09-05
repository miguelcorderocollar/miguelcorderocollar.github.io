# Repository guidance

## Content-only updates

- People entries and other small copy changes are data-driven. When adding a person or editing text in JSON/content files, do not run browser or visual UI verification unless the user asks for it or the implementation itself changes.
- For these small updates, validate the changed JSON, run `git diff --check`, and inspect the diff for correctness. Keep the existing UI untouched.
- UI, layout, styling, interaction, or shader changes still require the appropriate focused verification.
