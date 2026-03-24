@echo off
cd /d "%~dp0"

:: Verifica se já é admin
net session >nul 2>&1
if %errorLevel% == 0 (goto :run)

:: Eleva o script inteiro (pede UAC uma vez)
powershell -Command "Start-Process '%~f0' -Verb RunAs"
exit /b

:run

set "RAIZ=%CD%"
set "BACKEND=%RAIZ%\backend"

:: Frontend - fica aberto normalmente
start "Frontend - http://localhost:5173" cmd /k "cd /d "%RAIZ%" && title Frontend && npm run dev"

:: Backend - fica aberto normalmente
start "Backend - http://127.0.0.1:5000" cmd /k "cd /d "%BACKEND%" && title Backend && call venv\Scripts\activate.bat && python app.py"

:: Mostra mensagem rápida e FECHA sozinho após 3 segundos (sem precisar teclar)
echo.
echo Servidores iniciados em duas janelas (já como admin).
timeout /t 3 >nul
exit