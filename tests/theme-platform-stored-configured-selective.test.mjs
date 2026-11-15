import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {calculateStoredConfiguredConfirmed} from
 '../scripts/pc-writer/theme-platform-stored-configured.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const id='test-configured',internalId='registered-'+id,hash='a'.repeat(64);
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-w03-conf-stored-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const definition={id,label:'등록테마',etfs:['AAA'],profile:'R32_TEST'};
 const registration={definition,sha256:hash,internalId};
 const dates=Array.from({length:252},(_,i)=>
  new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
 const record={status:'PRIVATE_SCORE_READY',themeId:id,profile:definition.profile,
  definitionSha256:hash,publicationAuthorized:false,etfs:[...definition.etfs],
  label:definition.label,sourceVersion:'GMH_MANIFEST_SHA256_'+hash,
  observationDate:dates.at(-1),score:50,
  history:dates.map(date=>({date,score:50}))};
 const dir=path.join(root,'themes',internalId,'derived');
 fs.mkdirSync(dir,{recursive:true});
 const bytes=Buffer.from(JSON.stringify(record,null,2)+'\n'),digest=sha(bytes);
 const file=path.join(dir,'score-'+digest+'.json');fs.writeFileSync(file,bytes);
 const read=overrides=>calculateStoredConfiguredConfirmed({
  dataRoot:root,id,registrationReader:()=>registration,
  scoreCalculator:()=>({...record,...overrides})
 });
 return {root,record,file,read,digest};
}
test('saved-only confirmed configured reader verifies and returns existing immutable score',t=>{
 const f=fixture(t),r=f.read();
 assert.equal(r.artifactSha256,f.digest);
 assert.equal(r.rows.length,1);
 assert.equal(r.rows[0].observationDate,f.record.observationDate);
 assert.equal(r.rows[0].score,50);
 assert.equal(r.rows[0].history.length,252);
});
test('absence, modification and symlink of saved result fail closed',t=>{
 const f=fixture(t);
 fs.appendFileSync(f.file,'tamper');
 assert.throws(()=>f.read(),/THEME_CONFIG_STORED_SCORE_REPLAY_MISMATCH/);
 fs.unlinkSync(f.file);
 assert.throws(()=>f.read(),/THEME_CONFIG_STORED_SCORE_NOT_SAVED/);
 const data=Buffer.from(JSON.stringify(f.record,null,2)+'\n');
 const target=path.join(f.root,'outside.json');fs.writeFileSync(target,data);
 fs.symlinkSync(target,f.file);
 assert.throws(()=>f.read(),/THEME_CONFIG_STORED_SCORE_REPLAY_MISMATCH/);
});
test('unapproved or drifting saved score cannot become stage VERIFIED',t=>{
 const f=fixture(t);
 for(const changes of [{publicationAuthorized:true},{definitionSha256:'b'.repeat(64)},
  {score:null},{observationDate:'2025-11-30'},{status:'PRIVATE_HISTORY_PENDING'},
  {etfs:['WRONG']}])
  assert.throws(()=>f.read(changes),/THEME_CONFIG_STORED_SCORE_CONTRACT/);
});
