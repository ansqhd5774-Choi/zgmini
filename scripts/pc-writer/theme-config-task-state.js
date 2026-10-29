// Windows Script Host / Task Scheduler COM: read only.
// Numeric state avoids localized schtasks status text.
try {
  var service = new ActiveXObject("Schedule.Service");
  service.Connect();
  var task = service.GetFolder("\\").GetTask("ZGMINI-PC-Configured-Themes");
  WScript.Echo("ZG_TASK_STATE=" + task.State);
} catch (e) {
  WScript.Echo("ZG_TASK_STATE_ERROR");
  WScript.Quit(2);
}
