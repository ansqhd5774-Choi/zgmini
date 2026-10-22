import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const popup = readFileSync(path.join(root, 'app/about-intro-popup.tsx'), 'utf8');
const styles = readFileSync(path.join(root, 'app/about-intro-popup.module.css'), 'utf8');
const layout = readFileSync(path.join(root, 'app/layout.tsx'), 'utf8');

test('site-wide introduction is connected and uses the approved artwork', () => {
  assert.match(layout, /<AboutIntroPopup\s*\/>/);
  assert.match(popup, /src="\/about-intro-popup-r1\.webp"/);
  assert.ok(statSync(path.join(root, 'public/about-intro-popup-r1.webp')).size > 10_000);
  assert.match(popup, /href="\/about\/"/);
  assert.match(popup, /'\/about'/);
});

test('a dismissal lasts the current tab session, or seven days when selected', () => {
  assert.match(popup, /window\.sessionStorage\.getItem\(DISMISSED_SESSION_KEY\)/);
  assert.match(popup, /window\.sessionStorage\.setItem\(DISMISSED_SESSION_KEY, '1'\)/);
  assert.match(popup, /window\.localStorage\.getItem\(HIDDEN_UNTIL_KEY\)/);
  assert.match(popup, /checkboxRef\.current\?\.checked/);
  assert.match(popup, /Date\.now\(\) \+ SEVEN_DAYS_IN_MS/);
  assert.match(popup, /7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(popup, /dialogRef\.current\?\.close\(\)/);
});

test('the popup keeps explicit controls, dialog semantics, and mobile constraints', () => {
  assert.match(popup, /<dialog/);
  assert.match(popup, /showModal\(\)/);
  assert.match(popup, /onCancel=/);
  assert.match(popup, /type="checkbox"/);
  assert.match(popup, /aria-label="7일 동안 보지 않기"/);
  assert.match(popup, /aria-label="닫기"/);
  assert.match(styles, /calc\(100vw - 24px\)/);
  assert.match(styles, /calc\(100dvh - 24px\)/);
  assert.match(styles, /:focus-visible/);
});
