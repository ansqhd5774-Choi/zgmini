import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requiresRecessionR3DisplayRefresh} from '../scripts/pc-writer/recession-r3-refresh.mjs';

const core7=Array.from({length:7},(_,i)=>({id:`core-${i}`,score:50,weight:i===0?.25:.125,value:i,previousValue:null,previousObservationDate:null,trend:[]}));
const shell=payload=>({payload,projection:{status:'READY',sourceStoredAt:1792290000000,sourceVersion:'unchanged'}});
const valid={status:'READY',methodologyVersion:'RECESSION_R13_CURRENT_VINTAGE',
 scoreComparisons:{week:null,month:null,threeMonth:null,sixMonth:null,year:null},
 trend:[],components:core7};

test('recession R3 refreshes old published READY R13 only once, even when input checkpoint is unchanged',()=>{
 const old=shell({status:'READY',methodologyVersion:'RECESSION_R13_CURRENT_VINTAGE',trend:[],components:core7.map(({previousValue,previousObservationDate,trend,...rest})=>rest)});
 assert.equal(requiresRecessionR3DisplayRefresh(old),true);
 assert.equal(requiresRecessionR3DisplayRefresh(shell(valid)),false);
 assert.equal(requiresRecessionR3DisplayRefresh(shell({...valid,components:core7.map(c=>({...c,previousValue:0}))})),false);
 assert.equal(requiresRecessionR3DisplayRefresh(shell({...valid,scoreComparisons:{...valid.scoreComparisons,year:0}})),false);
 assert.equal(requiresRecessionR3DisplayRefresh(shell({...valid,components:[...core7.slice(0,6),{...core7[6],trend:null}]})),true);
 assert.equal(requiresRecessionR3DisplayRefresh(shell({...valid,scoreComparisons:{week:null}})),true);
});
test('existing unavailable and partial payloads do not cause recurring recomputation',()=>{
 assert.equal(requiresRecessionR3DisplayRefresh(null),false);
 assert.equal(requiresRecessionR3DisplayRefresh(shell({status:'PARTIAL',methodologyVersion:'RECESSION_R13_CURRENT_VINTAGE'})),false);
 assert.equal(requiresRecessionR3DisplayRefresh(shell({status:'READY',methodologyVersion:'ANOTHER_R13'})),false);
});
test('writer preserves existing checkpoint and publication guard and only invokes R3 compatibility on recession',()=>{
 const writer=readFileSync('scripts/pc-writer/run-local.mjs','utf8');
 assert.match(writer,/id==='recession'&&requiresRecessionR3DisplayRefresh\(envelope\)/);
 assert.match(writer,/p\.sourceVersion!==checkpoint\.sourceVersion\|\|p\.sourceStoredAt!==checkpoint\.sourceStoredAt\|\|recessionR3Refresh/);
 assert.match(writer,/publicationCompatibility\(root,config\.source,source,main\)/);
 assert.match(writer,/execFileSync\('git',\['diff','--quiet','HEAD','--','worker','lib','scripts\/pc-writer'\]/);
 assert.match(writer,/const input=r10\?\.status==='READY'\?null:await loadProjectionSource\(id,scope,\{now:checkpoint\.sourceStoredAt\}\)/);
 assert.match(writer,/await projectionWriter\(core\)\.write\(id,payload,Date\.now\(\),checkpoint\)/);
});
