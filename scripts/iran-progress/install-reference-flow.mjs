import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {openStore} from './store.mjs';
const arg=process.argv[2];if(!arg?.startsWith('--collector='))throw Error('FLOW_COLLECTOR_REQUIRED');const collector=path.resolve(arg.slice(12));if(path.basename(collector)!=='collect-r14.mjs'||!fs.existsSync(collector))throw Error('FLOW_COLLECTOR_INVALID');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
const store=openStore(path.join(base,'iran.sqlite'));try{if(store.getCheckpoint('reference-flow-publication-r1')?.status!=='VERIFIED')throw Error('FLOW_VERIFIED_PUBLICATION_REQUIRED');}finally{store.close();}
const task='ZGMINI-PC-Iran-Progress-R13',launcher=path.join(base,'run.vbs');
const xml=execFileSync('schtasks.exe',['/Query','/TN',task,'/XML'],{encoding:'utf8',windowsHide:true});if(!xml.includes(launcher))throw Error('FLOW_EXISTING_TASK_MISMATCH');
const previous=fs.readFileSync(launcher,'utf8');if(!fs.existsSync(launcher+'.before-continuous-news'))fs.writeFileSync(launcher+'.before-continuous-news',previous,{flag:'wx'});
const command=`"${process.execPath}" "${path.join(root,'scripts/iran-progress/run-reference-flow.mjs')}" "--collector=${collector}"`;
const vbs=`Set shell = CreateObject("WScript.Shell")\r\nWScript.Quit shell.Run("${command.replaceAll('"','""')}", 0, True)\r\n`;
fs.writeFileSync(launcher,vbs,'ascii');if(fs.readFileSync(launcher,'ascii')!==vbs)throw Error('FLOW_LAUNCHER_READBACK_FAILED');console.log(JSON.stringify({task,status:'CONNECTED_VERIFIED',scheduleChanged:false}));
