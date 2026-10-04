# CWrite Lite

Independent Next.js + PostgreSQL/Prisma project, based on the user's final storybook UI. The original `CWrite` folder and its database are not modified.

## Local preview

1. Install dependencies: `npm install --legacy-peer-deps`.
2. Copy `.env.example` to `.env` and supply a **new** PostgreSQL connection string plus `DEEPSEEK_API_KEY`. Use `FAL_KEY` for real image generation, or set `CWRITE_LOCAL_MOCK_IMAGES=true` for local simulated character portraits.
3. Run `npm run db:migrate` and `npm run db:seed`.
4. Run `npm run dev`; open http://localhost:3010.

The local setup created during development uses a separate PostgreSQL 17 cluster at `.local-postgres/data`, port **54339**, database **cwritelite**, listening only on 127.0.0.1. Restart it with `scripts/start-local-db.ps1` if needed. Do not use this local connection on Vercel. Local trust authentication is confined to the development cluster; use your hosted provider's credentials in production.

Test account: **Tony / 123321**. The seed script does not reset an existing account or create sample character cards. `SEED_TONY_PASSWORD` can override the password on first creation.

The local portrait preview uses the student's drawing or an existing illustration after they create a character. It is labeled as simulated and records `image_mocked` events. This mode only runs in development; production still requires `FAL_KEY`. Chat and vocabulary requests continue to use DeepSeek. The current local preview has simulated portraits enabled.

## Features

- Original login scenery without role selection; a shared white/gold logo with a tilted yellow cursive “lite”. Login stays available on app entry.
- Original farm, trees, writing board, settings, visits and feedback; Story and Drama map pins.
- Per-account drawing, AI portraits, editable saved character cards, card reuse and optional idea packs.
- Story canvas with draggable cards, actual pointer-drawn connections, wrapping labels, illustrated settings under an ivory veil and clickable glowing AI relationship previews.
- Foil character idea pack above the shelf, with a tear line, restrained wiggle and shine.
- Start writing leads to five Freytag sections; the story mountain remains an optional planning view. Contextual words and incomplete sentence frames, automatic canvas-aware Cagent questions and formative section checks allow understandable imperfect EFL language. Server approvals guard progression and completion.
- Automatic draft saves and revisions, story snapshots of character details, map flags, map art updates, evidence-linked farm growth, download/print.
- Drama scenes share the character library with Story. Students place characters and write one speech or thought per actor, with contextual AI suggestions, optional completion review and a complete final tableau.
- Drama animation preview uses existing student words and an AI-checked presentation order. The selected future video model is `doubao-seedance-2-5-260628`; real video submission and export are not connected yet.
- Teacher vocabulary collection and authenticated research export. Registering always creates a student account; promote a trusted teacher in the database to use the teacher panel. There is no login role selector.

## GitHub / Vercel preparation

Create an independent repository from this folder. `.gitignore` excludes credentials, database files, generated dependencies and caches. Add a new Vercel project for that repository. Use a new hosted PostgreSQL database (same technology as CWrite; separate data), set `DATABASE_URL`, `DEEPSEEK_API_KEY`, `FAL_KEY` in Vercel. Apply `npm run db:migrate` against the new database before using the deployment; run the seed once with `SEED_TONY_PASSWORD` if Tony is needed there. Build: `npm run build`; start: `npm start`.

AI provider paths are retained: DeepSeek `deepseek-chat` and Fal `fal-ai/nano-banana-2` / `fal-ai/nano-banana-2/edit`. Keys stay on the server. AI availability and hosted image retention depend on those providers. Generated image references and drawings are saved in the database. No GitHub repository or Vercel deployment is created automatically by this local implementation.

See [docs/DESIGN.md](docs/DESIGN.md) for the confirmed design, verified academic references, and the scope of research claims.

See [docs/AI_API_AND_VERCEL_SETUP.md](docs/AI_API_AND_VERCEL_SETUP.md) for the full AI API inventory, Vercel environment variables and selected video configuration.

## Project ZIP

The source ZIP includes code, public image assets, database migrations and deployment documentation. It excludes API keys (`.env`), local database contents, installed dependencies and build caches. After extracting, follow the local preview steps above or the Vercel configuration guide. Recreate the ZIP using PowerShell 7 with `pwsh -File scripts/package-project.ps1`.
