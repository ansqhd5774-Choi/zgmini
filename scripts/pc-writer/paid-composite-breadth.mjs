// Existing published paid derivation only. No provider/D1 call or new calculation.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {paidBreadthDomainFromRow} from '../../worker/breadth-paid-public.mjs';
import {buildBreadthB1R5UnavailablePublicDomain} from '../../lib/market-score/breadth-b1-r5-worker-domain.mjs';
export function paidCompositeBreadthDomain(base,now=Date.now()){
 try{const report=JSON.parse(fs.readFileSync(path.join(base,'marketparquet-paid','breadth-last-run.json')));
 if(!['D1_CAS_READBACK_VERIFIED','UNCHANGED_READBACK_VERIFIED'].includes(report.status)||!/^[a-f0-9]{64}$/.test(report.bodySha256))throw Error('UNVERIFIED');
 const bytes=fs.readFileSync(path.join(base,'marketparquet-paid','derived','breadth-'+report.bodySha256+'.json'));
 if(createHash('sha256').update(bytes).digest('hex')!==report.bodySha256)throw Error('CHANGED');
 const domain=paidBreadthDomainFromRow({body:bytes.toString(),stored_at:report.storedAt},{now});if(domain)return domain;
 }catch{}
 return buildBreadthB1R5UnavailablePublicDomain('PAID_BREADTH_PUBLISHED_EVIDENCE_UNAVAILABLE',new Date(now).toISOString().slice(0,10),new Date(now).toISOString());
}
