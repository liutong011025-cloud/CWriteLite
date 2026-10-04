# Story checks and simultaneous Drama scenes

## Changes

- Story approval now requires understandable text, meaningful participation by a planned character, actual canvas plot linkage, current five-part structure, and a new event/consequence. The model must return exact text quotes and valid cast/node/edge references. Evidence is checked before saving the approval.
- Identical, substantially overlapping and copied-sentence paragraphs are rejected before semantic review. The semantic review also checks paraphrased repetitions. Occasional repeated short phrases surrounded by new events are allowed.
- Approval hashes are versioned. Older permissive approvals cannot unlock the new checks. Server save/review/publish guards remain in place; client-supplied approval events are reserved and rejected.
- Start writing from Canvas triggers an optional plan review. Missing connections receive short advice; Keep planning, Close, or Write anyway remain available. Existing written paragraphs are excluded from this plan review so they cannot make a disconnected canvas appear complete.
- New Story Deck displays only characters chosen for that work. A new story starts empty; the purple pack still contains the user's shared library.
- Story editor and right sidebar use a 2:1 grid on desktop; small screens stack them.
- Drama has one contribution per actor: Says or Thinks. The selector and input sit above the actor's picture. Speech has a pointed tail; thought has a cloud outline and three progressively smaller circles. These are CSS/inline SVG, with no new image downloads.
- All actor contributions render simultaneously. Playback, line-order controls and the upper Dialogue/Thought/Action toolbar were removed. Scene management and optional visible actions remain.
- AI suggestions use the selected actor and mode. With no mode selected they consider the whole scene. Clicking an incomplete first-person sentence frame inserts its actual text, preserves existing student words, focuses the input and selects the blank. Explanatory prompts are never inserted as the student's dialogue.
- Requests are cancelled/checked for stale selection. Switching Says/Thinks updates one contribution instead of adding another. Legacy sequential lines are retained as archived draft data when editing under the new model.
- Saved map titles no longer include another Story/Drama pin image. Their plaques have compact padding and a smaller width; draft continue pins remain.

## Verification

- `node scripts/check-writing-rules.cjs`: passed repeat detection, meaningful quoted evidence requirements, old approval invalidation, exclusive contributions, archived-data preservation, thought-only scenes, unfinished blanks and selected-actor filtering.
- Actual local API with real text AI: all five short EFL parts of a planned Fox/Pip lost-letter story passed, including understandable grammar mistakes. Exact repetition, lightly edited repetition, character description in place of a climax and an unrelated football story containing a token Fox mention were rejected.
- Direct review/publish bypass rejected (409); forged approval event rejected (400).
- Real Drama AI returned Pip thought frames when Pip/Thinks was selected and varied actor/mode ideas for a whole-scene request.
- Disconnected Canvas received optional advice; a coherent connected Canvas passed. Browser verified Write anyway enters the writing screen.
- Browser verified new deck count 0 with saved cards still in the pack; selecting two cards produces deck count 2.
- Browser verified sentence-frame insertion into Pip's thought input, mode changes preserving exactly one contribution per actor in the database, and no playback/reorder controls. Server also rejected an unfinished `___` frame at Drama review (409).
- Desktop measured editor 689.73px and sidebar 344.87px (ratio 1.99998), without horizontal overflow.
- Thought trail was measured to end before the actor box; expanded editor spacing prevents the circles from covering the face. Other speech bubbles remain visible beside it.
- TypeScript and production webpack build passed. Test activity used only the synthetic DramaPreviewQA account; its named QA drafts remain for inspection. Image generation was not exercised; the existing local preview background was used.

Structured results: `story-gate-drama-checks.json`.

## Browser proof

- `drama-thought-bubble-2026-10-04.jpg`
- `map-compact-title-2026-10-04.jpg`
- `canvas-optional-check-2026-10-04.png`
- `new-story-empty-deck-2026-10-04.png`
- `story-writing-two-thirds-2026-10-04.png`
