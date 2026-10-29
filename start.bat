:: SPDX-License-Identifier: GPL-3.0-or-later
@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title ZXScript Automation Bridge - by ZXD44
cd /d "%~dp0"

if not exist "%~dp0logs" mkdir "%~dp0logs" >nul 2>nul
set "LOGFILE=%~dp0logs\start.log"
call :log "===== %DATE% %TIME%  start.bat launched ====="
for /f "tokens=*" %%v in ('ver') do call :log "%%v"

cls
echo =====================================================================
echo    🚀 ZXScript Autonomous All-in-One Launcher - by ZXD44
echo    Roblox Studio AI Agent Bridge (Bloxstrap & Vanilla Supported)
echo =====================================================================
echo.

:: --- 1. Verify Project Files --------------------------------------------
echo   [1/6] Verifying project integrity...
if not exist "%~dp0bridge.py" (
    echo   [ERROR] bridge.py not found next to start.bat!
    echo   Make sure you extracted the complete folder before running.
    call :log "FATAL: bridge.py missing."
    pause
    exit /b 1
)
if not exist "%~dp0zxscript-extension\manifest.json" (
    echo   [WARNING] zxscript-extension folder not found!
    call :log "WARN: zxscript-extension missing."
) else (
    echo         [OK] Project core and extension verified.
)

:: --- 2. Python Detection & Auto-Install ---------------------------------
echo.
echo   [2/6] Checking Python runtime...
set "PY="
where py >nul 2>nul && set "PY=py -3"
call :validate_py && goto :py_found

set "PY=python"
call :validate_py && goto :py_found

for %%R in (
    "%LOCALAPPDATA%\Programs\Python"
    "%ProgramFiles%"
    "%ProgramFiles(x86)%"
) do (
    if exist "%%~R" (
        for /f "delims=" %%D in ('dir /b /ad /o-n "%%~R\Python3*" 2^>nul') do (
            if exist "%%~R\%%D\python.exe" (
                set PY="%%~R\%%D\python.exe"
                call :validate_py && goto :py_found
            )
        )
    )
)

call :log "Python missing. Attempting auto-installation via winget..."
echo         Python not found. Auto-installing Python 3.12 via winget...
where winget >nul 2>nul
if errorlevel 1 (
    echo   [ERROR] winget is unavailable. Please download Python from:
    echo   https://www.python.org/downloads/ (tick 'Add to PATH').
    pause
    exit /b 1
)
winget install --id Python.Python.3.12 --source winget --accept-package-agreements --accept-source-agreements
set "PY=python"
call :validate_py && goto :py_found
echo   [ERROR] Python auto-install failed. Please install manually.
pause
exit /b 1

:py_found
for /f "tokens=*" %%v in ('call %PY% --version 2^>^&1') do (
    echo         [OK] Python found: %PY% (%%v)
    call :log "Python detected: %PY% (%%v)"
)

:: --- 3. Dependency Check & Auto-Install ---------------------------------
echo.
echo   [3/6] Checking Python dependencies (websockets)...
%PY% -c "import websockets" >nul 2>nul
if errorlevel 1 (
    echo         Installing required websockets library...
    %PY% -m pip install --user websockets
    if errorlevel 1 (
        echo   [ERROR] Failed to install websockets. Check internet connection.
        pause
        exit /b 1
    )
)
echo         [OK] websockets library is ready.
call :log "websockets library ready."

:: --- 4. Process & Port Cleanup ------------------------------------------
echo.
echo   [4/6] Cleaning lingering processes and ports (17613 & 13469)...
:: Clean zombie StudioMCP
tasklist /fi "imagename eq StudioMCP.exe" 2>nul | findstr /i "StudioMCP.exe" >nul
if not errorlevel 1 (
    taskkill /F /IM StudioMCP.exe >nul 2>nul
    call :log "Cleaned lingering StudioMCP.exe"
)

:: Clean port 17613 if held by an old bridge
set "OLDPID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :17613 ^| findstr LISTENING 2^>nul') do (
    set "OLDPID=%%a"
)
if defined OLDPID (
    taskkill /F /T /PID !OLDPID! >nul 2>nul
    timeout /t 1 /nobreak >nul
    call :log "Replaced previous bridge on PID !OLDPID!"
)
echo         [OK] Ports and background processes cleaned.

:: --- 5. Roblox Studio / Bloxstrap MCP Check & Auto-Launch ---------------
echo.
echo   [5/6] Inspecting Roblox Studio & Bloxstrap MCP engine...
set "STUDIO_MCP="
set "STUDIO_EXE="

for /f "tokens=*" %%a in ('%PY% -c "import launch_studio_mcp as m; p = m.find_studio_mcp(); print(p if p else '')"') do (
    set "STUDIO_MCP=%%a"
)

if defined STUDIO_MCP (
    echo         [OK] Detected StudioMCP binary:
    echo              !STUDIO_MCP!
    call :log "Detected StudioMCP at !STUDIO_MCP!"
    
    for /f "tokens=*" %%a in ('%PY% -c "import launch_studio_mcp as m, os; p = m.find_studio_mcp(); d = os.path.dirname(p) if p else ''; s = os.path.join(d, 'RobloxStudioBeta.exe'); print(s if os.path.isfile(s) else '')"') do (
        set "STUDIO_EXE=%%a"
    )
) else (
    echo         [WARNING] StudioMCP.exe not found automatically.
    echo         Ensure Roblox Studio is installed and 'Studio as MCP server' is enabled.
    call :log "WARN: StudioMCP binary not detected."
)

:: Check if Roblox Studio is already running
set "STUDIO_RUNNING=0"
tasklist /fi "imagename eq RobloxStudioBeta.exe" 2>nul | findstr /i "RobloxStudioBeta.exe" >nul && set "STUDIO_RUNNING=1"
tasklist /fi "imagename eq RobloxStudio.exe" 2>nul | findstr /i "RobloxStudio.exe" >nul && set "STUDIO_RUNNING=1"

if "%STUDIO_RUNNING%"=="1" (
    echo         [OK] Roblox Studio is currently running!
) else (
    if defined STUDIO_EXE (
        echo         Roblox Studio is not running. Auto-launching Roblox Studio...
        start "" "!STUDIO_EXE!"
        call :log "Auto-launched Roblox Studio from !STUDIO_EXE!"
        echo         [OK] Roblox Studio launched! Please open your Place.
    ) else (
        echo         [NOTICE] Please launch Roblox Studio and open your Place.
    )
)

:: --- 6. Launch Bridge ----------------------------------------------------
echo.
echo   [6/6] Starting ZXScript Bridge...
echo.
echo  =====================================================================
echo    STATUS: Bridge is ONLINE and ready!
echo.
echo    1. Load Extension in Chrome:
echo       chrome://extensions -^> Developer Mode -^> Load unpacked:
echo       %~dp0zxscript-extension
echo.
echo    2. Open your Place in Roblox Studio:
echo       Assistant AI -^> ... -^> Manage MCP Servers -^> Enable Studio as MCP Server
echo.
echo    3. Open Web AI:
echo       https://chat.deepseek.com (Recommended) or https://chat.qwen.ai
echo       Wait for green dot 🟢 and click 'Start session'!
echo.
echo    [NOTE] DO NOT CLOSE THIS TERMINAL. Minimize it while working.
echo  =====================================================================
echo.

call :log "Launching bridge.py with %PY%"
%PY% "%~dp0bridge.py"

set "BRIDGE_EXIT=%errorlevel%"
call :log "bridge.py exited with code %BRIDGE_EXIT%"
echo.
if not "%BRIDGE_EXIT%"=="0" (
    echo   Bridge stopped with error code %BRIDGE_EXIT%.
    echo   Log file: logs\start.log
) else (
    echo   Bridge stopped normally.
)
pause
exit /b 0

:: --- Subroutines ---------------------------------------------------------
:validate_py
%PY% -m pip --version >nul 2>nul || exit /b 1
%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>nul
exit /b %errorlevel%

:log
>>"%LOGFILE%" 2>nul echo(%~1
exit /b 0
