@echo off
rem Sobe o servico de SMS com o supervisor: religa sozinho se cair e refaz as portas dos celulares.
rem Deixe esta janela aberta. Para parar: Ctrl+C.
title Servico de SMS - nao feche esta janela
cd /d "%~dp0"
echo.
echo  Servico de SMS em http://localhost:3333/
echo  Log do supervisor: %~dp0data\supervisor.log
echo  Para parar: Ctrl+C
echo.
node src\supervisor.mjs
pause
