import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(root,'scripts','pc-writer','market-calendar-er1-source-readonly.mjs');

test('read-only PC audit reports shape counts but never discloses actuals',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'er1-source-fixture-'));
  try{
    const storage=path.join(folder,'storage');
    fs.mkdirSync(storage,{recursive:true});
    fs.writeFileSync(path.join(folder,'local-market-calendar-r43-reviewed-issuers.json'),
      '{"status":"PENDING"}');
    const db=new DatabaseSync(path.join(storage,'core.sqlite'));
    try{
      db.exec(`CREATE TABLE earnings_history(symbol TEXT,date TEXT,eps REAL,revenue REAL);
        INSERT INTO earnings_history VALUES ('AAA','2026-10-23',3.14,5000000000);
        INSERT INTO earnings_history VALUES ('BBB','2026-07-23',NULL,12345000);
        CREATE TABLE public_feed_snapshots_v1(feed_key TEXT);
        INSERT INTO public_feed_snapshots_v1 VALUES('market-calendar:earnings-display-html');`);
    }finally{db.close();}
    const report=path.join(folder,'result.txt');
    const result=spawnSync(process.execPath,[script,report,folder],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const log=fs.readFileSync(report,'utf8');
    assert.match(log,/STATUS="READONLY_INVENTORY_COMPLETE"/);
    assert.match(log,/"table":"earnings_history"/);
    assert.match(log,/"sampleWithAnyActual":2/);
    assert.match(log,/EXPECTEDREVIEWEDROSTERFILEEXISTS=true/);
    assert.match(log,/APPROVEDROSTERCONFIRMED=false/);
    assert.match(log,/DBWRITES=0/);
    assert.doesNotMatch(log,/5000000000|12345000|3\.14|AAA|BBB/);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
