:: SPDX-License-Identifier: GPL-3.0-or-later
@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title ZXScript Bridge - โดย ZXD44
set "ROOT=%~dp0..\"
cd /d "%ROOT%"

if not exist "%ROOT%logs" mkdir "%ROOT%logs" >nul 2>nul
set "LOGFILE=%ROOT%logs\start.log"
call :log "===== %DATE% %TIME%  start.bat launched ====="
for /f "tokens=*" %%v in ('ver') do call :log "%%v"

cls
echo =====================================================================
echo    ZXScript All-in-One Launcher - โดย ZXD44 (ZirconX)
echo    Roblox Studio AI Agent Bridge (รองรับทั้ง Bloxstrap และ Studio ทั่วไป)
echo =====================================================================
echo.

REM --- 1. Verify Project Files --------------------------------------------
echo   [1/6] กำลังตรวจสอบความสมบูรณ์ของไฟล์ระบบ...
if not exist "%ROOT%bridge\bridge.py" (
    echo   [ERROR] ไม่พบไฟล์ bridge\bridge.py!
    echo   กรุณาแตกไฟล์ ZIP หรือดาวน์โหลดโปรเจกต์ให้ครบถ้วนก่อนเปิดใช้งาน
    call :log "FATAL: bridge\bridge.py missing."
    pause
    exit /b 1
)
if not exist "%ROOT%zxscript-extension\manifest.json" (
    echo   [คำเตือน] ไม่พบโฟลเดอร์ zxscript-extension!
    call :log "WARN: zxscript-extension missing."
) else (
    echo         [OK] ตรวจสอบไฟล์ระบบและ Extension ถูกต้องสมบูรณ์
)

REM --- 2. Python Detection and Auto-Install ---------------------------------
echo.
echo   [2/6] กำลังตรวจสอบ Python บนเครื่องของคุณ...
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
echo         ไม่พบ Python บนเครื่อง กำลังดาวน์โหลดและติดตั้ง Python 3.12 ให้อัตโนมัติ (winget)...
where winget >nul 2>nul
if errorlevel 1 (
    echo   [ERROR] ไม่พบ winget บนเครื่อง กรุณาดาวน์โหลดและติดตั้ง Python ด้วยตนเองจาก:
    echo   https://www.python.org/downloads/ (อย่าลืมติ๊ก Add Python to PATH)
    pause
    exit /b 1
)
winget install --id Python.Python.3.12 --source winget --accept-package-agreements --accept-source-agreements
set "PY=python"
call :validate_py && goto :py_found
echo   [ERROR] ติดตั้ง Python อัตโนมัติไม่สำเร็จ กรุณาติดตั้ง Python ด้วยตนเอง
pause
exit /b 1

:py_found
for /f "tokens=*" %%v in ('call %PY% --version 2^>^&1') do (
    echo         [OK] ตรวจพบ Python: %PY% (%%v)
    call :log "Python detected: %PY% (%%v)"
)

REM --- 3. Dependency Check and Auto-Install ---------------------------------
echo.
echo   [3/6] กำลังตรวจสอบไลบรารี websockets...
%PY% -c "import websockets" >nul 2>nul
if errorlevel 1 (
    echo         กำลังติดตั้งไลบรารี websockets สำหรับการสื่อสารแบบเรียลไทม์...
    %PY% -m pip install --user websockets
    if errorlevel 1 (
        echo   [ERROR] ติดตั้ง websockets ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
        pause
        exit /b 1
    )
)
echo         [OK] ไลบรารี websockets พร้อมทำงาน
call :log "websockets library ready."

REM --- 4. Process and Port Cleanup ------------------------------------------
echo.
echo   [4/6] กำลังเคลียร์พอร์ตและโปรเซสเก่าที่อาจค้างอยู่ (พอร์ต 17613)...
tasklist /fi "imagename eq StudioMCP.exe" 2>nul | findstr /i "StudioMCP.exe" >nul
if not errorlevel 1 (
    taskkill /F /IM StudioMCP.exe >nul 2>nul
    call :log "Cleaned lingering StudioMCP.exe"
)

set "OLDPID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :17613 ^| findstr LISTENING 2^>nul') do (
    set "OLDPID=%%a"
)
if defined OLDPID (
    taskkill /F /T /PID !OLDPID! >nul 2>nul
    ping -n 2 127.0.0.1 >nul 2>nul
    call :log "Replaced previous bridge on PID !OLDPID!"
)
echo         [OK] เคลียร์พอร์ตและเบื้องหลังเรียบร้อย

REM --- 5. Roblox Studio / Bloxstrap MCP Check and Auto-Launch ---------------
echo.
echo   [5/6] กำลังตรวจสอบ Roblox Studio และระบบ StudioMCP...
set "STUDIO_MCP="
set "STUDIO_EXE="

for /f "tokens=*" %%a in ('%PY% -c "import sys; sys.path.insert(0, r'%ROOT%bridge'); import launch_studio_mcp as m; p = m.find_studio_mcp(); print(p if p else \"\")"') do (
    set "STUDIO_MCP=%%a"
)

if defined STUDIO_MCP (
    echo         [OK] ตรวจพบโมดูล StudioMCP:
    echo              !STUDIO_MCP!
    call :log "Detected StudioMCP at !STUDIO_MCP!"
    for /f "tokens=*" %%a in ('%PY% -c "import sys, os; sys.path.insert(0, r'%ROOT%bridge'); import launch_studio_mcp as m; p = m.find_studio_mcp(); d = os.path.dirname(p) if p else \"\"; s = os.path.join(d, \"RobloxStudioBeta.exe\"); print(s if os.path.isfile(s) else \"\")"') do (
        set "STUDIO_EXE=%%a"
    )
) else (
    echo         [คำเตือน] ไม่พบ StudioMCP.exe อัตโนมัติ (เปิด Studio เพื่อเชื่อมต่อ)
    call :log "WARN: StudioMCP binary not detected."
)

set "STUDIO_RUNNING=0"
tasklist /fi "imagename eq RobloxStudioBeta.exe" 2>nul | findstr /i "RobloxStudioBeta.exe" >nul && set "STUDIO_RUNNING=1"
tasklist /fi "imagename eq RobloxStudio.exe" 2>nul | findstr /i "RobloxStudio.exe" >nul && set "STUDIO_RUNNING=1"

if "!STUDIO_RUNNING!"=="1" (
    echo         [OK] Roblox Studio กำลังเปิดทำงานอยู่
) else (
    if defined STUDIO_EXE (
        echo         Roblox Studio ยังไม่เปิด กำลังเปิด Roblox Studio ให้อัตโนมัติ...
        start "" "!STUDIO_EXE!"
        call :log "Auto-launched Roblox Studio from !STUDIO_EXE!"
        echo         [OK] เปิด Studio แล้ว กรุณาเปิดแมพ [Place] ของคุณ
    ) else (
        echo         [คำแนะนำ] กรุณาเปิด Roblox Studio และเปิดแมพ [Place] ของคุณ
    )
)

REM --- 6. Launch Bridge ----------------------------------------------------
echo.
echo   [6/6] กำลังเริ่มการทำงาน ZXScript Bridge...
echo.
echo  =====================================================================
echo    สถานะ: Bridge ออนไลน์ พร้อมเชื่อมต่อแล้ว!
echo.
echo    1. ติดตั้ง Extension ลงในเบราว์เซอร์ (Chrome หรือ Edge):
echo       - ไปที่: chrome://extensions หรือ edge://extensions
echo       - เปิดสวิตช์มุมขวาบน: "โหมดนักพัฒนา" (Developer mode)
echo       - กดปุ่ม: "โหลดส่วนขยายที่คลายแพ็กไว้" (Load unpacked)
echo       - เลือกโฟลเดอร์: %ROOT%zxscript-extension
echo.
echo    2. เปิดแมพใน Roblox Studio:
echo       - กดแท็บ Assistant AI ด้านบน -^> กดปุ่ม ... (มุมขวาบน)
echo       - เลือก Manage MCP Servers -^> ติ๊กเปิด "Enable Studio as MCP Server"
echo.
echo    3. เปิดแชต AI บนเว็บ:
echo       - เข้าเว็บ https://chat.deepseek.com (แนะนำ) หรือ ChatGPT / Qwen
echo       - รอจนแถบ ZXScript ด้านล่างขึ้นจุดสีเขียว [ONLINE]
echo       - กดปุ่ม [เริ่มทำงาน] แล้วเริ่มสั่งงานสร้างแมพได้ทันที!
echo.
echo    [ข้อสำคัญ] ห้ามปิดหน้าต่างดำนี้ ให้พับย่อหน้าจอลงขณะใช้งาน
echo  =====================================================================
echo.

call :log "Registering Native Messaging and Protocol Host"
%PY% "%ROOT%bridge\register.py" >nul 2>nul

call :log "Launching bridge.py with %PY%"
%PY% "%ROOT%bridge\bridge.py"

set "BRIDGE_EXIT=%errorlevel%"
call :log "bridge.py exited with code %BRIDGE_EXIT%"
echo.
if not "%BRIDGE_EXIT%"=="0" (
    echo   Bridge หยุดทำงานด้วยรหัสข้อผิดพลาด %BRIDGE_EXIT%
    echo   ดูรายละเอียดข้อผิดพลาดที่: logs\start.log
) else (
    echo   Bridge หยุดการทำงานเรียบร้อยแล้ว
)
pause
exit /b 0

REM --- Subroutines ---------------------------------------------------------
:validate_py
%PY% -m pip --version >nul 2>nul || exit /b 1
%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>nul
exit /b %errorlevel%

:log
>>"%LOGFILE%" 2>nul echo(%~1
exit /b 0

