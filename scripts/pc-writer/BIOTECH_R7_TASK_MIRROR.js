// cscript.exe JScript: copy *only the schedule/PC execution settings* from
// the already registered seven-theme GMH task. NEVER edit the original task.
// Windows Task Scheduler COM interfaces are used so locale-dependent
// `schtasks /query /v` output never changes registration decisions.
(function(){
 var TEMPLATE='ZGMINI-PC-GetMarketHistory-ETF';
 var TARGET='ZGMINI-PC-Theme-Biotech';
 var RUNNER='E:\\ZGmini\\data\\themes\\biotech\\source-r7\\BIOTECH_R7_SCHEDULED.cmd';
 function fail(code){throw new Error(code);}
 function emit(status,reason,templateCount,targetExists){
  var data={report:'BIOTECH_R7_TASK_MIRROR',status:status,sourceTask:TEMPLATE,targetTask:TARGET,
   triggerCount:templateCount,targetExists:targetExists,existingSevenTaskChanges:0};
  if(reason)data.reason=reason;
  WScript.Echo(JSON.stringify(data));
 }
 var command=WScript.Arguments.length===1?WScript.Arguments.Item(0):'';
 if(command!=='--inspect'&&command!=='--apply'){emit('BLOCKED','ARGS_INVALID',0,false);WScript.Quit(2);}
 try{
  var filesystem=new ActiveXObject('Scripting.FileSystemObject');
  if(!filesystem.FileExists(RUNNER))fail('BIOTECH_R7_RUNNER_NOT_INSTALLED');
  if(!filesystem.FileExists('E:\\ZGmini\\runtime\\node.exe'))fail('APPROVED_NODE_RUNTIME_MISSING');
  var service=new ActiveXObject('Schedule.Service');service.Connect();
  var root=service.GetFolder('\\');
  var original=root.GetTask(TEMPLATE);
  if(!original.Enabled)fail('SEVEN_THEME_TEMPLATE_TASK_DISABLED');
  var definition=original.Definition;
  if(definition.Triggers.Count<1||definition.Actions.Count<1)fail('SEVEN_THEME_TEMPLATE_TASK_INVALID');
  // Avoid creating a task with a credential/password-dependent identity. This
  // installer never asks for, reads or stores a Windows account password.
  var logon=definition.Principal.LogonType;
  if(logon!==2&&logon!==3&&logon!==5)fail('SEVEN_THEME_TEMPLATE_LOGON_REQUIRES_MANUAL_REVIEW');
  var existing=null;
  try{existing=root.GetTask(TARGET);}catch(notFound){}
  if(existing){
   var a=existing.Definition.Actions;
   if(a.Count!==1||a.Item(1).Type!==0||String(a.Item(1).Arguments).indexOf(RUNNER)<0)
    fail('EXISTING_BIOTECH_TASK_NOT_OURS');
   if(existing.Definition.Triggers.Count!==definition.Triggers.Count)
    fail('EXISTING_BIOTECH_TASK_TRIGGER_DRIFT');
   emit('EXISTING_TASK_VERIFIED',null,definition.Triggers.Count,true);
   WScript.Quit(0);
  }
  if(command==='--inspect'){
   emit('READY_TO_MIRROR_SEVEN_THEME_TASK',null,definition.Triggers.Count,false);
   WScript.Quit(0);
  }
  definition.Actions.Clear();
  var action=definition.Actions.Create(0);
  action.Path='C:\\Windows\\System32\\cmd.exe';
  action.Arguments='/d /c ""'+RUNNER+'""';
  action.WorkingDirectory='E:\\ZGmini\\data\\themes\\biotech\\source-r7';
  // Registration uses TASK_CREATE, never CREATE_OR_UPDATE or UPDATE.
  root.RegisterTaskDefinition(TARGET,definition,2,null,null,logon);
  var registered=root.GetTask(TARGET);
  if(!registered.Enabled||registered.Definition.Triggers.Count!==original.Definition.Triggers.Count)
   fail('NEW_BIOTECH_TASK_READBACK_MISMATCH');
  emit('REGISTERED_TRIGGER_MIRRORED',null,definition.Triggers.Count,false);
 }catch(error){
  emit('BLOCKED',String(error.message).slice(0,128),0,false);
  WScript.Quit(1);
 }
})();
