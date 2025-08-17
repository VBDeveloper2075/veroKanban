@echo off
:: Este script crea un acceso directo al iniciar_veroKanban.bat
:: Ejecútalo una vez al copiar la aplicación a una nueva ubicación

echo Creando acceso directo...

:: Cambiar al directorio donde está el script
cd /d "%~dp0"

:: Crear archivo VBScript para generar acceso directo
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%~dp0veroKanban.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%~dp0iniciar_veroKanban.bat" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%~dp0" >> CreateShortcut.vbs
echo oLink.Description = "Iniciar veroKanban" >> CreateShortcut.vbs
echo oLink.IconLocation = "%SystemRoot%\System32\SHELL32.dll,173" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

:: Ejecutar el script VBScript
cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo.
echo Acceso directo "veroKanban.lnk" creado correctamente.
echo Puedes hacer doble clic en él para iniciar la aplicación.
echo.
pause
