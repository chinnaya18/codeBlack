@echo off
title CODEBLACK - Stopping Services
color 0C
echo.
echo  Stopping CODEBLACK services...
echo.

:: Kill Node.js processes on ports 5000 and 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    echo  Stopping backend server (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo  Stopping frontend client (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill Python/uvicorn on port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo  Stopping AI service (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo  All CODEBLACK services stopped.
echo.
pause
