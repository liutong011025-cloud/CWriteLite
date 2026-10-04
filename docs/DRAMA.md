# Story and Drama

Both writing types begin in My Writing Map. Drag either pin to choose a location, or click a pin and then the map. Existing drafts each retain their own continue marker. A completed piece adds its own flag at the exact original coordinates.

## Drama flow

1. **Create Scenes**: describe and generate the background, then choose a cast from the shared character deck. Characters can be dragged, resized and flipped; arrow keys can also move them.
2. **Write Script**: write dialogue and private thoughts directly in the characters’ stage bubbles; write visible actions in the stage action editor. Each scene retains its own background, actors, positions, lines and directions. AI Suggestions reads the actual background, cast, traits and current lines; choosing a question opens a blank bubble for the student’s own words. Scene preview plays the lines in order.
3. **Review & Finish**: read the complete script, request a review, keep editing, download a text script or print it. Finishing saves it to the map and Writing Board. Each scene needs a generated background, a cast and at least two dialogue lines. If it has multiple actors, two speakers must respond. Short EFL language and common one-word greetings are accepted; empty or repeated lines need revision.

All three Drama screens include the same optional lightbulb guide as Story. My Cast opens the purple Character Idea Pack in a same-page window, with all available shared character cards and search. The pack has no separate container behind it. Cagent uses transparent WebP poses and reads the current scene; there is no duplicate Ask Cagent button under it. Requesting AI Suggestions or sending a scene question switches its pose while processing. Final output is an illustrated scene plan plus an ordered text script, with text download and print controls.

## Shared structure

- Existing user-owned `Character` records and per-work historical snapshots are reused. No separate Drama character account or library is created.
- Existing `Story` records hold both kinds of work. `canvas.writingType` distinguishes Story/Drama; optional `canvas.drama` holds the typed scene project. Existing stories default to Story. This adds no database migration or second save system.
- The server keeps the original work type, user ownership, chapter and pin. It normalizes scene/actor/line data and derives the script from saved student text.
- Completion saves the work and its chapter flag together in a database transaction. Per-user row locking preserves simultaneous publications. Story still uses its original five-part checks; Drama uses scene/script checks and cannot enter the narrative check endpoint.
- Writing Board shows finished Story and Drama works. Readers’ comments retain the correct work type. Drafts are resumed from their map pins.
- Growth records quote actual saved student text, retain Story/Drama attribution and are applied once per work/value. Growth updates lock the current garden row to prevent simultaneous requests overwriting each other. If the text service fails or returns malformed JSON, a limited explicit-evidence checker supports clear offers to help, teamwork and other strongly stated actions; it grants nothing for an unrelated passage. It is logged separately from model analysis.
- Browsing another Drama scene does not reopen a published work as a draft. Changing its text, cast, arrangement or title does. Existing work snapshots and revision history remain available.

## Local preview

Local development keeps the previously authorized image simulation. Background generation displays a reusable WebP preview; completing a work adds a small illustrated map element at its pin. The production path still calls the Fal image service for generated backgrounds and local map edits, now requesting WebP output. Real generation requires the configured production key.

The original Drama pin came from `C:/Users/liuto/Desktop/CWrite/public/dramapin.webp`. Its runtime version is `public/dramapin-small.webp`, 300px wide, alpha preserved, **9,222 bytes**, down from 92,164 bytes. Backgrounds and bears reuse compressed assets.

## Verification

- A separate `DramaPreviewQA` account was used. Existing student stories were not edited.
- Actual pointer drag from the Drama dock pin created a Drama draft. Actual actor drag and flip persisted after switching scenes and reopening the work.
- The two-scene fixture includes two speakers, a thought, an action and stage directions. Line reordering, switching scenes, completion, map reading and Writing Board listing were checked in the browser.
- Empty completion was refused. Server API checks confirm normalized persistence, map coordinates/type, reopening revisions and the unchanged Story publication gate.
- Helper checks cover foreign cast exclusion, unsafe image URLs, scene limits, invalid/empty/repeated script lines, exported thoughts/actions, publication invalidation and growth idempotence.
- The published fixture’s help/teamwork lines grew values 7 and 12. A second growth request left all tree stages unchanged; both records identify Drama and quote text from the saved script.
- Browser layout at the default 1153px desktop viewport has no horizontal document overflow. Screenshots are in `docs/screenshots`.
- The actual Writing Board Edit control restored the published Drama in its editor. Download script produced a 606-byte UTF-8 file with both scenes, speech, thought and stage directions. The final isolated production build passed compilation, TypeScript and static page generation.
