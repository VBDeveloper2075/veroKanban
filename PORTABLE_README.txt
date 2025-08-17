# veroKanban Portable

Esta es una versión portable de veroKanban que puedes ejecutar desde un pendrive o cualquier carpeta.

## Requisitos

- **Node.js**: Debe estar instalado en la computadora (versión 14 o superior)
  - Si no lo tienes, descárgalo desde [nodejs.org](https://nodejs.org/)

## Cómo usar

1. Haz doble clic en el archivo `iniciar_veroKanban.bat`
2. Espera a que el servidor se inicie y el navegador se abra automáticamente
3. ¡Comienza a usar tu tablero Kanban!

## Características

- Tus datos se guardan automáticamente en la carpeta `data`
- Los respaldos se crean automáticamente en `data/backups`
- La aplicación funciona completamente de forma local

## Menú de opciones

El archivo `iniciar_veroKanban.bat` muestra un menú con las siguientes opciones:

- **[1]** Abrir la aplicación en el navegador
- **[2]** Reiniciar el servidor
- **[3]** Crear respaldo de la base de datos
- **[X]** Salir y cerrar el servidor

## Mover la aplicación

Para mover la aplicación a otro pendrive o carpeta:
1. Asegúrate de cerrar la aplicación primero (opción X)
2. Copia toda la carpeta a la nueva ubicación
3. Todos tus datos se preservarán en la carpeta `data`

## Solución de problemas

Si encuentras algún error:
1. Cierra la aplicación (opción X)
2. Vuelve a iniciarla con `iniciar_veroKanban.bat`

Si persisten los problemas:
- Verifica que Node.js esté correctamente instalado
- Asegúrate de que el puerto 3000 no esté siendo usado por otra aplicación
