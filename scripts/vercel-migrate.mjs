import { execFileSync } from 'node:child_process'

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
