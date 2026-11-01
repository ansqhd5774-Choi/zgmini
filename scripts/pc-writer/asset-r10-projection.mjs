import fs from 'node:fs';
import path from 'node:path';
import {assetR10PublicationDryRun} from '../../lib/diagnostic-layer/asset-bubble-r10-release-gate.mjs';
import {hash} from './d1.mjs';

// Read only a concrete release payload. Research/conditional reports are never
// used as publication input, and a failed R10 gate preserves the existing path.
export function readAssetR10Projection(base) {
 const file=path.join(base,'local-asset-bubble-r10-release-payload.json');
 if(!fs.existsSync(file))return {status:'PENDING',reason:'RELEASE_PAYLOAD_MISSING',payload:null};
 const payload=JSON.parse(fs.readFileSync(file,'utf8'));
 const gate=assetR10PublicationDryRun(payload);
 if(gate.status!=='PASS')return {...gate,payload:null};
 return {status:'READY',payload,checkpoint:{status:'READY',sourceVersion:payload.sourceVersion+':r10:'+hash(payload),sourceStoredAt:payload.sourceStoredAt}};
}
