@echo off
echo ========================================
echo    FINANCAS PESSOAIS - SERVIDOR LOCAL
echo ========================================
echo.
echo Iniciando servidor na porta 8000...
echo.
echo Acesse: http://localhost:8000/Financas_Pessoais.html
echo.
echo Para parar o servidor, pressione Ctrl+C
echo ========================================
echo.

cd /d "%~dp0"
python -m http.server 8000

pause