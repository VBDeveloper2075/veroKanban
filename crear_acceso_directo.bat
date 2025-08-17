@echo off
:: Este script crea accesos directos al iniciar_veroKanban.bat
:: Ejecútalo una vez al copiar la aplicación a una nueva ubicación

echo.
echo Creando accesos directos para veroKanban...
echo.

:: Cambiar al directorio donde está el script
cd /d "%~dp0"

:: Obtener la ruta absoluta actual (para el acceso directo externo)
set "APP_PATH=%~dp0"

:: Crear archivo VBScript para generar acceso directo interno (dentro de la carpeta)
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%~dp0veroKanban.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%~dp0iniciar_veroKanban.bat" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%~dp0" >> CreateShortcut.vbs
echo oLink.Description = "Iniciar veroKanban" >> CreateShortcut.vbs
echo oLink.IconLocation = "%SystemRoot%\System32\SHELL32.dll,173" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

:: Crear archivo VBScript para generar acceso directo externo (para colocarlo en cualquier lugar)
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateExternalShortcut.vbs
echo sLinkFile = "%~dp0veroKanban_externo.lnk" >> CreateExternalShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateExternalShortcut.vbs
echo oLink.TargetPath = "%APP_PATH%iniciar_veroKanban.bat" >> CreateExternalShortcut.vbs
echo oLink.WorkingDirectory = "%APP_PATH%" >> CreateExternalShortcut.vbs
echo oLink.Description = "Iniciar veroKanban (acceso directo externo)" >> CreateExternalShortcut.vbs
echo oLink.IconLocation = "%SystemRoot%\System32\SHELL32.dll,173" >> CreateExternalShortcut.vbs
echo oLink.Save >> CreateExternalShortcut.vbs

:: Ejecutar los scripts VBScript
cscript //nologo CreateShortcut.vbs
cscript //nologo CreateExternalShortcut.vbs
del CreateShortcut.vbs
del CreateExternalShortcut.vbs

echo.
echo --- Accesos directos creados correctamente ---
echo.
echo 1. "veroKanban.lnk"          - Para usar DENTRO de la carpeta
echo 2. "veroKanban_externo.lnk"  - Para copiar a CUALQUIER ubicación
echo.
echo El acceso directo "veroKanban_externo.lnk" puedes copiarlo al escritorio 
echo o cualquier otra ubicación y seguirá funcionando correctamente.
echo.
echo NOTA: Si mueves la carpeta veroKanban a otra ubicación, tendrás que
echo volver a ejecutar este script para actualizar el acceso directo externo.
echo.
pause
