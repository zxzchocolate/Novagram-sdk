@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (
  echo Novagram needs Node.js 18 or newer.
  echo Install it from https://nodejs.org/ and run this again.
  exit /b 1
)
where npm >nul 2>nul || (
  echo npm was not found. Reinstall Node.js with npm included.
  exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 18 (
  echo Novagram needs Node.js 18 or newer.
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

call npm start
