@echo off
set "HERE=%~dp0"
py -3 "%HERE%native_host.py" %* 2>nul || python "%HERE%native_host.py" %*
