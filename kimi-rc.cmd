@echo off
if "%KIMI_EXE%"=="" set "KIMI_EXE=C:\Users\super\.kimi-code\bin\kimi.exe"
if not exist "%KIMI_EXE%" (
  echo Kimi CLI not found: %KIMI_EXE%
  echo Set KIMI_EXE to the kimi.exe path.
  exit /b 1
)
echo Starting Kimi Remote Control. Copy the code-rc.kimi.com URL from the log below.
echo Press Ctrl+C to stop.
"%KIMI_EXE%" web --rc --no-open --log-level info
exit /b %ERRORLEVEL%
