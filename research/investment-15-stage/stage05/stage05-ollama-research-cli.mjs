/** Manual Stage05 research runner. No Stage01–04 calls, files, or modifications. */
import {readFile} from 'node:fs/promises';
import {readStage05Candidates,runStage05OllamaResearch} from './stage05-ollama-research.mjs';

const arg=process.argv.slice(2);
const getFlag=name=>{const i=arg.indexOf(name);return i>=0?arg[i+1]:undefined;};
const result=value=>process.stdout.write(`${JSON.stringify(value,null,2)}\n`);

async function requestJson(url,body,{key=null,timeout=240000}={}){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',
    ...(key?{Authorization:`Bearer ${key}`}:{})},body:JSON.stringify(body),
    signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw new Error(`STAGE05_HTTP_${response.status}`);
  return await response.json();
}

async function main(){
  if(arg.includes('--help')){
    process.stdout.write('Usage: node stage05-ollama-research-cli.mjs --input STAGE05_HANDOFF.json --model YOUR_OLLAMA_MODEL\n'
      +'Requires the existing local Ollama service and configured OLLAMA_API_KEY for Ollama web search.\n'
      +'Only Stage05 research, no Stage01-04 refresh, writes, or trading.\n');
    return;
  }
  if(arg.length!==4||!getFlag('--input')||!getFlag('--model'))
    throw new Error('STAGE05_CLI_USAGE_USE_--help');
  const input=JSON.parse(await readFile(getFlag('--input'),'utf8'));
  const state=readStage05Candidates(input);
  if(state.status!=='READY'){
    result({status:'BLOCKED_INPUT_NOT_READY',stage:'05',ollamaInvoked:false});
    process.exitCode=2;
    return;
  }
  const key=process.env.OLLAMA_API_KEY;
  if(!key){
    result({status:'AUTOMATION_BLOCKED',reason:'OLLAMA_API_KEY_NOT_CONFIGURED',
      stage:'05',ollamaInvoked:false});
    process.exitCode=2;
    return;
  }
  const host=(process.env.OLLAMA_HOST||'http://127.0.0.1:11434').replace(/\/$/,'');
  const endpoint=host.endsWith('/api')?`${host}/chat`:`${host}/api/chat`;
  const chat=body=>requestJson(endpoint,body,{timeout:300000});
  const webSearch=query=>requestJson('https://ollama.com/api/web_search',
    {query,max_results:6},{key,timeout:45000});
  const webFetch=url=>requestJson('https://ollama.com/api/web_fetch',
    {url},{key,timeout:45000});
  const output=await runStage05OllamaResearch({input,model:getFlag('--model'),
    chat,webSearch,webFetch});
  result(output);
  if(output.status!=='RESEARCH_OUTPUT_WITH_FETCHED_URLS')process.exitCode=2;
}

main().catch(error=>{
  result({status:'STAGE05_RUNTIME_FAILED',error:String(error?.message||error),
    stage:'05',noTrade:true});
  process.exitCode=1;
});
