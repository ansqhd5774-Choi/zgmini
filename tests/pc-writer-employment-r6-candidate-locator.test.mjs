import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {locateEmploymentR6Candidate} from '../scripts/pc-writer/employment-r6-candidate-locator.mjs';

const W=path.win32;
const source='a'.repeat(40);
const root=String.raw`E:\Verified\active-core`;
const home=String.raw`E:\ZGmini\data\pc-writer`;
const core=W.join(home,'storage','core.sqlite');
const zip=String.raw`D:\Downloads\employment-r6`;
const wrapper=String.raw`E:\Launchers\registered-core.vbs`;
const runner=W.join(root,'scripts','pc-writer','quota-runner.mjs');
const candidate=W.join(root,'scripts','pc-writer','EMPLOYMENT_R6_CANDIDATE.sqlite');
const zipCandidate=W.join(zip,'EMPLOYMENT_R6_CANDIDATE.sqlite');
const key=p=>W.normalize(p).toLowerCase();

function xml({args=`&quot;${wrapper}&quot;`,actions=1}={}){
  const exec=`<Exec><Command>C:\\Windows\\System32\\wscript.exe</Command>`+
    `<Arguments>${args}</Arguments><WorkingDirectory>E:\\Launchers</WorkingDirectory></Exec>`;
  return `<Task><Actions Context="User">${exec.repeat(actions)}</Actions></Task>`;
}
function fixture({zipFile=false,repoFile=true,taskXml=xml(),vbs,
  approvedSource=source,runningSource=source,clean=true,aliases={},valid=true}={}){
  const files=new Map([
    [key(wrapper),vbs??`Set shell = CreateObject("WScript.Shell")\r\n`+
      `WScript.Quit shell.Run("""${runner}""", 0, True)\r\n`],
    [key(W.join(home,'config.json')),JSON.stringify({enabled:true,collectionTarget:'pc',source:approvedSource})],
    [key(core),'mock core'],
    [key(runner),'// registered approved runner'],
  ]);
  if(repoFile)files.set(key(candidate),'mock candidate');
  if(zipFile)files.set(key(zipCandidate),'mock zip candidate');
  const opts={outputDir:zip,coreDbPath:core,pcHome:home,testInject:{
    readTaskXml:()=>taskXml,
    readFile:p=>{if(!files.has(key(p)))throw Error('NO_FILE');return files.get(key(p));},
    exists:p=>files.has(key(p)),
    realpath:p=>aliases[key(p)]??p,
    gitHead:found=>{assert.equal(key(found),key(root));return runningSource;},
    gitClean:()=>clean,
    validateDb:()=>valid,
  }};
  return {opts,files};
}

test('registered Core task resolves the approved repository and read-only candidate',()=>{
  const {opts}=fixture();
  assert.deepEqual(locateEmploymentR6Candidate(opts),{
    status:'CANDIDATE_FOUND_READONLY',candidateDbPath:candidate,
  });
});

test('candidate beside portable CMD is discovered, without a fixed E: checkout fallback',()=>{
  const {opts}=fixture({repoFile:false,zipFile:true});
  assert.deepEqual(locateEmploymentR6Candidate(opts),{
    status:'CANDIDATE_FOUND_READONLY',candidateDbPath:zipCandidate,
  });
});

test('R38 static wrapper may resolve one additional launcher, never arbitrary path guesses',()=>{
  const nested=String.raw`E:\Launchers\original-core.vbs`;
  const {opts,files}=fixture({vbs:`' ZGMINI_R38_WRAPPER_V1\r\n`+
    `origin = "${nested}"\r\nWScript.Quit shell.Run(origin, 0, True)\r\n`});
  files.set(key(nested),`WScript.Quit shell.Run("""${runner}""", 0, True)\r\n`);
  assert.equal(locateEmploymentR6Candidate(opts).status,'CANDIDATE_FOUND_READONLY');
});

test('R38 origin VBS with a static runner assignment resolves like the existing R34 parser',()=>{
  const nested=String.raw`E:\Launchers\original-core.vbs`;
  const {opts,files}=fixture({vbs:`' ZGMINI_R38_WRAPPER_V1\r\n`+
    `origin = "${nested}"\r\nWScript.Quit shell.Run(origin, 0, True)\r\n`});
  files.set(key(nested),`Set shell = CreateObject("WScript.Shell")\r\n`+
    `command = """${runner}"""\r\nWScript.Quit shell.Run(command, 0, True)\r\n`);
  const found=locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true});
  assert.equal(found.status,'CANDIDATE_FOUND_READONLY');
  assert.equal(found.candidateDbPath,candidate);
  assert.equal(found.diagnosticStep,'CANDIDATE_VERIFIED_READONLY');
});

test('diagnostic step reveals a failing hop but never a PC path or script contents',()=>{
  const {opts}=fixture({vbs:'WScript.Quit shell.Run(commandFromRegistry, 0, True)\r\n'});
  const found=locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true});
  assert.equal(found.status,'TASK_SOURCE_UNRESOLVED');
  assert.equal(found.diagnosticStep,'HOP_1_VBS_REFERENCES');
  assert.doesNotMatch(JSON.stringify(found),/Verified|Launchers|Registry|E:\\|core\.sqlite/i);
});

test('ambiguous static runner assignments remain blocked',()=>{
  const other=String.raw`E:\Verified\other-core\scripts\pc-writer\quota-runner.mjs`;
  const {opts}=fixture({vbs:`command = """${runner}"""\r\n`+
    `alternative = """${other}"""\r\nWScript.Quit shell.Run(command, 0, True)\r\n`});
  assert.equal(locateEmploymentR6Candidate(opts).status,'TASK_SOURCE_UNRESOLVED');
});

test('both candidate locations with different physical files are ambiguous',()=>{
  const {opts}=fixture({zipFile:true});
  assert.deepEqual(locateEmploymentR6Candidate(opts),{
    status:'AMBIGUOUS_CANDIDATE',candidateDbPath:null,
  });
});

test('two candidate names that resolve to the same file are not ambiguous',()=>{
  const {opts}=fixture({zipFile:true,aliases:{[key(zipCandidate)]:candidate}});
  assert.equal(locateEmploymentR6Candidate(opts).status,'CANDIDATE_FOUND_READONLY');
});

test('candidate resolved to operating Core DB is always blocked',()=>{
  const {opts}=fixture({aliases:{[key(candidate)]:core}});
  assert.deepEqual(locateEmploymentR6Candidate(opts),{
    status:'CANDIDATE_IS_CORE_DB',candidateDbPath:null,
  });
});

test('no candidate yields an explicit Core-only locator result',()=>{
  const {opts}=fixture({repoFile:false});
  assert.deepEqual(locateEmploymentR6Candidate(opts),{
    status:'CANDIDATE_NOT_FOUND',candidateDbPath:null,
  });
});

test('Task XML requires exactly one Action/Exec',()=>{
  const {opts}=fixture({taskXml:xml({actions:2})});
  assert.equal(locateEmploymentR6Candidate(opts).status,'TASK_ACTION_UNRESOLVED');
});

test('dynamic launcher does not infer the old release path or a candidate',()=>{
  const {opts}=fixture({vbs:'WScript.Quit shell.Run(commandFromRegistry, 0, True)\r\n'});
  assert.deepEqual(locateEmploymentR6Candidate(opts),{
    status:'TASK_SOURCE_UNRESOLVED',candidateDbPath:null,
  });
});

test('approved PC config SHA must equal actual running checkout SHA',()=>{
  const {opts}=fixture({approvedSource:'b'.repeat(40)});
  assert.equal(locateEmploymentR6Candidate(opts).status,'TASK_SOURCE_NOT_APPROVED');
});

test('dirty runtime source fails closed',()=>{
  const {opts}=fixture({clean:false});
  assert.equal(locateEmploymentR6Candidate(opts).status,'TASK_SOURCE_NOT_APPROVED');
});

test('unreadable task query fails closed without emitting an exception or private error',()=>{
  const {opts}=fixture();
  opts.testInject.readTaskXml=()=>{throw Error('private PC path and local username');};
  assert.deepEqual(locateEmploymentR6Candidate(opts),{
    status:'LOCATOR_READONLY_UNAVAILABLE',candidateDbPath:null,
  });
});

test('database validation errors yield a status, never candidate data',()=>{
  const {opts}=fixture({valid:false});
  assert.deepEqual(locateEmploymentR6Candidate(opts),{
    status:'CANDIDATE_DB_INVALID',candidateDbPath:null,
  });
});

test('missing PC context cannot switch to an unverified guessed checkout',()=>{
  const {opts}=fixture();
  opts.pcHome=null;
  opts.testInject.readTaskXml=()=>{throw Error('SHOULD_NOT_READ');};
  const result=locateEmploymentR6Candidate(opts);
  assert.equal(result.candidateDbPath,null);
  assert.match(result.status,/^(LOCATOR_INPUT_UNVERIFIED|LOCATOR_READONLY_UNAVAILABLE)$/);
});
