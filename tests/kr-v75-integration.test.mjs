import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('integration keeps V75 grid and excludes unavailable country APIs',()=>{const s=read('app/country-fear-greed.tsx');assert.ok(s.includes('zg-country-grid'));assert.ok(s.includes('KoreanCountryCard'));assert.ok(s.includes('countries.filter((country) => country.code !== "kr" && Boolean(country.api))'));assert.ok(!s.includes('/api/null'));assert.ok(!s.includes('sentiment-grid-global'));for(const endpoint of ['fear-greed','nikkei-fear-greed'])assert.ok(s.includes(endpoint));assert.ok(s.includes('code: "cn"'));assert.ok(s.includes('code: "eu"'));});
test('Korean compact view uses current card tokens and shared composite chart',()=>{const s=read('app/korea-composite-view.tsx');assert.ok(s.includes('zg-country-card is-clickable'));assert.ok(s.includes('ScoreScale score={c?.displayScore??null}'));assert.ok(s.includes('CompositeChart item={c} mini'));assert.ok(s.includes('갱신 대기'));});
test('latest branding and navigation remain present',()=>{assert.ok(read('app/layout.tsx').includes('Naver'));const p=read('app/page.tsx');assert.ok(p.includes('zgmini-name.png'));assert.ok(p.includes('zg-dashboard'));});
