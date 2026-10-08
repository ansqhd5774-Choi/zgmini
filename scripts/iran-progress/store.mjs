import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function openStore(file){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const db=new DatabaseSync(file);db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS event_revisions(event_id TEXT NOT NULL,revision INTEGER NOT NULL,body TEXT NOT NULL,verified_at INTEGER NOT NULL,PRIMARY KEY(event_id,revision));
 CREATE TABLE IF NOT EXISTS decisions(id TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS calculations(id TEXT PRIMARY KEY,input_hash TEXT NOT NULL,body TEXT NOT NULL,calculated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS publications(id TEXT PRIMARY KEY,body TEXT NOT NULL,published_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS checkpoints(name TEXT PRIMARY KEY,body TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS lease(id INTEGER PRIMARY KEY CHECK(id=1),owner TEXT NOT NULL,until_at INTEGER NOT NULL);`);
 const immutable=(table,id,body,now)=>{
  const encoded=JSON.stringify(body),old=db.prepare(`SELECT body FROM ${table} WHERE id=?`).get(id);
  if(old&&old.body!==encoded)throw Error('IMMUTABLE_REVISION_CONFLICT');
  if(!old){const column=table==='sources'||table==='decisions'?'stored_at':table==='publications'?'published_at':null;
   if(!column)throw Error('INVALID_IMMUTABLE_TABLE');db.prepare(`INSERT INTO ${table}(id,body,${column}) VALUES(?,?,?)`).run(id,encoded,now);}
 };
 return {db,close:()=>db.close(),
  putSource:(id,body,now)=>immutable('sources',id,body,now),putDecision:(id,body,now)=>immutable('decisions',id,body,now),
  putEvent(e){const encoded=JSON.stringify(e),old=db.prepare('SELECT body FROM event_revisions WHERE event_id=? AND revision=?').get(e.eventId,e.revision);
   if(old&&old.body!==encoded)throw Error('IMMUTABLE_REVISION_CONFLICT');
   if(!old)db.prepare('INSERT INTO event_revisions VALUES(?,?,?,?)').run(e.eventId,e.revision,encoded,e.verifiedAt);},
  events:()=>db.prepare('SELECT body FROM event_revisions ORDER BY verified_at,revision').all().map(r=>JSON.parse(r.body)),
  calculate(input,result){const inputHash=hash(input),id=hash({inputHash,result});
   db.prepare('INSERT OR IGNORE INTO calculations VALUES(?,?,?,?)').run(id,inputHash,JSON.stringify(result),result.calculatedAt);return id;},
  publication:(id,body,now)=>immutable('publications',id,body,now),
  checkpoint(name,body){db.prepare('INSERT INTO checkpoints VALUES(?,?) ON CONFLICT(name) DO UPDATE SET body=excluded.body').run(name,JSON.stringify(body));},
  getCheckpoint(name){const r=db.prepare('SELECT body FROM checkpoints WHERE name=?').get(name);return r?JSON.parse(r.body):null;},
  claim(owner,now,duration=1800000){db.prepare('INSERT INTO lease VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,until_at=excluded.until_at WHERE lease.until_at<=?').run(owner,now+duration,now);return db.prepare('SELECT owner FROM lease WHERE id=1').get()?.owner===owner;},
  release(owner){db.prepare('DELETE FROM lease WHERE id=1 AND owner=?').run(owner);}
 };
}
