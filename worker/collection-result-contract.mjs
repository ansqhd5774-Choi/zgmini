const complete=new Set(['READY','STORED','COMPLETE','SUCCESS','READY_CURRENT_VINTAGE','READY_CURRENT_VINTAGE_RAW']);
const grouped=new Set(['macroCredit','macro','rates','credit','supply','fundFlows','bisDsr','bisTc']);
export function collectionDisposition(job,status){
 if(complete.has(status)||(grouped.has(job)&&status==null))return 'COMPLETE';
 if(status==='ALREADY_RUNNING')return 'ALREADY_RUNNING';
 if(typeof status==='string'&&(/^(SKIPPED_|CACHED$|UNCHANGED$|NO_NEW_)/.test(status)))return 'SKIPPED';
 if(['PARTIAL_BATCH','PARTIAL_PIT_STORE','PARTIAL_PCE_PC1_STORE','BACKLOG'].includes(status))return 'BACKLOG';
 if(['PARTIAL','NOT_READY','PENDING'].includes(status))return 'PARTIAL';
 return 'SOURCE_FAILED';
}
