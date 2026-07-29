@echo off
setlocal

adb get-state >nul 2>nul
if errorlevel 1 (
  echo No Android device is connected through adb.
  exit /b 1
)

adb reverse tcp:1420 tcp:1420
if errorlevel 1 exit /b 1

adb reverse tcp:1421 tcp:1421
if errorlevel 1 exit /b 1

set "TAURI_DEV_HOST=127.0.0.1"
call npm run tauri -- android dev --host 127.0.0.1
exit /b %ERRORLEVEL%
