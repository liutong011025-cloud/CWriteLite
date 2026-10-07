# Recording delivery load checks — 2026-10-07

The change reduces transport traffic while retaining the existing research coding and aggregation rules. It does not change the Character Deck, Canvas connections, story structures, AI scaffolding, original drawing assets or draft saving behavior.

## Changes

- Recording controls poll about every 15–18 seconds when active, 30–33 seconds when inactive, with up to one further second for timer scheduling. Hidden tabs do not poll. A new page checks immediately. Start recording at least 40 seconds before an activity involving already open tabs; join latency remains visible in the session record.
- Normal delivery batches are spaced 15–18 seconds apart, with jitter. A remaining backlog of at least 50 rows drains every 2–5 seconds. Limits remain 50 rows / 900 KB. Original event UID, sequence, timestamps, text and duration are unchanged.
- Authentication for all three recording endpoints uses the separate research pool and a small SQL join, with session expiry checked against UTC. It no longer loads full user profiles or occupies the writing pool. Identity checks remain fresh on every request.
- Repeated polls share an active recording read for up to three seconds per server instance. The request does not query the last recording separately when it is still the current active batch.
- Cached control responses retain the clock offset measured when the network response arrived; remounting an observer does not interpret an old server timestamp as a new clock sample.
- Malformed / lost receipts leave events pending. Only event UIDs belonging to the sent batch can clear it. Rejected rows receive a durable browser-local recovery copy before removal from the upload queue. Whole-queue counts replace the previous next-batch-only count.
- Failures in recording authentication, delivery and export return JSON and are logged; student writing does not await a research upload.

## Verification

`node scripts/check-process-recording.cjs` passed existing pen / eraser aggregation, text revision, pauses, background time, cutoff, disabled observer and export checks.

`node scripts/check-process-delivery.cjs` ran 100 independent clients through three minutes of the same synthetic writing, planning, AI acceptance and background activity. All 6,300 generated events arrived unchanged. Ten lost responses after a server commit recovered through retries without duplicate identities. Receipt validation, rejected-record retention, exit limits and 125-row backlog draining passed. Uploads were 1,107 versus 5,500 under the prior 2.5-second schedule: 79.87% fewer for this fixture, not a guaranteed reduction for all real activity.

`node scripts/verify-process-load.mjs` ran actual HTTP requests against a local production build and the fixed test PostgreSQL instance (localhost:54348). The writing pool was limited to 3 connections and the research pool to 2. A burst of 100 recording uploads plus 100 draft saves completed successfully. The 5,000 original events were stored once despite a second 100-request replay; all 100 draft contents were checked. Expired sessions, anonymous access, non-admin controls / exports, owner mismatch, legitimate late delivery, rejected out-of-window events and a complete 5,001-event CSV export passed. Temporary accounts, sessions, works and the recording were removed afterwards.

The final local run measured recording control p95 119 ms, event upload p95 268 ms and draft saving p95 356 ms. These are local results, not production latency targets.

The optimized Next.js production build and TypeScript check passed. The temporary front-door maintenance page remains in place. No production database schema changes, paid AI calls or production class load test were performed for these checks.

## Remaining production checks

Local database latency, one local application process and small test profiles do not represent Vercel instance scaling, cross-region latency, plan-wide connection limits, database storage / operation quotas, large real payloads or concurrent paid image generation. Reconcile the database's Available status and deployed commit, then run a controlled test against the actual production stack before admitting 100 students. Retain the maintenance page until that check is complete and reopening is explicitly requested.
