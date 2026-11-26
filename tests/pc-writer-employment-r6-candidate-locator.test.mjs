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

test('registered R7 with two Run calls and R38 with three follows only the verified VBS chain',()=>{
  const r38=String.raw`E:\Launchers\approved-r38.vbs`;
  const original=String.raw`E:\Launchers\original-core.vbs`;
  const archive=String.raw`E:\Archive\archive-run.mjs`;
  const auxiliary=String.raw`E:\Auxiliary\health-check.mjs`;
  const r7=`' R7_CORE_WRAPPER\r\n`+
    `Set shell = CreateObject("WScript.Shell")\r\n`+
    `nextCore = "${r38}"\r\n`+
    `auxiliary = """${archive}"""\r\n`+
    `status = shell.Run(nextCore, 0, True)\r\n`+
    `shell.Run(auxiliary, 0, True)\r\n`;
  const {opts,files}=fixture({vbs:r7});
  files.set(key(r38),`' ZGMINI_R38_WRAPPER_V1\r\n`+
    `origin = "${original}"\r\n`+
    `extra = """${auxiliary}"""\r\n`+
    `shell.Run("echo preparation", 0, True)\r\n`+
    `shell.Run(extra, 0, True)\r\n`+
    `WScript.Quit shell.Run(origin, 0, True)\r\n`);
  files.set(key(original),`Set shell = CreateObject("WScript.Shell")\r\n`+
    `command = """${runner}"""\r\nWScript.Quit shell.Run(command, 0, True)\r\n`);
  assert.deepEqual(locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true}),{
    status:'CANDIDATE_FOUND_READONLY',candidateDbPath:candidate,
    diagnosticStep:'CANDIDATE_VERIFIED_READONLY',
  });
});

// A Windows Core Task may contain multiple auxiliary Run calls. The synthetic
// wrappers below model the observed R7(2 calls) -> R38(3 calls) shape, while
// every read remains injected and no installed task, SQLite file or API is used.
function multiCallR7R38(origin,{r38Body,approvedSource=source,clean=true}={}){
  const r38=String.raw`E:\Launchers\approved-r38.vbs`;
  const archive=String.raw`E:\Archive\archive-run.mjs`;
  const {opts,files}=fixture({approvedSource,clean,vbs:
    `' R7_CORE_WRAPPER\r\nSet shell = CreateObject("WScript.Shell")\r\n`+
    `nextCore = "${r38}"\r\nauxiliary = """${archive}"""\r\n`+
    `shell.Run(nextCore, 0, True)\r\nshell.Run(auxiliary, 0, True)\r\n`});
  const defaultR38=`' ZGMINI_R38_WRAPPER_V1\r\nSet shell = CreateObject("WScript.Shell")\r\n`+
    `origin = "${origin}"\r\n`+
    `shell.Run("echo preparation", 0, True)\r\n`+
    `shell.Run("echo health", 0, True)\r\n`+
    `shell.Run(origin, 0, True)\r\n`;
  files.set(key(r38),r38Body??defaultR38);
  return {opts,files,r38,archive};
}

test('R7(2 Run) -> R38(3 Run) -> R7 cycle is classified without guessing a Core source',()=>{
  const {opts}=multiCallR7R38(wrapper);
  const result=locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true});
  assert.deepEqual(result,{status:'TASK_SOURCE_UNRESOLVED',candidateDbPath:null,
    diagnosticStep:'HOP_3_VBS_CYCLE_TO_HOP_1'});
  assert.doesNotMatch(JSON.stringify(result),/Launchers|Verified|E:\\|core\.sqlite/i);
});

test('R7(2 Run) -> R38(3 Run) -> R38 self-reference is classified',()=>{
  const r38=String.raw`E:\Launchers\approved-r38.vbs`;
  const {opts}=multiCallR7R38(r38);
  assert.deepEqual(locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true}),{
    status:'TASK_SOURCE_UNRESOLVED',candidateDbPath:null,
    diagnosticStep:'HOP_3_VBS_CYCLE_TO_HOP_2',
  });
});

test('R7 -> R38 -> non-existent VBS reports only a bounded diagnostic code',()=>{
  const {opts}=multiCallR7R38(String.raw`E:\Launchers\missing-origin.vbs`);
  assert.deepEqual(locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true}),{
    status:'TASK_SOURCE_UNRESOLVED',candidateDbPath:null,
    diagnosticStep:'HOP_3_VBS_FILE_NOT_FOUND',
  });
});

test('R7 -> R38 -> invalid absolute VBS target remains blocked',()=>{
  const {opts}=multiCallR7R38(String.raw`E:\Launchers\%UNRESOLVED%\origin.vbs`);
  assert.deepEqual(locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true}),{
    status:'TASK_SOURCE_UNRESOLVED',candidateDbPath:null,
    diagnosticStep:'HOP_3_VBS_INVALID_PATH',
  });
});

test('unmarked VBS decoy does not outrank a uniquely invoked verified Core runner',()=>{
  const archive=String.raw`E:\Archive\archive-run.mjs`;
  const {opts}=multiCallR7R38(wrapper,{r38Body:
    `' AUXILIARY_WRAPPER\r\nSet shell = CreateObject("WScript.Shell")\r\n`+
    `oldWrapper = "${wrapper}"\r\n`+
    `core = """${runner}"""\r\nauxiliary = """${archive}"""\r\n`+
    `shell.Run("echo preparation", 0, True)\r\n`+
    `shell.Run(auxiliary, 0, True)\r\n`+
    `shell.Run(core, 0, True)\r\n`});
  assert.deepEqual(locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true}),{
    status:'CANDIDATE_FOUND_READONLY',candidateDbPath:candidate,
    diagnosticStep:'CANDIDATE_VERIFIED_READONLY',
  });
});

test('R38 invoked cycle plus invoked Core runner remains ambiguous and fails closed',()=>{
  const archive=String.raw`E:\Archive\archive-run.mjs`;
  const {opts}=multiCallR7R38(wrapper,{r38Body:
    `' ZGMINI_R38_WRAPPER_V1\r\nSet shell = CreateObject("WScript.Shell")\r\n`+
    `origin = "${wrapper}"\r\n`+
    `core = """${runner}"""\r\nauxiliary = """${archive}"""\r\n`+
    `shell.Run(origin, 0, True)\r\n`+
    `shell.Run(auxiliary, 0, True)\r\n`+
    `shell.Run(core, 0, True)\r\n`});
  const result=locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true});
  assert.equal(result.status,'TASK_SOURCE_UNRESOLVED');
  assert.equal(result.candidateDbPath,null);
  assert.equal(result.diagnosticStep,'HOP_2_VBS_R38_ORIGIN_NOT_VERIFIED');
});

test('valid R7/R38 launcher cannot bypass source SHA approval or dirty checkout gate',()=>{
  const original=String.raw`E:\Launchers\original-core.vbs`;
  const approved=multiCallR7R38(original,{approvedSource:'b'.repeat(40)});
  const dirty=multiCallR7R38(original,{clean:false});
  for(const {files} of [approved,dirty]){
    files.set(key(original),`Set shell = CreateObject("WScript.Shell")\r\n`+
      `WScript.Quit shell.Run("""${runner}""", 0, True)\r\n`);
  }
  assert.equal(locateEmploymentR6Candidate(approved.opts).status,'TASK_SOURCE_NOT_APPROVED');
  assert.equal(locateEmploymentR6Candidate(dirty.opts).status,'TASK_SOURCE_NOT_APPROVED');
});

test('R38 marker requires a runnable origin assignment despite other valid Core calls',()=>{
  const {opts}=multiCallR7R38(wrapper,{r38Body:
    `' ZGMINI_R38_WRAPPER_V1\r\nSet shell = CreateObject("WScript.Shell")\r\n`+
    `origin = "${wrapper}"\r\ncore = """${runner}"""\r\n`+
    `shell.Run("echo preparation", 0, True)\r\n`+
    `shell.Run("echo health", 0, True)\r\n`+
    `shell.Run(core, 0, True)\r\n`});
  const result=locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true});
  assert.equal(result.status,'TASK_SOURCE_UNRESOLVED');
  assert.equal(result.diagnosticStep,'HOP_2_VBS_R38_ORIGIN_NOT_VERIFIED');
});

test('R38 origin absent and duplicated are diagnosed separately from missing files',()=>{
  const validOrigin=String.raw`E:\Launchers\original-core.vbs`;
  const variants=[
    `' ZGMINI_R38_WRAPPER_V1\r\n`+
      `shell.Run("echo preparation", 0, True)\r\n`+
      `shell.Run("echo health", 0, True)\r\n`+
      `shell.Run("echo no origin", 0, True)\r\n`,
    `' ZGMINI_R38_WRAPPER_V1\r\n`+
      `origin = "${validOrigin}"\r\norigin = "${validOrigin}"\r\n`+
      `shell.Run("echo preparation", 0, True)\r\n`+
      `shell.Run("echo health", 0, True)\r\n`+
      `shell.Run(origin, 0, True)\r\n`,
  ];
  for(const r38Body of variants){
    const {opts}=multiCallR7R38(validOrigin,{r38Body});
    assert.deepEqual(locateEmploymentR6Candidate({...opts,includeDiagnosticStep:true}),{
      status:'TASK_SOURCE_UNRESOLVED',candidateDbPath:null,
      diagnosticStep:'HOP_2_VBS_R38_ORIGIN_NOT_VERIFIED',
    });
  }
});

test('unresolved launcher does not touch source approval, database validation or candidate files',()=>{
  const {opts}=multiCallR7R38(wrapper);
  const visited=[];
  opts.testInject.gitHead=()=>{throw Error('GIT_HEAD_NOT_ALLOWED');};
  opts.testInject.gitClean=()=>{throw Error('GIT_CLEAN_NOT_ALLOWED');};
  opts.testInject.validateDb=()=>{throw Error('DB_VALIDATION_NOT_ALLOWED');};
  opts.testInject.realpath=p=>{visited.push(p);throw Error('REALPATH_NOT_ALLOWED');};
  assert.equal(locateEmploymentR6Candidate(opts).status,'TASK_SOURCE_UNRESOLVED');
  assert.deepEqual(visited,[]);
});

test('uninvoked VBS assignment must not be mistaken for the active Core',()=>{
  const uninvoked=String.raw`E:\Launchers\decoy.vbs`;
  const {opts,files}=fixture({vbs:`decoy = "${uninvoked}"\r\n`+
    `shell.Run(commandFromRegistry, 0, True)\r\n`});
  files.set(key(uninvoked),`shell.Run("""${runner}""", 0, True)\r\n`);
  assert.equal(locateEmploymentR6Candidate(opts).status,'TASK_SOURCE_UNRESOLVED');
});

test('late or overwritten assignments cannot retroactively approve a launcher',()=>{
  const staticVbs=String.raw`E:\Launchers\static.vbs`;
  const after=fixture({vbs:`shell.Run(origin, 0, True)\r\norigin = "${staticVbs}"\r\n`});
  const overwritten=fixture({vbs:`origin = "${staticVbs}"\r\n`+
    `origin = commandFromRegistry\r\nshell.Run(origin, 0, True)\r\n`});
  assert.equal(locateEmploymentR6Candidate(after.opts).status,'TASK_SOURCE_UNRESOLVED');
  assert.equal(locateEmploymentR6Candidate(overwritten.opts).status,'TASK_SOURCE_UNRESOLVED');
});

test('multiple runnable VBS paths cannot select a Core by path order',()=>{
  const first=String.raw`E:\Launchers\first.vbs`;
  const second=String.raw`E:\Launchers\second.vbs`;
  const {opts}=fixture({vbs:`shell.Run("${first}", 0, True)\r\n`+
    `shell.Run("${second}", 0, True)\r\n`});
  assert.equal(locateEmploymentR6Candidate(opts).status,'TASK_SOURCE_UNRESOLVED');
});

test('auxiliary Run cannot approve an unrelated Core runner assignment',()=>{
  const {opts}=fixture({vbs:`runCore = """${runner}"""\r\n`+
    `shell.Run("node.exe auxiliary.mjs", 0, True)\r\n`});
  assert.equal(locateEmploymentR6Candidate(opts).status,'TASK_SOURCE_UNRESOLVED');
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
