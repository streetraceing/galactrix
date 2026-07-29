@echo off
setlocal

set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if defined CARGO_HOME set "CARGO_BIN=%CARGO_HOME%\bin"
if exist "%CARGO_BIN%\cargo.exe" (
  set "CARGO=%CARGO_BIN%\cargo.exe"
  set "PATH=%CARGO_BIN%;%PATH%"
)

set "NODE_EXE="
if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_EXE=%NVM_SYMLINK%\node.exe"
if not defined NODE_EXE for %%I in (node.exe) do set "NODE_EXE=%%~$PATH:I"

if not defined NODE_EXE (
  echo Node.js was not found. Run "nvm use" and restart this terminal or Android Studio.
  exit /b 1
)

where cargo >nul 2>nul
if errorlevel 1 (
  echo Rust Cargo was not found. Install Rust with rustup or add %%USERPROFILE%%\.cargo\bin to PATH.
  exit /b 1
)

"%NODE_EXE%" "%~dp0tauri.mjs" %*
exit /b %ERRORLEVEL%
