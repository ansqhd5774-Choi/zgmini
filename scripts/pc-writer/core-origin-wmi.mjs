// Fixed JScript read-only observation executed by the Core process itself.
// Emits bounded booleans/enums only. Never prints a process command, path or identity.
(function(){
 function out(linked,code,created,instances){
  // WSH JScript 5.7 does not guarantee the JSON global (even on modern Windows).
  var codes={INPUT_INVALID:1,CORE_TASK_NOT_RUNNING:1,
   CORE_TASK_ENGINE_NOT_VISIBLE:1,PROCESS_LIMIT:1,
   CORE_NODE_IDENTITY_UNVERIFIED:1,TASK_ENGINE_CHAIN_MATCH:1,
   TASK_ENGINE_CHAIN_UNVERIFIED:1,CORE_ORIGIN_PROBE_UNAVAILABLE:1};
  if(!codes[code])code='CORE_ORIGIN_PROBE_UNAVAILABLE';
  var createdNumber=typeof created==='number'&&isFinite(created)&&created>=946684800000?
   String(Math.floor(created)):'null';
  var count=typeof instances==='number'&&isFinite(instances)&&instances>=0&&instances<=12?
   String(Math.floor(instances)):'0';
  WScript.Echo('{"ok":true,"linked":'+(linked===true?'true':'false')+
   ',"code":"'+code+'","createdAtMs":'+createdNumber+
   ',"visibleInstances":'+count+'}');
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
  if(!isFinite(count)||count<0||count>12){out(false,'CORE_TASK_ENGINE_NOT_VISIBLE',null,0);return;}
  for(var i=1;i<=count;i++){
   var engine=Number(running.Item(i).EnginePID);
   if(isFinite(engine)&&engine>0)engines[String(engine)]=true;
  }
  if(count===0){
   // GetInstances(0) may omit this hidden task. Use the official include-hidden
   // service view, accepting only the exact running Core path and valid identity.
   var hidden=scheduler.GetRunningTasks(1),total=Number(hidden.Count);
   if(!isFinite(total)||total<0||total>256){out(false,'CORE_TASK_ENGINE_NOT_VISIBLE',null,0);return;}
   for(var h=1;h<=total;h++){
    var instance=hidden.Item(h),instancePath=String(instance.Path||'').toLowerCase();
    var guid=String(instance.InstanceGuid||''),enginePid=Number(instance.EnginePID);
    if(instancePath==='\\zgmini-pc-local-core'&&Number(instance.State)===4&&
      /^\{[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\}$/i.test(guid)&&
      isFinite(enginePid)&&enginePid>0&&Math.floor(enginePid)===enginePid){
     engines[String(enginePid)]=true;count++;
    }
   }
  }
  if(count<1||count>12){out(false,'CORE_TASK_ENGINE_NOT_VISIBLE',null,0);return;}
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
   if(seen[String(cur)])break;seen[String(cur)]=true;
   // An EnginePID alone is not a verified ancestor: its current WMI row
   // must exist and must not have been created after its child (PID reuse).
   var row=records[String(cur)];
   if(!row||typeof row.created!=='number'||!isFinite(row.created)||
      row.created<946684800000)break;
   if(lastTime!==null&&row.created>lastTime)break;
   if(engines[String(cur)]){out(true,'TASK_ENGINE_CHAIN_MATCH',started,count);return;}
   if(!isFinite(row.parent)||row.parent<1)break;
   lastTime=row.created;
   cur=row.parent;
  }
  out(false,'TASK_ENGINE_CHAIN_UNVERIFIED',started,count);
 }catch(e){out(false,'CORE_ORIGIN_PROBE_UNAVAILABLE',null,0);}
}());
