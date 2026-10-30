:: SPDX-License-Identifier: GPL-3.0-or-later
@echo off
setlocal
chcp 65001 >nul
title ZXScript Native Host Setup
echo =====================================================================
echo    ZXScript Native Host & Protocol Auto-Setup - โดย ZXD44
echo =====================================================================
echo.
echo   กำลังลงทะเบียน Native Messaging Host สำหรับ Chrome ^& Edge...
py -3 "%~dp0..\bridge\register.py" 2>nul || python "%~dp0..\bridge\register.py"
echo.
echo   [OK] ลงทะเบียนระบบ Native Messaging และโปรโตคอล zxscript:// เรียบร้อยแล้ว!
echo   คุณสามารถสั่งเปิดและปิด Bridge จากป๊อปอัป Extension ได้โดยตรงทันที
echo.
pause
