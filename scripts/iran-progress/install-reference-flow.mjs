import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {openStore} from './store.mjs';
const arg=process.argv[2];if(!arg?.startsWith('--collector='))throw Error('FLOW_COLLECTOR_REQUIRED');const collector=path.resolve(arg.slice(12));if(path.basename(collector)!=='collect-r14.mjs'||!fs.existsSync(collector))throw Error('FLOW_COLLECTOR_INVALID');
const r2=process.argv.includes('--r2'),r3=process.argv.includes('--r3');if(r2&&r3)throw Error('FLOW_MODE_CONFLICT');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
const store=openStore(path.join(base,'iran.sqlite'));try{const state=store.getCheckpoint('reference-flow-publication-'+(r3?'r3':r2?'r2':'r1'))?.status;if(r3?!['VERIFIED','UNCHANGED'].includes(state):state!=='VERIFIED')throw Error('FLOW_VERIFIED_PUBLICATION_REQUIRED');}finally{store.close();}
const task='ZGMINI-PC-Iran-Progress-R13';
const xml=execFileSync('schtasks.exe',['/Query','/TN',task,'/XML'],{encoding:'utf8',windowsHide:true});
const launcher=['run-articles.vbs','run.vbs'].map(name=>path.join(base,name)).find(file=>xml.includes(file));if(!launcher)throw Error('FLOW_EXISTING_TASK_MISMATCH');
const previous=fs.readFileSync(launcher,'utf8');
if(r3&&!/run-reference-flow(?:-r3)?\.mjs/i.test(previous))throw Error('R3_PREVIOUS_LAUNCHER_NOT_VERIFIED');
if(r3&&/run-reference-flow-r3\.mjs/i.test(previous)){console.log(JSON.stringify({task,status:'ALREADY_CONNECTED',scheduleChanged:false}));process.exit(0);}if(!fs.existsSync(launcher+'.before-continuous-news'))fs.writeFileSync(launcher+'.before-continuous-news',previous,{flag:'wx'});
if(r2&&!fs.existsSync(launcher+'.before-reference-r2'))fs.writeFileSync(launcher+'.before-reference-r2',previous,{flag:'wx'});
if(r3&&!fs.existsSync(launcher+'.before-reference-r3'))fs.writeFileSync(launcher+'.before-reference-r3',previous,{flag:'wx'});
const legacy=path.join(root,'scripts/iran-progress/run-reference-flow.mjs');
const command=r3?`"${process.execPath}" "${path.join(root,'scripts/iran-progress/run-reference-flow-r3.mjs')}" "--legacy-runner=${legacy}" "--collector=${collector}"${/--r2\b/.test(previous)?' --legacy-r2':''}`:
 `"${process.execPath}" "${legacy}" "--collector=${collector}"${r2?' --r2':''}`;
const vbs=`Set shell = CreateObject("WScript.Shell")\r\nWScript.Quit shell.Run("${command.replaceAll('"','""')}", 0, True)\r\n`;
fs.writeFileSync(launcher,vbs,'ascii');if(fs.readFileSync(launcher,'ascii')!==vbs)throw Error('FLOW_LAUNCHER_READBACK_FAILED');console.log(JSON.stringify({task,status:'CONNECTED_VERIFIED',scheduleChanged:false}));
