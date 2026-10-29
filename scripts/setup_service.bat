:: SPDX-License-Identifier: GPL-3.0-or-later
@echo off
setlocal
title ZXScript Native Host Setup
echo =====================================================================
echo    ZXScript Native Host ^& Protocol Auto-Setup - by ZXD44
echo =====================================================================
echo.
echo   Registering Chrome ^& Edge Native Messaging Host...
py -3 "%~dp0..\bridge\register.py" 2>nul || python "%~dp0..\bridge\register.py"
echo.
echo   [OK] Native Messaging and zxscript:// protocol registered successfully.
echo   You can now start and stop the Bridge directly from the Chrome Extension!
echo.
pause
