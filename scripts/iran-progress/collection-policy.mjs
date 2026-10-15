export const collectionSlot=now=>Math.floor((now+9*3600000)/(6*3600000));
export function collectionInstallReady(report){
 return report?.version==='IRAN_COLLECTION_R14'&&report.storageVerified===true
  &&Number.isSafeInteger(report.finishedAt)&&report.finishedAt>0
  &&['RUNNING','CAUGHT_UP'].includes(report.backfill?.status)
  &&report.backfill.archivesSaved>0;
}
export function completedCollectionSlot(checkpoint,now){
 return checkpoint?.slot===collectionSlot(now)&&checkpoint.completed===true;
}
export function collectionTaskReadback(xml,launcher){
 // Task Scheduler omits default false properties when exporting XML.
 return xml.includes(launcher)&&xml.includes('IgnoreNew')&&!/<WakeToRun>\s*true\s*<\/WakeToRun>/.test(xml)
  &&['00','06','12','18'].every(hour=>xml.includes(`T${hour}:00:00+09:00`));
}
