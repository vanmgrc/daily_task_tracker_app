Set WshShell = WScript.CreateObject("WScript.Shell")
strAppDir = Replace(WScript.ScriptFullName, "\launch.vbs", "")
WshShell.CurrentDirectory = strAppDir
WshShell.Run """C:\Program Files\nodejs\node.exe"" """ & strAppDir & "\patcher.js""", 0, False
