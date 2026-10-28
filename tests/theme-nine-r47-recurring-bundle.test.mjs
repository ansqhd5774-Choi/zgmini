import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

test('single R47 Windows CMD bundles 16 SHA-exact sources without scheduling or publishing',()=>{
  const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const file=path.join(here,'scripts/pc-writer','THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd');
  const content=fs.readFileSync(file,'ascii');
  assert.equal(/(?<!\r)\n/.test(content),false);
  assert.equal(/[^\x00-\x7F]/.test(content),false);
  const kinds=['ENTRY','PLANNER','SCORER','MIX','R35','R34','R24','R25','SELECT',
    'R2','R32','R32PRE','PAIR','ROSTER','AUM','APPROVAL'];
  for(const kind of kinds){
    const m=content.match(new RegExp(`::R47_${kind}_BEGIN\\r\\n([\\s\\S]*?)::R47_${kind}_END`));
    assert.ok(m,`missing ${kind}`);
    const bytes=Buffer.from(m[1].replace(/[^A-Za-z0-9+/=]/g,''),'base64');
    const digest=createHash('sha256').update(bytes).digest('hex');
    assert.ok(content.includes(`if(h(b)!=='${digest}')`),`SHA not embedded for ${kind}`);
    assert.ok(bytes.length>20,`empty ${kind}`);
  }
  const prelude=content.split('::R47_ENTRY_BEGIN')[0];
  assert.ok(prelude.includes('--update-private'));
  assert.equal(prelude.toLowerCase().includes('schtasks'),false);
  assert.equal(prelude.includes('wrangler'),false);
  assert.ok(fs.statSync(file).size<500_000);
});
