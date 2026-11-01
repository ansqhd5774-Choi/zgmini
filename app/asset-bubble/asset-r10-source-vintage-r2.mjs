// UI-only R10 source-content identity gate for same-fingerprint daily releases.
// This never edits scoring, D1 records, sourceVersion, or sourceStoredAt.
// A new source digest, earlier scored vintage, or invalid metadata fails closed.
const pattern=/^macro:(\d{4}-\d{2}-\d{2}):([0-9a-f]{64})$/i;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)
 &&Number.isFinite(Date.parse(value+'T00:00:00Z'))
 &&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const storedTime=value=>Number.isSafeInteger(value)&&value>0&&value<=Date.now();

export function sameR10StoredSourceOrContent(scored,sidecar){
 if(!scored||!sidecar)return false;
 if(scored.sourceVersion===sidecar.sourceVersion
  &&scored.sourceStoredAt===sidecar.sourceStoredAt
  &&scored.asOfDate===sidecar.asOfDate)return true;
 const live=pattern.exec(scored.sourceVersion??'');
 const archived=pattern.exec(sidecar.sourceVersion??'');
 return Boolean(live&&archived
  &&live[2].toLowerCase()===archived[2].toLowerCase()
  &&date(scored.asOfDate)&&date(sidecar.asOfDate)
  &&live[1]===scored.asOfDate&&archived[1]===sidecar.asOfDate
  &&scored.asOfDate>sidecar.asOfDate
  &&storedTime(scored.sourceStoredAt)&&storedTime(sidecar.sourceStoredAt)
  &&scored.sourceStoredAt>sidecar.sourceStoredAt);
}
