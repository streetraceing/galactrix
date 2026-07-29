@echo off
setlocal

set "CARGO_EXE="
if defined CARGO if exist "%CARGO%" set "CARGO_EXE=%CARGO%"
if not defined CARGO_EXE if defined CARGO_HOME if exist "%CARGO_HOME%\bin\cargo.exe" set "CARGO_EXE=%CARGO_HOME%\bin\cargo.exe"
if not defined CARGO_EXE if defined CARGO_HOME if exist "%CARGO_HOME%\cargo.exe" set "CARGO_EXE=%CARGO_HOME%\cargo.exe"
if not defined CARGO_EXE if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "CARGO_EXE=%USERPROFILE%\.cargo\bin\cargo.exe"
if not defined CARGO_EXE for %%I in (cargo.exe) do if not "%%~$PATH:I"=="" set "CARGO_EXE=%%~$PATH:I"

if not defined CARGO_EXE (
  echo Rust Cargo was not found. Install Rust with rustup or set CARGO to the full path to cargo.exe.
  exit /b 1
)

for %%I in ("%CARGO_EXE%") do set "CARGO_BIN=%%~dpI"
set "CARGO=%CARGO_EXE%"
set "PATH=%CARGO_BIN%;%PATH%"

set "NODE_EXE="
if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_EXE=%NVM_SYMLINK%\node.exe"
if not defined NODE_EXE for %%I in (node.exe) do set "NODE_EXE=%%~$PATH:I"

if not defined NODE_EXE (
  echo Node.js was not found. Run "nvm use" and restart this terminal or Android Studio.
  exit /b 1
)

"%NODE_EXE%" "%~dp0tauri.mjs" %*
exit /b %ERRORLEVEL%
