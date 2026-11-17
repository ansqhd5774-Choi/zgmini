import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeR69TaskXml,summarizeR69Verbose,summarizeR69Log,
  decodeR69Windows,
} from '../scripts/pc-writer/theme-nine-r69-schedule-readonly.mjs';

test('R69 decodes Windows UTF-16LE XML',()=>{
  const raw=Buffer.from('\ufeff<Task><Actions></Actions></Task>','utf16le');
  assert.equal(decodeR69Windows(raw),'<Task><Actions></Actions></Task>');
});

test('R69 reports observed native schtasks limitations, without task writes',()=>{
  const xml=`<Task><Principals><Principal><LogonType>InteractiveToken</LogonType></Principal></Principals>
    <Settings><DisallowStartIfOnBatteries>true</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>true</StopIfGoingOnBatteries><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy></Settings>
    <Triggers><CalendarTrigger><StartBoundary>2026-10-28T11:30:00</StartBoundary></CalendarTrigger></Triggers>
    <Actions><Exec><Command>E:\\ZGmini\\data\\pc-writer\\theme-nine-r48\\THEME_NINE_R48_PRIVATE_CYCLE.cmd</Command></Exec></Actions></Task>`;
  const result=summarizeR69TaskXml(xml,{action:'THEME_NINE_R48_PRIVATE_CYCLE.cmd',time:'11:30'});
  assert.equal(result.expectedActionMatches,true);
  assert.equal(result.expectedLocalTimeMatches,true);
  assert.equal(result.startWhenAvailable,false);
  assert.equal(result.startWhenAvailableExplicit,false);
  assert.deepEqual(result.riskCodes,['LOGIN_SESSION_REQUIRED','BATTERY_START_BLOCKED','BATTERY_RUN_STOPS','MISSED_RUN_NO_CATCHUP']);
});

test('R69 catches safe explicit task properties and bilingual run fields',()=>{
  const xml=`<Task><Settings><StartWhenAvailable>true</StartWhenAvailable><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries></Settings>
  <Triggers><StartBoundary>2026-10-28T13:30:00</StartBoundary></Triggers><Actions><Command>E:/ZGmini/pc/THEME_NINE_R54_PUBLIC_CYCLE.cmd</Command></Actions></Task>`;
  const result=summarizeR69TaskXml(xml,{action:'THEME_NINE_R54_PUBLIC_CYCLE.cmd',time:'13:30'});
  assert.equal(result.startWhenAvailable,true);
  assert.equal(result.disallowStartOnBattery,false);
  assert.deepEqual(result.riskCodes,[]);
  const verbose='Last Run Time: 2026-10-29 11:30:00\nLast Result: 0\nNext Run Time: 2026-10-30 11:30:00\nRun As User: SECRET';
  assert.deepEqual(summarizeR69Verbose(verbose),{lastRun:'2026-10-29 11:30:00',lastResult:'0',nextRun:'2026-10-30 11:30:00',verboseReadable:true});
});

test('R69 accepts cmd.exe wrapper tasks and hexadecimal last-result codes',()=>{
  const xml=`<Task><Settings><StartWhenAvailable>true</StartWhenAvailable></Settings>
  <Triggers><StartBoundary>2026-10-28T11:30:00</StartBoundary></Triggers>
  <Actions><Exec><Command>cmd.exe</Command><Arguments>/d /c ""E:\\ZGmini\\data\\pc-writer\\theme-nine-r48\\THEME_NINE_R48_PRIVATE_CYCLE.cmd""</Arguments></Exec></Actions></Task>`;
  assert.equal(summarizeR69TaskXml(xml,{action:'THEME_NINE_R48_PRIVATE_CYCLE.cmd',time:'11:30'}).expectedActionMatches,true);
  assert.equal(summarizeR69Verbose('Last Result: 0x0').lastResult,'0x0');
});

test('R69 log summary excludes credential-looking payload, emits whitelisted status only',()=>{
  const raw='REPORT=THEME_NINE_R54_DAILY_PUBLIC_SCORE_CONNECTION\nSTARTED=2026-10-29 13:30:00\n'+
    '{"status":"D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH","d1Writes":1,"publicWrites":0,"token":"SENSITIVE_SECRET"}';
  const result=JSON.stringify(summarizeR69Log(raw));
  assert.match(result,/D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH/);
  assert.match(result,/"d1Writes":1/);
  assert.doesNotMatch(result,/SENSITIVE_SECRET|token/);
});

test('R69 recognizes only the approved R73 scheduled Task direct launcher',()=>{
  const xml=String.raw`<Task><Triggers><StartBoundary>2026-11-17T11:30:00</StartBoundary></Triggers>
  <Actions><Exec><Command>E:\ZGmini\data\pc-writer\theme-nine-r48\THEME_NINE_R73_SCHEDULED_PRIVATE.cmd</Command></Exec></Actions></Task>`;
  const result=summarizeR69TaskXml(xml,{action:'THEME_NINE_R48_PRIVATE_CYCLE.cmd',time:'11:30'});
  assert.equal(result.privateActionKind,'R73_SCHEDULED_PRIVATE');
  assert.equal(result.expectedActionMatches,true);
  assert.equal(result.riskCodes.includes('UNEXPECTED_ACTION'),false);
  assert.equal(JSON.stringify(result).includes('E:\\ZGmini'),false);
});

test('R69 accepts exact R48 or R73 cmd.exe /d /c quoted private-chain wrappers',()=>{
  for(const [name,expected] of [
    ['THEME_NINE_R48_PRIVATE_CYCLE.cmd','R48_PRIVATE_CYCLE'],
    ['THEME_NINE_R73_SCHEDULED_PRIVATE.cmd','R73_SCHEDULED_PRIVATE']
  ]){
    const xml=String.raw`<Task><Triggers><StartBoundary>2026-11-17T11:30:00</StartBoundary></Triggers>
    <Actions><Exec><Command>cmd.exe</Command><Arguments>/d /c &quot;&quot;E:\ZGmini\data\pc-writer\theme-nine-r48\PRIVATE_ACTION_FILE&quot;&quot;</Arguments></Exec></Actions></Task>`;
    const result=summarizeR69TaskXml(xml.replace('PRIVATE_ACTION_FILE',name),{action:'THEME_NINE_R48_PRIVATE_CYCLE.cmd',time:'11:30'});
    assert.equal(result.privateActionKind,expected);
    assert.equal(result.expectedActionMatches,true);
  }
});

test('R69 refuses unrelated R47 direct path, argument suffix, second Exec, and arbitrary cmd.exe',()=>{
  const head='<Task><Triggers><StartBoundary>2026-11-17T11:30:00</StartBoundary></Triggers><Actions>';
  const tail='</Actions></Task>';
  const cmd='E:\\ZGmini\\data\\pc-writer\\theme-nine-r48\\THEME_NINE_R48_PRIVATE_CYCLE.cmd';
  const cases=[
    '<Exec><Command>'+cmd.replace('R48_PRIVATE_CYCLE','R47_RECURRING_PRIVATE_UPDATE')+'</Command></Exec>',
    '<Exec><Command>cmd.exe</Command><Arguments>/d /c ""'+cmd+'"" &amp; echo BYPASS</Arguments></Exec>',
    '<Exec><Command>E:\\Unapproved\\cmd.exe</Command><Arguments>/d /c ""'+cmd+'""</Arguments></Exec>',
    '<Exec><Command>'+cmd+'</Command></Exec><Exec><Command>'+cmd+'</Command></Exec>',
    '<Exec><Command>'+cmd+'</Command><Arguments>extra</Arguments></Exec>'
  ];
  for(const body of cases){
    const result=summarizeR69TaskXml(head+body+tail,{action:'THEME_NINE_R48_PRIVATE_CYCLE.cmd',time:'11:30'});
    assert.equal(result.privateActionKind,null);
    assert.equal(result.expectedActionMatches,false);
    assert.ok(result.riskCodes.includes('UNEXPECTED_ACTION'));
    assert.equal(JSON.stringify(result).includes('BYPASS'),false);
  }
});
