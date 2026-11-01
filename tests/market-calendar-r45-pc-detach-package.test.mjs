import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrapper = new URL('../scripts/pc-writer/MARKET_CALENDAR_R45_PC_DETACH.cmd', import.meta.url);
const readme = new URL('../scripts/pc-writer/README_MARKET_CALENDAR_R45_PC_DETACH.txt', import.meta.url);

test('Windows package wrapper is ASCII+CRLF and defaults to read-only', () => {
  const raw = fs.readFileSync(wrapper);
  assert.ok(raw.every(byte => byte < 128));
  const source = raw.toString('ascii');
  assert.equal(/(?<!\r)\n/.test(source), false);
  assert.match(source, /if "%~1"=="" goto R45_RUN/);
  assert.match(source, /if \/I not "%~1"=="--apply" goto R45_USAGE/);
  assert.match(source, /findstr \/C:"R45_DETACH_PREFLIGHT_READY_NO_CHANGES"/);
  assert.match(source, /if exist "%R45_DETACH_RESULT%"/);
  assert.match(source, /market-calendar-r45-pc-detach\.mjs/);
  assert.match(source, /market-calendar-r51-core-origin\.mjs/);
  assert.doesNotMatch(source, /powershell|schtasks\s+\/change|git\s+pull/i);
});

test('portable package instructions distinguish preflight, apply, and PC success', () => {
  const text = fs.readFileSync(readme, 'ascii');
  assert.match(text, /PREFLIGHT_READY_NO_CHANGES/);
  assert.match(text, /R45_DETACH_INSTALLED_LOCAL_ONLY/);
  assert.match(text, /NOT apply the change to the user's computer/i);
});
