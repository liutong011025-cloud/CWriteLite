# CWrite Lite — local verification

## Current original farm + beginner tour — 2026-10-03

- The user-rejected panel-based home was removed from rendering. The original composition now uses the refined 1920 × 832 backdrop, original illustrated image controls and existing transparent animation layers. Corrected own-farm image/target alignment by avoiding duplicate CSS translation; the other-farm behavior remains unchanged.
- In the actual desktop browser, Start Writing opened the original map, Writing Board opened saved writing and teacher/peer comments, the friends sign opened navigation, and the cottage Settings control opened the existing profile editor. Cagent opened and closed; a value label opened the canonical growth record. No profile changes were saved and Tony's drafts were not edited.
- The adjacent bulb opened all six correctly named tour steps. Next, completion, reopening at step one and Escape-to-close were verified; closing restored focus to the bulb. Thick white dashed target outlines and arrows were visually checked for writing, garden and settings. Guide targets are measured from live controls and remeasured on resize. Twelve shallow wooden labels have dark readable text and sit above animated trees.
- Desktop layout was visually verified using a temporary 1440 × 900 browser size (effective page viewport 1297 × 811 at the user's current zoom); this is a desktop platform, not a mobile layout. All twelve wooden labels remained above the footer, and animation styles were running for the canopy, swing, four birds and twelve trees. Screenshots: `docs/screenshots/farm-original-refined.png` and `docs/screenshots/farm-guide-garden.png`. Final TypeScript and production build passed. The temporary viewport override was reset after verification.

## Writing-first farm homepage — 2026-10-03

Superseded: this panel-based layout was rejected by the user and is no longer rendered.

- Replaced the own-farm backdrop and layout with a prominent Start Writing station, a central interactive swing bear, two secondary destinations, and a twelve-tree growth garden. Canonical value IDs, saved tree stages and growth records remain unchanged; short English labels explain each value, and its original name remains available in the accessible label and growth dialog.
- Actual browser checks passed for Start Writing → Writing Map, My Writing → saved stories/reviews, Friends’ Farms → driving-bear navigation, Settings → existing settings, tree → growth record, and Cagent opening/closing. Tony's draft content was not edited.
- At the actual 1153 × 649 viewport, the document has no scroll overflow, all twelve trees remain visible, and the garden ends above the compact 32px footer. Swing, four birds and twelve trees have active staggered CSS animations; reduced-motion preferences disable the loops. This is a GIF-like live scene, not a flattened GIF file.
- TypeScript passed after the final changes. The production build passed during this refinement. Screenshot: `docs/screenshots/farm-writing-first.png`. New background: 1920 × 1080 WebP, 220,492 bytes; generation prompt and asset provenance are in `docs/ASSETS.md`.

Checked on 2 October 2026 using the running app, an independent local PostgreSQL database and a disposable verification account.

## Verified flows

- Original login without role choice; Tony's saved character deck starts empty.
- Student drawing produces real canvas strokes; pencil, eraser, clear and undo controls are present.
- Character adoption, editing and persistence; changing a library card leaves an existing story's saved character snapshot intact.
- Draggable Story pin, saved map flag and resumable draft. Map now stays inside the illustrated desktop frame.
- Canvas cards, manual labeled arrows, AI suggested relationships and explicit use/skip.
- Five mountain sections, writing restoration after reload, suggestion insertion and undo.
- Real DeepSeek requests: appearance vocabulary, setting vocabulary, incomplete sentence frames, feedback and Cagent chat. Suggestions change without rewriting student text.
- Completed story saved to map; two evidence-linked farm growth records.
- Unauthenticated reads rejected, another account's character edit rejected, student research export rejected. Trusted teacher login works without a role selector; teacher export contains event records and revisions.
- TypeScript checking and production build.
- Latest writing UI: single-row header checked at 1440px and 1180px desktop widths, original white logo verified, Cagent paws visually aligned to the stage board, contrasting violet bubble, and Beginning/Rising Action switching verified. TypeScript check passed after this refinement.

## Screenshots

Files in `screenshots/` are captured from the actual app. The rabbit is a temporary verification character adopted from the original idea pack, not a fixed character assigned to Tony. Earlier screenshots document intermediate styling; files ending in `-desktop` and `writing-desktop.jpg` document the final desktop refinement.

## Latest desktop corrections

- Removed the sidebar, internal lower forest strip and nested map window; the main panel has small outer margins. Verified Story-only pin shelf has two compartments and no Level UI.
- Farm and the original driving-bear/GPS page have no global header. Farm titles have capped font sizes, ignore pointer input and sit below the Cagent bubble; a live DeepSeek farm response displayed successfully.
- GPS selector follows the illustrated white input window; enlarged text fits with padding. Friend list loads Tony, and the return button remains within the visible viewport when the background is cropped.
- Created Fern with species Fox, optional age, appearance and traits. Focusing Traits/Appearance changes tips; tapping a trait chip updates Traits. Simulated portrait generation, explicit portrait acceptance and character saving passed. Database retains species and records `image_mocked` separately from real generation.
- Saved Fern entered a new canvas with its traits; the story mountain and writing page opened. Future workflow steps stay disabled until reached. Tony's empty deck was not populated by this test.
- Latest TypeScript and production build passed. Screenshots include `navigation-desktop.jpg`, the current map/studio/writing pages and the farm bubble view.

## Additional visual corrections

- Checked at a desktop viewport: full character portraits on canvas, warm card edges and tool icons, and setting background beneath an ivory veil. A simulated setting was added to the disposable account's draft and displayed behind its cards.
- Character Idea Pack opens directly in the character page modal; separate Story Sparks navigation is removed.
- Writing has no duplicate Cagent chat panel or Cagent Feedback button. The stage-board mascot and contextual suggestions remain.
- Farm branding sits further right and Hello there is smaller. Login image source is the original `logo-white.webp`, matching the header.
- Production build and TypeScript pass. Actual screenshots: `story-canvas-desktop.jpg`, `character-deck-desktop.jpg`, `login-desktop.jpg`, `farm-desktop.jpg`, `writing-desktop.jpg`.

## Latest pack, connection and writing changes

- Actual login screen appeared even with a session cookie. Login and header show the combined white/gold CWrite logo and tilted yellow cursive lite. Login/primary buttons use olive.
- Live DeepSeek returned three proposals visible as clickable pale dashed canvas edges. Pressing Enter on a canvas proposal converted it to a saved connection and removed that proposal, leaving the others available.
- Long connection labels wrap within the surface. Live DOM bounds confirmed all five displayed labels avoid the cards; ResizeObserver supplies actual card dimensions at each viewport size. Geometry tests exercise long unbroken words, label bounds, avoidance of nearby labels and valid/invalid drag destinations. Pointer capture and live line code are implemented. This DOM-only browser tool cannot synthesize a physical pointer drag; mouse dragging still needs a manual check in the preview. The keyboard connection path successfully opened the relationship dialog and saved a long label.
- A disposable test account's repeated-word draft stayed in the same section with a revision prompt. A simple EFL paragraph with errors passed; live Cagent identified Pip, the river obstacle and the lost-letter goal, then Next Section advanced to Climax.
- Live API checks rejected meaningful but unrelated robot/football text, advancing without prior approval, premature finish and forged approval events. Approval signatures ignore card movement but invalidate changed plan/text. Tony's content was not edited.
- A full positive flow with five short synthetic EFL sections and the same canvas passed each section in sequence; all five current approvals then allowed entry to the review screen. The actual UI Review my story button displayed all five saved sections. This confirms progression rather than only rejection cases. The temporary LiteInteractionCheck account was removed after verification; screenshots retain synthetic test examples.
- Meaningful edits to a finished story return it to a savable draft; moving cards alone preserves completion. Regression checks cover this distinction.
- `node scripts/verify-section-gate.cjs` and TypeScript passed. Production build passed. Latest screenshot files: `login-lite-logo.jpg`, `foil-character-pack.jpg`, `canvas-connection-preview.jpg`, `writing-live-coach.jpg`. These captures supersede earlier styling screenshots; fixture characters are not defaults assigned to Tony.

## Image connection

## Farm animation and footer — 2026-10-03

- Browser preview confirms complete transparent canopy edges, no soil attached to the white hen, no duplicate hanging swing ropes, and both clickable signs aligned to the same post.
- All four foreground birds use 320px transparent WebP sprites, totaling 86,632 bytes. The green-headed duck has a complete head and a staggered peck animation. Browser inspection confirmed loaded sprites and active transforms; birds stay inside the visible foreground when the backdrop crops its sides.
- Footer is 32px tall with fixed pixel typography and compact institution logos. The farm reserves that height. Browser bounds confirm every bird ends above the footer; document height matches the viewport without a scroll overflow. Full AI notice opens in a readable popover and closes again.
- Checked Cagent Close, sound toggle and restoration, lower sign to Writing Map, and upper sign to friend navigation. Tony's draft content was not changed.
- TypeScript and production build passed. Screenshot: `docs/screenshots/farm-fixed-layers.png`. Bitmap prompts and final asset paths: `docs/ASSETS.md`.

The original local project did not contain `FAL_KEY`. Character portraits are simulated in this development preview, as authorized by the user. The Fal integration uses the original provider methods; real portrait/map generation still needs that key before it can be verified. The mock is disabled in production. Story saving is independent of map-image availability. No live GitHub repository or Vercel deployment has been published.

## Latest farm and four-corner canvas checks — 2026-10-03

- The actual farm preview shows no Your Growth Garden plaque. Enlarged Settings and Writing Board foreground sprites cover the controls without replacing or editing the background. Both direction signs remain aligned on their pole with comparable proportions. Footer height is now 48px, superseding the earlier 32px check.
- All twelve original canonical value names render on wooden labels. Browser measurements confirm nowrap and no horizontal text overflow, including Respect for Others. Original value IDs and growth data are retained.
- In Tony's actual Story Canvas, the generated forest setting appears only as the softened background; only Fox and Pip render as cards. Each has four visible corner anchors.
- A physical pointer drag from Fox's top-right anchor to Pip's top-left anchor successfully opened the Fox → Pip relationship dialog. The dialog was closed without saving; Tony's draft content was not changed. This supersedes the earlier note that physical dragging could not be checked.
- Geometry checks passed for all four corner coordinates, nearest-corner selection, moved/resized cards, valid/invalid drops and connection-label bounds. TypeScript and the isolated production build passed.
- Actual screenshots: screenshots/canvas-four-corners.png and screenshots/farm-labels-and-signs.png.

## Optional guides and final farm/map corrections — 2026-10-03

- Actual browser walkthroughs completed all three map steps, all four canvas steps and all six writing steps. All six studio steps displayed; Escape closed the studio guide and returned focus to the bulb. No character was created and no story text was entered or changed during these checks.
- The final farm screenshot confirms the spray bottle, watering cans, surrounding grass/flowers and hive are visible. Soil redraw is masked inside the original planting footprint. Twelve labels fit on one line with no horizontal overflow at the default desktop viewport. Saplings and labels share the twelve cell centres.
- Bulbs use guide-bulb-wiggle and Start writing uses farm-start-writing-glimmer; both respect reduced-motion preferences. Top-left mute and guide controls both measure 68px.
- Map dock shows the original /storypin.webp again, with the new box at 204px. Continue writing retains its paper/book marker. The map is 650px high at the default viewport. Measured document height is 844px and footer bottom is 843.28px (subpixel rounding), confirming no white area beneath it.
- The final isolated production build passed, including TypeScript checks and static page generation, with the spray-bottle mask included. Source image originals are retained. No deployment was performed.
- Proof screenshots: screenshots/farm-soil-decoration-fixed.png and screenshots/map-restored-pin-taller.png. Earlier map-new-pin-box.png depicts the superseded replacement dock pin.

## Restore the painted farm soil — 2026-10-03

- Supersedes the soil-overlay checks above: removed the entire artificial soil redraw, including its rectangular exclusions around the watering tools. The original painted background and its texture are visible again.
- Enlarged the My Farm scenery by 3.5%; the measured foreground coordinate system uses the same scale so the interactive controls and moving scenery remain aligned.
- Moved the six sapling columns slightly inward to clear the watering can. Value labels fit their text, with space between signs, rather than filling every planting slot. All twelve labels remain on one line, with no measured horizontal overflow.
- Actual browser screenshot: screenshots/farm-original-soil-restored.png. TypeScript check passed. No story data was changed and no new image download was added.

## Story and Drama shared flow — 2026-10-03

- Saplings now use the actual six inner painted cells in each row, including the different centres of the lower row. The original soil remains visible. Screenshot: screenshots/farm-saplings-in-beds.png. This supersedes the earlier uniform six-column placement.
- Physically dragging the Drama dock pin created a draft at its drop coordinates. Shared Story character cards, two backgrounds, actor dragging/flipping, two speakers, thoughts, actions, stage directions, scene switching and line ordering were exercised in the browser. Saved actor placement survived reopening.
- All six Write Script guide steps were walked and closed. Empty/incomplete review was refused. A completed two-scene script was published and appeared at the original pin, with Drama attribution and its illustrated local preview.
- The actual Writing Board displayed the completed Drama script, both scenes and their student text. Its Edit button reopened the Drama editor with the same data. The browser Download script button wrote A Small Act of Kindness.txt (606 bytes) to Downloads; the saved file contains both scenes, dialogue, thought and stage directions. The IAB download-event listener timed out despite the file being saved; file content was inspected directly.
- API checks confirm shared persistence, work ownership, atomic publication/map flags, retained pin coordinates, revision reopening, and the unchanged Story five-part approval gate. Helper checks cover normalization, safe image URLs, foreign cast rejection, scene limits, EFL script checks and export serialization.
- Growth checks quote the saved help and teamwork lines for values 7 and 12. Repeating the request did not increase stages again. Both records identify Drama. Model service failure used the conservative explicit-evidence fallback; successful live model feedback was not verified.
- Latest actors render at 26% stage width with movement bounds, speech placement near stage edges, and stale background invalidation when the scene description changes. Browser editor and map screenshots: screenshots/drama-script-editor.png and screenshots/drama-map.png.
- Nearby map labels now separate automatically and avoid the pin dock. Dotted leaders retain their relationship to saved coordinates; the coordinates and illustrated work elements do not move. Reopened works use one draft entry instead of covering their previous title with a second label. Browser screenshot confirms the adjacent Story draft, Drama draft and finished Drama label are distinct. Geometry checks cover nearby labels and edge clamping.
- Final isolated production build passed compilation, TypeScript, static page generation and route tracing. Local image/map previews use the previously authorized simulation; no live deployment was performed. Details: DRAMA.md, drama-check-results.json, drama-growth-check.json and drama-live-check.json.

## Compact scene editors and contrasting examples — 2026-10-03

- Two final examples are available through the yellow lightbulb View Examples button immediately left of the zoom group, aligned to the toolbar right edge. The earlier three similar example layouts have been replaced by a simple pastoral plan and a complex science-fiction plan. Each has its own generated background and object artwork; the second uses new astronaut/robot characters and two solution routes.
- At the actual 1153×649 browser viewport both dialogs and right-side stories have equal client/scroll heights. All visible cards and connection labels stay inside the canvas, with no measured pairwise overlap. Story stays on the right; neither pane needs vertical scrolling. Tabs wrap with arrow keys; Escape closes the window and restores focus to View Examples. Examples are read-only and never applied to the student draft. Proof: screenshots/canvas-example-pastoral.png, screenshots/canvas-example-scifi.png, screenshots/canvas-toolbar-examples.png.
- Story Canvas contains no Ask Cagent control. Actual Suggest connections changed the sprite to cagent-director-v2.webp, returned three contextual suggestions from live text AI, and displayed pale proposal connections. Suggestions did not become saved edges without student acceptance.
- Drama coach is named Cagent again, with no duplicate help button. Actual Get suggestions changed its sprite to the response pose and returned prompts using Fox/Pip traits, the sunny park, path/tree and existing dialogue. Its separate chat input remains available. Direct-stage previews remained disjoint. The shared purple character pack has no extra backing container.
- Map dock uses the original pin artwork with object-fit:contain and no stretching; Story sits centrally in the upper shelf. Draft continue images are larger, with independent delete controls. The recap Keep my writing route was checked. Disposable draft API checks cover published/missing/stale record guards, map-reference cleanup and unchanged shared characters; student drafts were not deleted.
- New Cagent assets retain transparency and their original aspect ratio. The Story character selection uses the requested leaning-on-desk pose. Hover no longer changes the sprite; explicit assistance controls do. The writing progress coach sits in the right sidebar and no longer covers header navigation.
- Farm uses the cloudless base plus six SVG cloud layers. Actual browser computed styles showed six running 55–86-second animations with distinct translations; the cloudless background loaded. No animated bitmap or video download was introduced. Proof: screenshots/farm-drifting-clouds.png.
- This supersedes the earlier note that live text AI could not be verified: both Story connections and Drama suggestions returned actual scene-based results. The platform image API still uses the authorized local development simulation; the static example art and new poses were produced through built-in image generation. No deployment was performed.

- Final production build passed compilation, TypeScript and all static routes after the two-example redesign. Actual Story writing measured zero overlap between the stage tabs and the sidebar coach; screenshot: screenshots/story-writing-clear-progress.png.

## Restore Cagent speech placement — 2026-10-03

- Supersedes the sidebar-coach placement above: Story coach is back above the progress container, with its speech on the left and the leaning bear on the right. It stays in document flow to reserve its own height; progress labels remain clear. The old negative image margin has been removed, and the paws meet the top frame. A bottom-anchored breathing motion keeps the contact point fixed. There is no Ask Cagent button here; the existing contextual automatic update remains.
- Drama speech also sits left of the bear, with the same 18px, weight-700 typography, muted ink and pale-purple bubble. Scene creation uses the existing transparent standing planning pose instead of the seated pose; no new image file is needed. Script mode retains the standing book pose. AI Suggestions and scene chat still work.
- TypeScript checks passed. Screenshots: screenshots/story-bear-rests-on-frame.png and screenshots/drama-bubble-left.png.
