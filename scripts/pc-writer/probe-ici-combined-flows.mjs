import path from "node:path";
import {fileURLToPath} from "node:url";
import {fetchIciCombinedFlows} from "../../lib/market-score/ici-combined-flow-provider-r1.mjs";

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  fetchIciCombinedFlows().then(result=>{
    const rows=Array.isArray(result?.rows)?result.rows:[];
    console.log(JSON.stringify({
      status:result?.status??"PARTIAL",
      reason:result?.reason??null,
      providerRequests:result?.providerRequests??0,
      source:result?.source??"Investment Company Institute",
      first:rows[0]?.observationDate??null,
      last:rows.at(-1)?.observationDate??null,
      rows:rows.length,
      latest:rows.at(-1)??null,
    },null,2));
    if(result?.status!=="READY_CURRENT_RELEASE")process.exitCode=1;
  }).catch(()=>{
    console.log(JSON.stringify({status:"FAILED",code:"ICI_PROBE_FAILED"}));
    process.exitCode=1;
  });
}
