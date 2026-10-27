import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
const option=name=>process.argv.slice(2).find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const legacy=option('legacy-runner'),collector=option('collector');
const enableR5=process.argv.slice(2).includes('--r5');
if(!legacy||!collector||path.basename(legacy)!=='run-reference-flow.mjs'||path.basename(collector)!=='collect-r14.mjs'||!fs.existsSync(legacy)||!fs.existsSync(collector))throw Error('R3_EXISTING_RUNNER_REQUIRED');
const run=args=>new Promise(resolve=>{const p=spawn(process.execPath,args,{windowsHide:true,stdio:'inherit'});p.on('error',()=>resolve(1));p.on('exit',c=>resolve(c??1));});
// Publish news independently before the legacy AIS/formal collection. Keep its
// existing implementation and checkpoint paths, without publishing R2 arrows.
const r3=await run([path.join(path.dirname(fileURLToPath(import.meta.url)),'operate-r3.mjs'),'--collect-publish']);
// Opt-in ONLY on a separately verified PC release. Do not alter scheduled task.
// R3 and R5 have distinct D1 keys; existing successful R3 stays available.
const r5=enableR5&&r3===0?await run([path.join(path.dirname(fileURLToPath(import.meta.url)),'operate-r5.mjs'),'--publish']):0;
const original=await run([legacy,`--collector=${collector}`]);

// Isolated display-cache retention: only the local, rights-reviewed news JSON.
// Runs after all score jobs. Failures must never change their exit contract or
// delete any R3/R5 source, decision, calculation, publication, or checkpoint.
const retention=path.join(path.dirname(fileURLToPath(import.meta.url)),'news-display-maintenance-r1.mjs');
if(fs.existsSync(retention)){
 const newsExit=await run([retention,'--apply']);
 if(newsExit!==0)console.error('IRAN_DISPLAY_NEWS_RETENTION_FAILED_SCORE_UNAFFECTED');
}
// The existing R13 scheduler is reused. New article selection, PC display
// cache and the D1 news-only key are separate from R3/R5 score calculations.
// Do not propagate news-publication errors into the score runner exit code.
const newsAuto=path.join(path.dirname(fileURLToPath(import.meta.url)),'news-display-auto-run-r15.mjs');
if(fs.existsSync(newsAuto)){
 const newsExit=await run([newsAuto,'--scheduled']);
 if(newsExit!==0)console.error('IRAN_DISPLAY_NEWS_AUTO_FAILED_SCORE_UNAFFECTED');
}
if(r3!==0||r5!==0||original!==0)process.exitCode=1;
