@echo off
setlocal
if "%GIT_BASH%"=="" set "GIT_BASH=C:\Program Files\Git\bin\bash.exe"
if not exist "%GIT_BASH%" (
  echo Git Bash not found: %GIT_BASH%
  echo Set GIT_BASH to the bash.exe path.
  exit /b 1
)
"%GIT_BASH%" "%~dp0start-public.sh" %*
exit /b %ERRORLEVEL%
