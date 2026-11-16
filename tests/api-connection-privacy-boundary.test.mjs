import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');

test('public Next.js API route is permanently deny-by-default and never touches D1',()=>{
 const route=source('../app/api/api-connection-health/route.ts');
 assert.match(route,/status:404/);
 assert.doesNotMatch(route,/readApiConnectionHealth|\.DB\b|SELECT |public_feed_snapshots|cloudflare:workers/);
 assert.match(route,/no-store/);
});
test('Cloudflare candidate branch cannot serve internal provider telemetry',()=>{
 const worker=source('../worker/candidate-r52.ts');
 assert.match(worker,/if\(path==='\/api\/api-connection-health'\)return new Response\(null,\{status:404/);
 assert.doesNotMatch(worker,/readApiConnectionHealth/);
});
test('public site does not render upstream hostname listing or fetch telemetry',()=>{
 const ui=source('../components/collection-health-indicator.tsx');
 assert.match(ui,/return null/);
 assert.doesNotMatch(ui,/\/api\/api-connection-health|\.host\b|endpointEvidence|fetch\(/);
});
test('private local writer monitoring remains separate from public responses',()=>{
 const pc=source('../scripts/pc-writer/api-connection-health.mjs');
 assert.match(pc,/buildApiConnectionHealthFromLog/);
 const internal=source('../worker/api-connection-health.mjs');
 assert.match(internal,/readApiConnectionHealth/);
});
