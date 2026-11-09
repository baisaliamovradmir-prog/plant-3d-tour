@echo off
rem Запуск показа: цифровой двойник + 3D-тур. Окно не закрывать, пока идёт показ.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
