// R11 rechecks Ollama against paragraphs that contain the four approved topics.
// Uses the R10 read-only collector; does not publish or alter the PC cache.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runNewsModelShadowR10} from './news-display-model-shadow-r10.mjs';

export async function runFocusedShadowR11(options={}){
 return runNewsModelShadowR10({...options,topicFocused:true});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('R11_READ_ONLY_ONLY');
 try{
  const result=await runFocusedShadowR11();
  console.log(JSON.stringify(result));
  if(result.testedModels.length===0||result.modelCallCount===0||result.validModelCalls===0)process.exitCode=2;
 }catch(error){console.error(JSON.stringify({status:'R11_SHADOW_FAILED',reason:error.message,publication:'DISABLED'}));process.exitCode=1;}
}
