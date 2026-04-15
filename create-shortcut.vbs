Set WshShell = WScript.CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
strAppDir = Replace(WScript.ScriptFullName, "\create-shortcut.vbs", "")

Set oShortcut = WshShell.CreateShortcut(strDesktop & "\TaskFlow.lnk")
oShortcut.TargetPath = strAppDir & "\launch.bat"
oShortcut.WorkingDirectory = strAppDir
oShortcut.IconLocation = strAppDir & "\src\icon.ico,0"
oShortcut.WindowStyle = 7
oShortcut.Description = "Daily Task Tracker - TaskFlow"
oShortcut.Save

WScript.Echo "Shortcut created at: " & strDesktop & "\TaskFlow.lnk"
