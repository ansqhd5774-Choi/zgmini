import {prepareD05LineageAfterStoredArchive} from './d05-lineage-after-archive-r1.mjs';
import {appendD05LineageEvent} from './d05-lineage-event-append-r1.mjs';

// Explicitly invoked development-only bridge. It neither chooses an operating
// path nor grants a Writer lease; the future approved caller owns both.
// Never publish this private selected-input metadata to D1 or a run report.
export async function recordD05LineageFromStoredArchive({
 db,now,marketBody,capture,archiveResult,runtimeSourceSha,approvedSourceSha,
 recordedAt,ledgerPath,exclusiveWriter,initializeApprovedDirectory=false,
}={}){
 const prepared=await prepareD05LineageAfterStoredArchive({
  db,now,marketBody,capture,archiveResult,runtimeSourceSha,approvedSourceSha,recordedAt,
 });
 if(prepared.status!=='PREPARED_LOCAL_ONLY')return prepared;
 return appendD05LineageEvent({ledgerPath,entry:prepared,exclusiveWriter,
  initializeApprovedDirectory});
}
