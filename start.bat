@echo off
title CODEBLACK - Competition Platform
color 0A
echo.
echo  ============================================
echo      CODEBLACK - Competitive Coding Arena
echo  ============================================
echo.

:: Get the directory of this script
cd /d "%~dp0"

:: ─── Check Prerequisites ─────────────────────────────────
echo [*] Checking prerequisites...
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] Node.js not found! Install from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo     Node.js: %%i

:: Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] npm not found!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do echo     npm:     %%i

:: Check Python
py --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    python --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [!] Python not found - AI service will not start
        echo     Install from https://python.org
    ) else (
        for /f "tokens=*" %%i in ('python --version') do echo     Python:  %%i
    )
) else (
    for /f "tokens=*" %%i in ('py --version') do echo     Python:  %%i
)

echo.

:: ─── Install Dependencies ─────────────────────────────────
echo [*] Installing server dependencies...
cd code_black\server
call npm install --silent 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Server npm install failed!
    pause
    exit /b 1
)
echo     Server dependencies OK
cd ..\..

echo [*] Installing client dependencies...
cd code_black\client
call npm install --silent 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Client npm install failed!
    pause
    exit /b 1
)
echo     Client dependencies OK
cd ..\..

echo [*] Installing AI service dependencies...
cd code_black\ai-service
py -m pip install -r requirements.txt --quiet 2>nul || python -m pip install -r requirements.txt --quiet 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] AI dependencies install failed (AI features may not work)
) else (
    echo     AI dependencies OK
)
cd ..\..

echo.
echo  ============================================
echo     Starting CODEBLACK services...
echo  ============================================
echo.

:: ─── Start Backend Server (includes AI service auto-start) ──
echo [*] Starting backend server (port 5000)...
echo     AI service will auto-start on port 8000
cd code_black\server
start "CODEBLACK-Server" cmd /k "title CODEBLACK Backend ^& color 0A ^& node server.js"
cd ..\..

:: Wait for server to initialize
echo [*] Waiting for server to initialize...
timeout /t 4 /nobreak >nul

:: ─── Start Frontend Client ─────────────────────────────────
echo [*] Starting frontend client (port 3000)...
cd code_black\client
start "CODEBLACK-Client" cmd /k "title CODEBLACK Frontend ^& color 0B ^& set BROWSER=none ^& npx react-scripts start"
cd ..\..

:: Wait for client to start
echo [*] Waiting for client to compile...
timeout /t 8 /nobreak >nul

:: ─── Get Network Info ───────────────────────────────────────
echo.
echo  ============================================
echo     CODEBLACK is RUNNING!
echo  ============================================
echo.
echo  Services:
echo    Backend:    http://localhost:5000
echo    Frontend:   http://localhost:3000
echo    AI Service: http://localhost:8000
echo.
echo  For LAN access, use your machine's IP address:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    echo    http://%%a:3000
)
echo.
echo  Credentials:
echo    Competitors: user1 to user30 / pass123
echo    Admin:       admin / admin123
echo.
echo  ============================================
echo    Press any key to open in browser...
echo  ============================================
pause >nul

start http://localhost:3000
