import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('theme fear-greed read route uses the configured core D1 binding',()=>{
 const route=fs.readFileSync(path.join(root,'app/api/theme-fear-greed/route.ts'),'utf8');
 const worker=JSON.parse(fs.readFileSync(path.join(root,'wrangler.candidate-r52.json'),'utf8'));
 const core=worker.d1_databases.find(x=>x.binding==='DB_CORE');
 assert.ok(core);
 assert.equal(core.database_id,'d7a25e98-8d52-47a4-9e37-695e4d84d18b');
 assert.match(route,/readThemeEtfOnly\(runtime\.DB_CORE\?\?runtime\.DB\)/);
 assert.doesNotMatch(route,/\.run\(|\.batch\(|INSERT\b|UPDATE\b|DELETE\b/i);
});
