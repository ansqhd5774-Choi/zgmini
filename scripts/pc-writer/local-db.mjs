import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';

// D1 interface backed by persistent PC storage. No network or remote fallback.
export function localDatabase(file) {
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const sqlite=new DatabaseSync(file);
 sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;');
 const execute=(sql,params=[])=>{
  const stmt=sqlite.prepare(sql);
  if(stmt.columns().length){const results=stmt.all(...params);return {success:true,results,meta:{changes:0}};}
  const info=stmt.run(...params);
  return {success:true,results:[],meta:{changes:Number(info.changes),last_row_id:Number(info.lastInsertRowid)}};
 };
 const prepare=(sql,params=[])=>({sql,params,bind(...values){return prepare(sql,values)},async all(){return execute(sql,params)},async run(){return execute(sql,params)},async first(column){const row=execute(sql,params).results[0]??null;return column?row?.[column]??null:row;},async raw(){return execute(sql,params).results.map(Object.values)}});
 return {prepare,async exec(sql){sqlite.exec(sql);return {count:0,duration:0}},async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>execute(s.sql,s.params));sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},close(){sqlite.close()}};
}
