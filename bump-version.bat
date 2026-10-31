:: SPDX-License-Identifier: GPL-3.0-or-later
@echo off
setlocal
cd /d "%~dp0"

REM Find python executable
set "PY=python"
where py >nul 2>nul && set "PY=py -3"

%PY% "%~dp0scripts\bump_version.py" %*
if errorlevel 1 (
    exit /b %errorlevel%
)
