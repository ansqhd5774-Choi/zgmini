// Fixed JScript read-only observation executed by the Core process itself.
// Emits bounded booleans/enums only. Never prints a process command, path or identity.
(function(){
 function out(linked,code,created,instances){
  WScript.Echo(JSON.stringify({ok:true,linked:linked===true,
   code:code,createdAtMs:created,visibleInstances:instances}));
 }
 function parsedTime(raw){
  var s=String(raw||''),m=/^(\d{14})\.\d{6}([+-])(\d{3})$/.exec(s);
  if(!m)return null;
  var n=Date.UTC(Number(s.slice(0,4)),Number(s.slice(4,6))-1,
   Number(s.slice(6,8)),Number(s.slice(8,10)),Number(s.slice(10,12)),
   Number(s.slice(12,14)));
  return n-Number(m[3])*(m[2]==='+'?1:-1)*60000;
 }
 try{
  if(WScript.Arguments.length!==2){out(false,'INPUT_INVALID',null,0);return;}
  var pidText=String(WScript.Arguments.Item(0)),expected=String(WScript.Arguments.Item(1)).toLowerCase();
  if(!/^[1-9][0-9]{0,9}$/.test(pidText)||
    !/^[ec]:\\zgmini\\projects\\[a-z0-9_-][a-z0-9._-]{0,79}(?:\\[a-z0-9_-][a-z0-9._-]{0,79}){0,2}\\scripts\\pc-writer\\local-cycle\.mjs$/.test(expected)){
   out(false,'INPUT_INVALID',null,0);return;
  }
  var scheduler=new ActiveXObject('Schedule.Service');scheduler.Connect();
  var task=scheduler.GetFolder('\\').GetTask('ZGMINI-PC-Local-Core');
  if(!task.Enabled||Number(task.State)!==4){out(false,'CORE_TASK_NOT_RUNNING',null,0);return;}
  var running=task.GetInstances(0),count=Number(running.Count),engines={};
  if(!isFinite(count)||count<1||count>12){out(false,'CORE_TASK_ENGINE_NOT_VISIBLE',null,0);return;}
  for(var i=1;i<=count;i++){
   var engine=Number(running.Item(i).EnginePID);
   if(isFinite(engine)&&engine>0)engines[String(engine)]=true;
  }
  var records={},enumeration=new Enumerator(GetObject('winmgmts:root\\cimv2')
   .ExecQuery('SELECT ProcessId,ParentProcessId,Name,CommandLine,CreationDate FROM Win32_Process'));
  var n=0;
  for(;!enumeration.atEnd();enumeration.moveNext()){
   var p=enumeration.item(),id=Number(p.ProcessId);
   if(!isFinite(id)||id<1)continue;
   if(++n>8192){out(false,'PROCESS_LIMIT',null,count);return;}
   records[String(id)]={parent:Number(p.ParentProcessId),name:String(p.Name||'').toLowerCase(),
    command:String(p.CommandLine||''),created:parsedTime(p.CreationDate)};
  }
  var me=records[pidText],nodeCmd='e:\\zgmini\\runtime\\node.exe '+expected+' --publish';
  // The fixed Windows Core lane has the exact --publish command, no extras.
  var canonical=me?me.command.replace(/"/g,'').replace(/^\s+|\s+$/g,'').replace(/\s+/g,' ').toLowerCase():'';
  if(!me||me.name!=='node.exe'||canonical!==nodeCmd||
    typeof me.created!=='number'||!isFinite(me.created)||me.created<946684800000){
   out(false,'CORE_NODE_IDENTITY_UNVERIFIED',null,count);return;
  }
  var started=me.created,seen={},cur=Number(pidText),lastTime=null;
  for(var j=0;j<64;j++){
   if(engines[String(cur)]){out(true,'TASK_ENGINE_CHAIN_MATCH',started,count);return;}
   if(seen[String(cur)])break;seen[String(cur)]=true;
   var row=records[String(cur)];
   if(!row||!isFinite(row.parent)||row.parent<1||
      typeof row.created!=='number'||!isFinite(row.created)||row.created<946684800000)break;
   if(lastTime!==null&&row.created>lastTime+1000)break;
   lastTime=row.created;
   cur=row.parent;
  }
  out(false,'TASK_ENGINE_CHAIN_UNVERIFIED',started,count);
 }catch(e){out(false,'CORE_ORIGIN_PROBE_UNAVAILABLE',null,0);}
}());
