import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {read} from './d1.mjs';
import {client,credential} from './d1.mjs';
import {PUBLIC_PROJECTION_KEYS} from '../../worker/market-public-projection-store.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const cfg=read(path.join(base,'config.json'));const remote=client(cfg,credential(root));
const projectionStatements=Object.entries(PUBLIC_PROJECTION_KEYS).map(([id,key])=>({id,key,sql:'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',params:[key]}));
const projectionRows=[];
for(const item of projectionStatements){const row=(await remote.query(cfg.core,item.sql,item.params)).results[0];let projection=null;try{projection=row?JSON.parse(row.body).projection:null;}catch{projection={status:'INVALID_JSON'};}projectionRows.push({id:item.id,key:item.key,storedAt:row?.stored_at??null,status:projection?.status??null,sourceVersion:projection?.sourceVersion??null,sourceStoredAt:projection?.sourceStoredAt??null});}
const market=(await remote.query(cfg.core,"SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'")).results[0]??null;
const feeds=(await remote.query(cfg.core,"SELECT feed_key,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND snapshot_key='current' ORDER BY feed_key")).results;
console.log(JSON.stringify({at:new Date().toISOString(),market:{storedAt:market?.stored_at??null},projections:projectionRows,feeds:feeds.map(row=>({feedKey:row.feed_key,storedAt:row.stored_at})),stats:remote.stats}));
