/** Allow a remote write attempt only after a separate stored-data audit. */
export function mayAuditStoredUsBreadth(collector){
  return collector?.job==='breadth'&&(
    collector.status==='COMPLETE'||
    (collector.status==='SKIPPED'&&collector.sourceStatus==='SKIPPED_ALREADY_SUCCESS')
  );
}
