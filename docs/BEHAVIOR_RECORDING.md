# Student behavior recording

Log in as **Tony**, open **My Farm**, then **Behavior records**. Start a batch before the activity and stop it afterwards. Select the batch and download Excel or CSV from the same panel. Recording is off by default. Tony's demonstration events are tagged and excluded from exports unless “Include Tony test records” is selected.

The switch applies to authenticated students using this platform. Open student pages check the switch every two seconds; newly opened pages join the current batch. Join times are recorded, so the export does not imply that earlier activity was captured. The teacher vocabulary interface and existing writing approvals work as before.

## Coding and aggregation

The export uses category, subcategory and functional code. Categories cover planning, independent writing, AI help, AI output evaluation, revision, completion, pauses, navigation and farm / peer interaction. System and administrative events have separate origins. The Excel file includes the coding dictionary and recording parameters. The dictionary includes supported future actions, such as video, whose UI may currently be hidden.

- Drawing and erasing are episodes, not pointer movement rows. A tool / colour change, leaving the field, or five seconds without drawing closes an episode. A continuous episode is segmented every thirty seconds, retaining the same episode ID. Stroke counts count completed pointer gestures; a stroke crossing a segment boundary is counted when completed. Pen contact duration and episode wall time are separate. Before / after sketch snapshots are research copies; the student's original drawing is unchanged.
- Text input is grouped until two seconds of inactivity, field blur, context change or fifteen seconds of continuous input. Each row retains field, before / after text, insertion / deletion counts and provenance. Equal-length replacement is a revision. Pasting has an unknown external source. AI insertion and subsequent edits have separate codes; mixed text is not assumed to be entirely student-authored or AI-generated.
- All observable gaps between student actions are retained in `precedingGapMs`. A visible gap of at least ten seconds also gets a pause row; intervals above sixty seconds have the `macro` band. Background time has a separate code. AI request waits are recorded separately and can overlap visible no-input time. **No-input time alone does not establish that a student is thinking.** These intervals should not be added together as mutually exclusive time categories.
- AI requests, received responses and outputs displayed by instrumented panels are distinct. Automatic coaching and required section gates do not count as voluntary student help seeking. Output display does not prove reading or evaluation.

## Reliability and isolation

The recorder passively observes actions and does not replace the editor's handlers. Logging, controls and exports use separate research tables and a small database connection pool. No writing request waits for a behavior upload. A recorder error does not display an error dialog to students.

Records are stored in IndexedDB, sent in bounded batches, retried after connection failure, and deduplicated by event UID. Queues belong to the authenticated account; the server rejects uploads made under another account. A stopped batch still accepts late delivery of events that occurred inside its time window. Export again after students reconnect to include late arrivals. IndexedDB failure falls back to a bounded memory queue; closing that page can lose unsent memory-only records. Browser / device storage eviction can also lose unsent data.

Oversized image copies are omitted from the behavior upload and marked in `payloadOmissions`; original drawings, generated portraits and saved works remain intact. A segment crossing the stop boundary has a clipped time interval. When a text snapshot includes input captured during the short stop polling delay, `contentExtendsBeyondCutoff` marks that limitation.

Times are stored as absolute UTC instants. Excel includes UTC and Beijing time. Export uses keyset pagination with no 10,000-row cap and splits large datasets across worksheets. Excel cells have a text length limit; CSV retains full text payloads. CSV formula-like values are escaped and XLSX text is written as literal strings.

Apply both new Prisma migrations when deploying. They add / adjust only `ProcessRecording` and `ProcessEvent`. The existing approval `ResearchEvent` table must remain enabled. `npm run db:migrate` applies all pending migrations.

## Temporarily hidden video UI

`FEATURES.dramaVideo` in `lib/features.ts` is currently `false`. This prevents the drama video panel from mounting, including its status requests. Set it to `true` to restore the panel. Video APIs, generation code, stored videos, script download and printing are retained.

## Verification

`node scripts/check-process-recording.cjs` checks aggregation, timestamps, revisions, pause semantics, oversized payloads and export escaping. `node scripts/verify-process-flow.mjs` exercises the dedicated local preview on port 3010 / database port 54348. It uses temporary accounts and batches, checks browser autosaving during log failures, actual pen / eraser drawing and character saving, permissions, retry / deduplication, stop boundaries, hidden video UI and complete export beyond 10,000 rows, then removes its fixtures. It refuses to interrupt an existing recording. Chrome is required for this browser check. `python scripts/check-process-export.py` independently reads the generated Excel and verifies row completeness and literal formula-style text.
