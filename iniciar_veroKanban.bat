@echo off
title veroKanban - Tablero Kanban
color 0A
echo.
echo ======================================================
echo         veroKanban - Tablero Kanban
echo ======================================================
echo.

:: Configuraciones (puedes cambiar estas variables)
set PORT=3000

:: Cambiar al directorio donde está el script
cd /d "%~dp0"

:: Crear carpeta de datos si no existe
if not exist "data" (
    mkdir data
    echo Carpeta de datos creada...
)

:: Verificar si Node.js está instalado
echo Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo ERROR: Node.js no está instalado o no está en el PATH.
    echo Por favor instale Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Verificar si los módulos están instalados
if not exist "node_modules" (
    color 0E
    echo.
    echo AVISO: Módulos no instalados. Instalando dependencias...
    echo Este proceso puede tardar unos minutos la primera vez.
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo ERROR: No se pudieron instalar las dependencias.
        echo.
        pause
        exit /b 1
    )
    color 0A
)

echo Iniciando el servidor en el puerto %PORT%...
echo.
echo Cuando el servidor esté listo, se abrirá automáticamente el navegador.
echo Puede cerrar esta ventana para detener completamente la aplicación.
echo.

:: Definir una variable para identificar el proceso del servidor
set RANDOM_ID=%RANDOM%

:: Iniciar el servidor en segundo plano
start "veroKanban Server [%RANDOM_ID%]" /min cmd /c "set PORT=%PORT% && node server.js"

:: Esperar a que el servidor esté listo
echo Esperando a que el servidor se inicie...
timeout /t 2 /nobreak >nul

:: Intentar conectar al servidor hasta que esté disponible
:check_server
ping -n 1 localhost:%PORT% >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Esperando conexión... (Ctrl+C para cancelar)
    timeout /t 1 /nobreak >nul
    goto check_server
)

:: Abrir el navegador predeterminado
echo Abriendo navegador...
start http://localhost:%PORT%

echo.
echo ======================================================
echo  veroKanban está ejecutándose en http://localhost:%PORT%
echo ======================================================
echo.
echo [1] Abrir la aplicación en el navegador
echo [2] Reiniciar el servidor
echo [3] Crear respaldo de la base de datos
echo [X] Salir y cerrar el servidor
echo.
echo Esta ventana debe permanecer abierta mientras usa la aplicación.
echo.

:menu
set /p choice="Elija una opción [1,2,3,X]: "

if "%choice%"=="1" (
    start http://localhost:%PORT%
    goto menu
)

if "%choice%"=="2" (
    echo Reiniciando servidor...
    taskkill /fi "WINDOWTITLE eq veroKanban Server [%RANDOM_ID%]*" /f >nul 2>&1
    start "veroKanban Server [%RANDOM_ID%]" /min cmd /c "set PORT=%PORT% && node server.js"
    timeout /t 3 /nobreak >nul
    goto menu
)

if "%choice%"=="3" (
    echo Creando respaldo...
    node scripts/backup-db.js
    goto menu
)

if /i "%choice%"=="X" (
    echo Cerrando el servidor...
    taskkill /fi "WINDOWTITLE eq veroKanban Server [%RANDOM_ID%]*" /f >nul 2>&1
    echo Servidor detenido. Puede cerrar esta ventana.
    pause
    exit /b 0
)

echo Opción no válida.
goto menu
