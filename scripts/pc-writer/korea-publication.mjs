const SNAPSHOT_COLUMNS=['date','methodology_version','factors_json','composite_json','history_mode','point_in_time_verified','source_observed_at','calculated_at'];
const DATE_COLUMNS=['date','status','kospi_count','valid_high_count','valid_low_count','valid_share_volume_count','rows_stored','krx_request_count','bok_request_count','fetched_at','methodology_version'];
export function koreaPublicationPlan(snapshot,checkpoint){
 if(!checkpoint||checkpoint.date!==snapshot?.date||checkpoint.status!=='COMPLETE'||checkpoint.methodology_version!==snapshot.methodology_version)throw Error('KOREA_PUBLICATION_CHECKPOINT_REQUIRED');
 for(const [row,columns] of [[checkpoint,DATE_COLUMNS],[snapshot,SNAPSHOT_COLUMNS]])if(columns.some(k=>row[k]===undefined))throw Error('KOREA_PUBLICATION_COLUMN_MISSING');
 // Only the completed-date metadata required by the snapshot FK; no provider rows.
 return [[checkpoint,DATE_COLUMNS,'kfg_rev7_market_dates'],[snapshot,SNAPSHOT_COLUMNS,'kfg_rev7_snapshots']].map(([row,columns,table])=>({sql:`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')}) ON CONFLICT(date) DO NOTHING`,params:columns.map(k=>row[k])}));
}
