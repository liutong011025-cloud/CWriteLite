const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// Hard-coded disposable local database; no production URL can be supplied.
process.env.DATABASE_URL = 'postgresql://cwrite_test@127.0.0.1:54348/postgres?connection_limit=3&pool_timeout=10';
function loadTs(path, customRequire = require) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} }; new Function('exports', 'module', 'require', compiled)(mod.exports, mod, customRequire); return mod.exports;
}
const config = loadTs('lib/database-config.ts');
const { prisma } = loadTs('lib/prisma.ts', name => name === './database-config' ? config : require(name));
async function slow(tx) { await tx.$executeRawUnsafe('SELECT pg_sleep(5.5)'); return tx.$queryRawUnsafe('SELECT 1::int AS value'); }
(async () => {
  try {
    await assert.rejects(prisma.$transaction(slow, { timeout: 5000 }), error => error.code === 'P2028');
    assert.equal((await prisma.$transaction(slow))[0].value, 1);
    console.log('Reproduced the old five-second transaction failure; the same delayed transaction commits with the new bounded default. No application data written.');
  } finally { await prisma.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
