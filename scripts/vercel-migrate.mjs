import { execFileSync } from 'node:child_process'

const failedMigration = '20261002030000_character_species'

function prisma(args) {
  execFileSync('npx', ['prisma', ...args], { stdio: 'inherit' })
}

try {
  prisma(['migrate', 'deploy'])
} catch {
  console.log(`Clearing failed migration ${failedMigration}, then creating tables.`)
  prisma(['migrate', 'resolve', '--rolled-back', failedMigration])
  prisma(['migrate', 'deploy'])
}
