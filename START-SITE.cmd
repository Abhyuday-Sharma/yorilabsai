@echo off
rem ============================================================
rem  yorilabs.ai - start the site
rem
rem  Double-click this file. It opens the site in your browser
rem  and keeps the server running in this window.
rem  Close this window to stop the server.
rem ============================================================

cd /d "%~dp0"
title yorilabs.ai - dev server (close this window to stop)

echo.
echo   Starting yorilabs.ai ...
echo.
echo     site   http://localhost:8080/site/
echo     docs   http://localhost:8080/docs/
echo.
echo   Leave this window open. Close it to stop the server.
echo.

rem give the server a moment, then open the browser
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start """" http://localhost:8080/site/"

python serve.py 8080

rem if python is missing or the port is busy, the line above exits immediately
echo.
echo   The server stopped.
echo   If that was instant, either Python is not installed
echo   or port 8080 is already in use.
echo.
pause
