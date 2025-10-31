@echo off
REM Cleanup test artifacts created by the assistant. This deletes watch-log.txt, scripts\watch-debug.js and this start-dev.bat file.
cd /d "%~dp0"
echo Stopping any watch-debug node processes (manual step: you may need to close windows that are running it)...
necho Deleting created files...
ndel /q watch-log.txt 2>nul || del /q watch-log.txt 2>nul
ndel /q start-dev.bat 2>nul || del /q start-dev.bat 2>nul
ndel /q scripts\watch-debug.js 2>nul || del /q scripts\watch-debug.js 2>nul
necho Done. If any processes remain, close the CMD windows titled 'nom035-dev' or stop node processes manually.
pause
