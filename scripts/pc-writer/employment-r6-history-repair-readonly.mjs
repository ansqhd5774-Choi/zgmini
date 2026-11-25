// Read-only adapter for the existing R6 runner, bound to the retained #3640
// private receipt. No provider reparse, path from Issue text, or DB mutation.
import fs from "node:fs";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {previewEmploymentHistoryRepairSelection} from "../../lib/market-score/employment-r6-history-repair-transaction.mjs";

export const PINNED_REPAIR_RECEIPT=Object.freeze({
 receiptSha256:"2163132e165e45e08edff062722465dac1ff3a2d17ce999ec98a479d6e32547b",
 evidenceDigest:"30afbbec30466fa3e93442c78514ccb5125ca57ae4609dfdd5b9f44716c3acc5",
 expectedKeys:2880,
});
export function readPinnedHistoryRepairPreview({dbPath,outputDir,beforeOpen,afterOpen}={}){
 const file=path.join(outputDir,"PIT0605_REPAIR_INPUT.json");
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<10||st.size>32*1024*1024)
   throw Error("W04_REPAIR_RECEIPT_FILE_INVALID");
 const receiptBytes=fs.readFileSync(file);
 let db;
 try{
  beforeOpen?.();
  db=new DatabaseSync(dbPath,{readOnly:true});
  db.exec("PRAGMA query_only=ON");
  afterOpen?.();
  db.exec("BEGIN");
  const selection=previewEmploymentHistoryRepairSelection(db,{...PINNED_REPAIR_RECEIPT,receiptBytes});
  return {...selection,receiptSha256:PINNED_REPAIR_RECEIPT.receiptSha256,
   evidenceDigest:PINNED_REPAIR_RECEIPT.evidenceDigest,expectedKeys:PINNED_REPAIR_RECEIPT.expectedKeys};
 }finally{if(db){try{if(db.isTransaction)db.exec("ROLLBACK");}finally{db.close();}}}
}
