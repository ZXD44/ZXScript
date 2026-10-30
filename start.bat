:: SPDX-License-Identifier: GPL-3.0-or-later
@echo off
setlocal
cd /d "%~dp0"
if exist "scripts\start.bat" (
    call "scripts\start.bat" %*
) else (
    echo [ERROR] ไม่พบไฟล์ scripts\start.bat กรุณาตรวจสอบโฟลเดอร์โปรเจกต์
    pause
)
