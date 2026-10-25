import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectDcPowerR6} from '../scripts/pc-writer/theme-data-center-power-gate-r6.mjs';
import {buildDcPowerPublicRunnerR6} from '../scripts/pc-writer/theme-data-center-power-cutover-r6.mjs';
import {buildDcPowerScheduledRunner} from '../scripts/pc-writer/theme-data-center-power-task-r5.mjs';

const sha='a'.repeat(40),worker='zgmini-migration-candidate-r5';
const core=Array.from({length:7},(_,i)=>({theme:'core-'+i,history:Array(252).fill({score:50})}));
const optional={theme:'바이오·신약',history:Array(252).fill({score:30})};
const tenth={theme:'데이터센터·전력',score:12.32143,history:Array(252).fill({score:12.32143})};
const json=x=>({ok:true,json:async()=>x});
const mock=(themes=core.concat(optional),{build=true,head=sha}={})=>async url=>{
 if(url.endsWith('/commits/main'))return json({sha:head});
 if(url.includes('/check-runs?'))return json({check_runs:build?[{
  name:`Workers Builds: ${worker}`,app:{slug:'cloudflare-workers-and-pages'},
  status:'completed',conclusion:'success',
  details_url:`https://dash.cloudflare.com/account/workers/services/view/${worker}/production/builds/build-id`
 }]:[]});
 if(url.includes('/api/theme-fear-greed/'))return json({status:'READY',observationDate:'2026-10-23',themes});
 throw Error('UNEXPECTED_URL_'+url);
};

test('Cloudflare connected-main PASS allows seven core plus fewer than two optional themes',async()=>{
 const result=await inspectDcPowerR6({sha,fetchImpl:mock(),now:42});
 assert.equal(result.status,'DEPLOYED_CORE_READY');
 assert.equal(result.visibleThemeCount,8);
 assert.equal(result.optionalThemesPresent,1);
 assert.equal(result.tenthVisible,false);
 const complete=await inspectDcPowerR6({sha,fetchImpl:mock([...core,optional,tenth]),verifyPublic:true,now:42});
 assert.equal(complete.status,'PUBLIC_API_VERIFIED');
 assert.equal(complete.tenthScore,12.32143);
 assert.equal(complete.tenthHistoryDays,252);
});

test('source drift, missing production check, unavailable core and missing tenth block publication',async()=>{
 await assert.rejects(()=>inspectDcPowerR6({sha,fetchImpl:mock(core,{head:'b'.repeat(40)})}),
  /GITHUB_MAIN_SOURCE_DRIFT/);
 await assert.rejects(()=>inspectDcPowerR6({sha,fetchImpl:mock(core,{build:false})}),
  /EXACT_MAIN_CLOUDFLARE_PRODUCTION_CHECK_NOT_PASSED/);
 await assert.rejects(()=>inspectDcPowerR6({sha,fetchImpl:mock(core.slice(0,6))}),
  /CORE_SEVEN_NOT_READY/);
 await assert.rejects(()=>inspectDcPowerR6({sha,fetchImpl:mock(),verifyPublic:true}),
  /TENTH_PUBLIC_API_NOT_READY/);
});

test('only tenth schedule runner is rewritten, original R5 private bytes remain unchanged',()=>{
 const runner='C:\\Users\\test\\Desktop\\DATA_CENTER_POWER_R5_SCHEDULED.cmd';
 const privateBytes=buildDcPowerScheduledRunner();
 const promoted=buildDcPowerPublicRunnerR6({sha,runner});
 assert.ok(privateBytes.every(c=>c<128));
 assert.ok(promoted.every(c=>c<128));
 assert.notDeepEqual(privateBytes,promoted);
 assert.ok(!privateBytes.toString('ascii').includes('--publish'));
 const script=promoted.toString('ascii');
 assert.match(script,/--once --collect --publish --accept-anonymous-license-risk/);
 assert.match(script,/DATA_CENTER_POWER_R5_SCHEDULED_RESULT\.txt/);
 assert.match(script,/set "DC_SOURCE=E:\\ZGmini\\projects\\zgmini-theme-optional\\releases\\a{40}\\scripts\\pc-writer\\theme-data-center-power-publish-r3.mjs"/);
 assert.equal(script.replace(/\r\n/g,'').includes('\n'),false);
 assert.doesNotMatch(script,/schtasks|wrangler deploy|%TEMP%|powershell/i);
});

test('Desktop R6 one-click launcher requires an explicit human publisher response',async()=>{
 const {readFileSync}=await import('node:fs');
 const cmd=readFileSync(new URL('../scripts/pc-writer/theme-data-center-power-r6-publish.cmd',import.meta.url));
 assert.ok(cmd.every(c=>c<128));
 const text=cmd.toString('ascii');
 assert.equal(text.replace(/\r\n/g,'').includes('\n'),false);
 assert.match(text,/set \/p DC_ACCEPT=/);
 assert.match(text,/if \/i not "%DC_ACCEPT%"=="ACCEPT" goto consent_missing/);
 assert.match(text,/theme-data-center-power-gate-r6\.mjs/);
 assert.match(text,/theme-data-center-power-cutover-r6\.mjs/);
 assert.doesNotMatch(text,/wrangler deploy|powershell|%TEMP%/i);
});
