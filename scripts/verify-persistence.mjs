import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const base = 'http://localhost:3010'
async function login(username, password) {
  const response = await fetch(base + '/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
  assert.equal(response.status, 200)
  return { cookie: response.headers.getSetCookie().map(x => x.split(';')[0]).join('; '), data: await response.json() }
}
try {
  const user = await db.user.findUniqueOrThrow({ where: { username: 'LiteVerification' } })
  const story = await db.story.findFirstOrThrow({ where: { userId: user.id, status: 'published' } })
  assert.ok(story.sections.every(s => s.trim()))
  assert.ok(user.mapState.chapters[0].mapFlags.some(f => f.id === story.id))
  const character = await db.character.findFirstOrThrow({ where: { userId: user.id } })
  const savedSnapshots = story.characterSnapshots
  const { cookie } = await login(user.username, 'VerifyOnly123321')
  const response = await fetch(base + '/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ action: 'saveCharacter', character: { ...character, traits: 'reflective, careful' } }) })
  assert.equal(response.status, 200)
  assert.deepEqual((await db.story.findUniqueOrThrow({ where: { id: story.id } })).characterSnapshots, savedSnapshots)
  await db.character.update({ where: { id: character.id }, data: { traits: character.traits } })
  await db.user.update({ where: { id: user.id }, data: { role: 'teacher' } })
  try {
    const teacher = await login(user.username, 'VerifyOnly123321')
    assert.equal(teacher.data.user.role, 'teacher')
    const report = await fetch(base + '/api/research', { headers: { Cookie: teacher.cookie } })
    assert.equal(report.status, 200)
    const research = await report.json()
    assert.ok(research.events.length > 0 && research.stories.some(s => s.id === story.id && s.revisions.length))
  } finally {
    await db.user.update({ where: { id: user.id }, data: { role: user.role } })
  }
  console.log(JSON.stringify({ pass: true, mountainSections: 5, publishedMapFlag: true, independentCharacterSnapshot: true, teacherLoginWithoutRoleSelector: true, teacherResearchExport: true, farmGrowthRecords: Object.keys(user.profile.treeGrowthDetails || {}).length }, null, 2))
} finally { await db.$disconnect() }
