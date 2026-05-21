@echo off
echo Starting Spring Boot...
call gradlew.bat bootRun 1>boot_out.txt 2>&1
echo Exit code: %ERRORLEVEL%
type boot_out.txt
pause
