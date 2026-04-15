@echo off
title TaskFlow Installer
color 1F
echo.
echo  =============================================
echo       TaskFlow - Daily Task Tracker Setup
echo  =============================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed.
    echo  Please download it from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Set install directory
set "INSTALL_DIR=%LOCALAPPDATA%\TaskFlow"

echo  Install location: %INSTALL_DIR%
echo.
echo  Press any key to install, or close this window to cancel.
pause >nul

echo.
echo  [1/4] Creating install directory...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\src" mkdir "%INSTALL_DIR%\src"
if not exist "%INSTALL_DIR%\data" mkdir "%INSTALL_DIR%\data"

echo  [2/4] Copying application files...
copy /Y "%~dp0server.js" "%INSTALL_DIR%\server.js" >nul
copy /Y "%~dp0patcher.js" "%INSTALL_DIR%\patcher.js" >nul
copy /Y "%~dp0version.json" "%INSTALL_DIR%\version.json" >nul
copy /Y "%~dp0package.json" "%INSTALL_DIR%\package.json" >nul
copy /Y "%~dp0src\index.html" "%INSTALL_DIR%\src\index.html" >nul
copy /Y "%~dp0src\styles.css" "%INSTALL_DIR%\src\styles.css" >nul
copy /Y "%~dp0src\app.js" "%INSTALL_DIR%\src\app.js" >nul
copy /Y "%~dp0src\icon.ico" "%INSTALL_DIR%\src\icon.ico" >nul

echo  [3/4] Creating launcher...
(
echo Set WshShell = WScript.CreateObject^("WScript.Shell"^)
echo strAppDir = Replace^(WScript.ScriptFullName, "\launch.vbs", ""^)
echo WshShell.CurrentDirectory = strAppDir
echo WshShell.Run """C:\Program Files\nodejs\node.exe"" """ ^& strAppDir ^& "\patcher.js""", 0, False
) > "%INSTALL_DIR%\launch.vbs"

echo  [4/4] Creating shortcuts...

:: Desktop shortcut
(
echo Set WshShell = WScript.CreateObject^("WScript.Shell"^)
echo strDesktop = WshShell.SpecialFolders^("Desktop"^)
echo Set oShortcut = WshShell.CreateShortcut^(strDesktop ^& "\TaskFlow.lnk"^)
echo oShortcut.TargetPath = "wscript.exe"
echo oShortcut.Arguments = """"%INSTALL_DIR%\launch.vbs""""
echo oShortcut.WorkingDirectory = "%INSTALL_DIR%"
echo oShortcut.IconLocation = "%INSTALL_DIR%\src\icon.ico,0"
echo oShortcut.Description = "TaskFlow - Daily Task Tracker"
echo oShortcut.Save
) > "%TEMP%\taskflow-shortcut.vbs"
cscript //nologo "%TEMP%\taskflow-shortcut.vbs"
del "%TEMP%\taskflow-shortcut.vbs"

:: Start Menu shortcut
set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
(
echo Set WshShell = WScript.CreateObject^("WScript.Shell"^)
echo Set oShortcut = WshShell.CreateShortcut^("%STARTMENU%\TaskFlow.lnk"^)
echo oShortcut.TargetPath = "wscript.exe"
echo oShortcut.Arguments = """"%INSTALL_DIR%\launch.vbs""""
echo oShortcut.WorkingDirectory = "%INSTALL_DIR%"
echo oShortcut.IconLocation = "%INSTALL_DIR%\src\icon.ico,0"
echo oShortcut.Description = "TaskFlow - Daily Task Tracker"
echo oShortcut.Save
) > "%TEMP%\taskflow-startmenu.vbs"
cscript //nologo "%TEMP%\taskflow-startmenu.vbs"
del "%TEMP%\taskflow-startmenu.vbs"

:: Create uninstaller
(
echo @echo off
echo title TaskFlow Uninstaller
echo echo.
echo echo  Removing TaskFlow...
echo echo.
echo taskkill /F /IM node.exe /FI "MODULES eq server.js" ^>nul 2^>^&1
echo rmdir /S /Q "%INSTALL_DIR%"
echo del "%STARTMENU%\TaskFlow.lnk" ^>nul 2^>^&1
echo set "DESKTOP=%%USERPROFILE%%\Desktop"
echo del "%%DESKTOP%%\TaskFlow.lnk" ^>nul 2^>^&1
echo set "DESKTOP=%%USERPROFILE%%\OneDrive\Desktop"
echo del "%%DESKTOP%%\TaskFlow.lnk" ^>nul 2^>^&1
echo echo  TaskFlow has been uninstalled.
echo echo.
echo pause
) > "%INSTALL_DIR%\uninstall.bat"

echo.
echo  =============================================
echo        Installation Complete!
echo  =============================================
echo.
echo  TaskFlow has been installed to:
echo    %INSTALL_DIR%
echo.
echo  Shortcuts created:
echo    - Desktop: TaskFlow
echo    - Start Menu: TaskFlow
echo.
echo  To uninstall: run %INSTALL_DIR%\uninstall.bat
echo.
echo  Launching TaskFlow now...
echo.

:: Launch the app
wscript.exe "%INSTALL_DIR%\launch.vbs"

timeout /t 3 /nobreak >nul
