@echo off
REM Start development server in a new CMD window with CHOKIDAR_IGNORE set to avoid watcher-triggered restarts
cd /d "%~dp0"
REM Ignore watch artifacts, backups and generated files to avoid spurious restarts
start "nom035-dev" cmd /k "set CHOKIDAR_IGNORE=**/node_modules/**;**/public/**;**/src/i18n/**;**/watch-log.txt;**/backups/**;**/*.bak;**/scripts/** && npm start"
exit /b 0
