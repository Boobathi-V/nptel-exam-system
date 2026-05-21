@echo off
set JAVA_HOME=C:\Users\booba\OneDrive\Desktop\implement\NPTEL\nptel-backend\jdk-21.0.2
set PATH=%JAVA_HOME%\bin;%PATH%
echo Using Java: %JAVA_HOME%
echo Starting Spring Boot backend...
C:\Users\booba\OneDrive\Desktop\implement\NPTEL\nptel-backend\gradle-8.7\bin\gradle.bat bootRun
pause
