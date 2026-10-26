// A failed output cannot veto unrelated, independently validated outputs.
export async function attemptOutput(report,id,run){
 try{await run();return true;}
 catch(error){
  const reason=/^[A-Z][A-Z0-9_]{1,100}$/.test(error?.message??'')?error.message:'OUTPUT_STAGE_FAILED';
  (report.failures??=[]).push({id,reason});return false;
 }
}
