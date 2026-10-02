import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const config = JSON.parse(readFileSync(new URL('../wrangler.cloudflare.json', import.meta.url), 'utf8'));
assert.equal(config.name, 'zgmini-migration-candidate');
assert.equal(config.main, 'worker/candidate.ts');
assert.equal(config.workers_dev, false);
assert.equal(config.preview_urls, false);
assert.deepEqual(config.routes, []);
assert.deepEqual(config.triggers.crons, []);
assert.equal(config.d1_databases.length, 1);
assert.equal(config.d1_databases[0].binding, 'DB');
if (process.argv.includes('--deployment-readiness')) {
  const unresolved = config.d1_databases[0].database_id === '00000000-0000-4000-8000-000000000000';
  if (unresolved) {
    console.error('BLOCKED: existing D1 account/database binding is unresolved. No deploy attempted.');
    process.exitCode = 1;
  } else {
    console.error('BLOCKED: D1 access, source parity, auth replacement and cutover approval require runtime evidence. No deploy attempted.');
    process.exitCode = 1;
  }
} else {
  console.log('PASS: migration configuration has no domain routes, public preview or cron triggers. Local build only; production readiness unverified.');
}
