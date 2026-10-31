Option Explicit
On Error Resume Next
If WScript.Arguments.Count < 1 Then WScript.Quit 2
Dim mode: mode = LCase(CStr(WScript.Arguments(0)))
If mode = "tasks" Then
 Dim svc, root, names, idx, t, enabledFlag, nextDate, iso
 Set svc=CreateObject("Schedule.Service")
 If Err.Number <> 0 Then WScript.Quit 2
 svc.Connect
 If Err.Number <> 0 Then WScript.Quit 2
 Set root=svc.GetFolder("\")
 If Err.Number <> 0 Then WScript.Quit 2
 names=Array("ZGMINI-PC-Local-Core","ZGMINI-PC-Local-Korea")
 For idx=0 To 1
  Err.Clear
  Set t=root.GetTask("\" & names(idx))
  If Err.Number <> 0 Then WScript.Quit 2
  enabledFlag="0"
  If t.Enabled Then enabledFlag="1"
  nextDate=t.NextRunTime
  If Err.Number <> 0 Or Not IsDate(nextDate) Then WScript.Quit 2
  iso=Year(nextDate) & "-" & Right("0" & Month(nextDate),2) & "-" & Right("0" & Day(nextDate),2) & "T" & Right("0" & Hour(nextDate),2) & ":" & Right("0" & Minute(nextDate),2) & ":" & Right("0" & Second(nextDate),2)
  If idx=0 Then
   WScript.Echo "TASK|CORE|" & enabledFlag & "|" & t.State & "|" & iso
  Else
   WScript.Echo "TASK|KOREA|" & enabledFlag & "|" & t.State & "|" & iso
  End If
 Next
ElseIf mode = "processes" Then
 If WScript.Arguments.Count <> 2 Then WScript.Quit 2
 Dim pcroot, wmi, processes, p, commandLine, lower
 pcroot=LCase(CStr(WScript.Arguments(1)))
 If Len(pcroot) < 10 Then WScript.Quit 2
 Set wmi=GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\cimv2")
 If Err.Number <> 0 Then WScript.Quit 2
 Set processes=wmi.ExecQuery("SELECT ProcessId,Name,CommandLine FROM Win32_Process WHERE Name='node.exe' OR Name='wscript.exe'")
 If Err.Number <> 0 Then WScript.Quit 2
 For Each p in processes
  If IsNull(p.CommandLine) Then
   WScript.Echo "UNVERIFIED"
   WScript.Quit 0
  End If
  lower=LCase(CStr(p.CommandLine))
  If InStr(1,lower,pcroot,1)>0 Or InStr(1,lower,"run-local.mjs",1)>0 Or InStr(1,lower,"local-cycle.mjs",1)>0 Or InStr(1,lower,"collect-local.mjs",1)>0 Then
   WScript.Echo "BUSY"
   WScript.Quit 0
  End If
 Next
 WScript.Echo "CLEAR"
Else
 WScript.Quit 2
End If
If Err.Number <> 0 Then WScript.Quit 2
