import { execFileSync } from 'node:child_process'

// A branch preview must not migrate a shared production database automatically.
if (process.env.VERCEL_ENV === 'preview' && process.env.CWRITE_MIGRATE_PREVIEW !== 'true') {
  console.log('Preview database migrations skipped. Use an isolated preview database and CWRITE_MIGRATE_PREVIEW=true to enable them.')
  process.exit(0)
}

const failedMigration = '20261002030000_character_species'

function prisma(args) {
  execFileSync('npx', ['prisma', ...args], { stdio: 'inherit' })
}

try {
  prisma(['migrate', 'resolve', '--rolled-back', failedMigration])
} catch {
  // Already cleared, or this migration is not in a failed state.
}

prisma(['migrate', 'deploy'])
