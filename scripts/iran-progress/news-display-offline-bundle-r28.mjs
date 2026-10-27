// R28: execute the approved private-only collector from a portable local bundle.
// Module integrity is checked before any live article requests or PC writes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const R28_APPROVED_MODULE_SHA256=Object.freeze({
 'scripts/iran-progress/news-display-collection-r26.mjs':'3cc83460d196ab8d0c74329e5b5f1a30f4dda9723c2de1ffee0acc1dbc4487f8',
 'scripts/iran-progress/news-display-multisource-audit-r24.mjs':'fef3597320f54d61267c37ee1f665619434cd434adced38d6f254c3abf53ec11',
 'scripts/iran-progress/news-display-article-audit-r25.mjs':'da9a809f07563e2766efa024341b63d629698aed53ffb92a4af6a8226c303187',
 'scripts/iran-progress/news-display-source-registry-r26.mjs':'95989b3119bdf804823e77dfd0a81850c48b56b8192242879f1eec0c67230d01',
 'scripts/iran-progress/news-display-discover-r1.mjs':'b5c2c133cfe178be735a462b2b6b46da8358234828d3a7abeacf9618c12a14a8',
 'scripts/iran-progress/sources.mjs':'f1ff992d45963537c1d0e485169429c9f20923bfe5d3f2ea3bf4ed963bd4587f',
 'lib/iran-progress/news-display-r1.mjs':'abe67381029f802119f5fa3c7796002baea69395da86633c076019ee4f76bd65',
});

export function verifyIranOfflineBundleR28({directory=root}={}){
 if(typeof directory!=='string'||!path.isAbsolute(directory)||
  !fs.existsSync(directory)||!fs.lstatSync(directory).isDirectory())
  throw Error('R28_PACKAGE_DIRECTORY_INVALID');
 for(const [relative,expectedHash] of Object.entries(R28_APPROVED_MODULE_SHA256)){
  const full=path.join(directory,...relative.split('/'));
  if(!fs.existsSync(full))throw Error('R28_PACKAGE_MODULE_MISSING');
  const stat=fs.lstatSync(full);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4*1024*1024)
   throw Error('R28_PACKAGE_MODULE_UNSAFE');
  if(createHash('sha256').update(fs.readFileSync(full)).digest('hex')!==expectedHash)
   throw Error('R28_PACKAGE_MODULE_HASH_MISMATCH');
 }
 return {bundleStatus:'PASS_R28_OFFLINE_MODULE_INTEGRITY',
  verifiedModules:Object.keys(R28_APPROVED_MODULE_SHA256).length};
}

async function main(){
 const [flag]=process.argv.slice(2);
 if(process.argv.length!==3||!['--check','--collect'].includes(flag))
  throw Error('R28_EXPLICIT_MODE_REQUIRED');
 const identity=verifyIranOfflineBundleR28();
 if(flag==='--check'){
  console.log(JSON.stringify({...identity,pcCacheWritten:false,d1Written:false}));
  return;
 }
 if(process.env.ZGMINI_IRAN_NEWS_R28_APPROVED!=='YES')
  throw Error('R28_PRIVATE_COLLECTION_APPROVAL_REQUIRED');
 // Dynamic import only after all seven publisher collector modules match
 // the reviewed pinned version. This bundle never downloads program code.
 const {collectIranNewsR26}=await import('./news-display-collection-r26.mjs');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??
  path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const result=await collectIranNewsR26({dataDirectory,dryRun:false});
 if(!['COLLECTION_REVIEW_READY','PARTIAL_COLLECTION_REVIEW_REQUIRED'].includes(result.status)||
  result.sourceCount!==7||result.written!==true||result.dryRun!==false||
  !Array.isArray(result.articleOutcomes)||!Array.isArray(result.failedArticles)||
  result.scoreLedgerModified!==false||result.publicCacheModified!==false||
  result.d1Written!==false||result.schedulerModified!==false||
  result.translationModified!==false||result.rightsVerified!==0||result.displayEligible!==0)
  throw Error('R28_PRIVATE_COLLECTION_RESULT_INVALID');
 console.log(JSON.stringify({...identity,...result}));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main();}
 catch(error){console.error(JSON.stringify({status:'STOP_R28_OFFLINE_COLLECTION',
  reason:/^R28_[A-Z0-9_]+$/.test(error?.message)?error.message:
   /^R26_[A-Z0-9_]+$/.test(error?.message)?error.message:'R28_UNCLASSIFIED_FAILURE',
  publicCacheModified:false,d1Written:false,scoreLedgerModified:false,
  possibleCandidateFileChange:process.argv[2]==='--collect'&&
   process.env.ZGMINI_IRAN_NEWS_R28_APPROVED==='YES'}));process.exitCode=1;}
}
