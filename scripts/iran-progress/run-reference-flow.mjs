import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
const arg=process.argv[2];if(!arg?.startsWith('--collector='))throw Error('FLOW_COLLECTOR_REQUIRED');
const collector=path.resolve(arg.slice('--collector='.length));
if(path.basename(collector)!=='collect-r14.mjs')throw Error('FLOW_COLLECTOR_INVALID');
const run=args=>new Promise(resolve=>{const p=spawn(process.execPath,args,{windowsHide:true,stdio:'inherit'});p.on('error',()=>resolve(1));p.on('exit',code=>resolve(code??1));});
const collection=await run([collector,'--max=48','--scheduled','--analyze-articles']);
const news=await run([path.join(path.dirname(fileURLToPath(import.meta.url)),'continuous-news.mjs')]);
const publication=await run([path.join(path.dirname(fileURLToPath(import.meta.url)),'reference-flow.mjs'),'--publish',...(collection!==0?['--collection-failed']:[])]);
if(collection!==0||news!==0||publication!==0)process.exitCode=1;
