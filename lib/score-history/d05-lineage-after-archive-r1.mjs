import {linkMarketInputEvidenceToStoredArchive} from './composite-archive-lineage-link-r1.mjs';
import {buildD05LineageEvent} from './d05-lineage-event-contract-r1.mjs';

// Development-only, read-only bridge for an approved future Writer hook.
// Only an actual LOCAL_STORED archive with the same calculated event can
// prepare private metadata. This never appends, publishes, or mutates a score.
export async function prepareD05LineageAfterStoredArchive({
 db,now,marketBody,capture,archiveResult,runtimeSourceSha,approvedSourceSha,recordedAt,
}={}){
 const link=await linkMarketInputEvidenceToStoredArchive({
  db,now,marketBody,capture,archiveResult,
 });
 if(link.status!=='LINKED_SELECTED_7_BATCHES_ONLY')return link;
 return buildD05LineageEvent({link,runtimeSourceSha,approvedSourceSha,recordedAt});
}
