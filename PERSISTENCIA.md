# Persistencia de Datos en veroKanban

## Estructura de persistencia

La aplicación veroKanban implementa un sistema de persistencia en dos niveles:

1. **Base de datos SQLite** (backend)
   - Almacenamiento principal cuando el servidor está en ejecución
   - Se guarda en `data/kanban.db`
   - Soporta todas las operaciones CRUD a través de API REST

2. **LocalStorage** (frontend)
   - Almacenamiento de respaldo cuando no se puede conectar al servidor
   - Funciona completamente offline
   - Se sincroniza con el servidor cuando está disponible

## Cómo funciona

- Al cargar la aplicación, el frontend verifica si el servidor está disponible:
  - Si está disponible: carga las tareas desde el servidor (SQLite)
  - Si no está disponible: carga las tareas desde LocalStorage

- Para cada operación (crear, actualizar, mover o eliminar tareas):
  - Si el servidor está disponible: se envía la operación al servidor y se actualiza LocalStorage
  - Si no está disponible: solo se actualiza LocalStorage

## Seguridad y respaldo

1. **Respaldos automáticos**:
   - Al iniciar el servidor se crea un respaldo automático en `data/backups/`
   - Se conservan los últimos 5 respaldos automáticos

2. **Respaldos manuales**:
   - Puedes crear respaldos manualmente con `npm run backup-db`
   - Los respaldos manuales se guardan en `data/backups/`
   - Se mantienen los últimos 10 respaldos manuales

3. **Verificación de base de datos**:
   - Puedes verificar la integridad de la base de datos con `npm run verify-db`

## Comandos útiles

```
# Iniciar el servidor (SQLite + LocalStorage)
npm start

# Verificar la base de datos
npm run verify-db

# Crear respaldo manual
npm run backup-db
```

## Funcionamiento de la base de datos

La base de datos SQLite almacena las tareas con la siguiente estructura:

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('high','medium','low')),
  columnId TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Modo portátil (Ejecutable .exe)

Si utilizas el ejecutable generado con `npm run build:exe`, la base de datos SQLite se guardará en la carpeta `data/` junto al ejecutable.

## Notas adicionales

- La aplicación implementa un mecanismo de detección automática del backend, por lo que funciona sin configuración adicional.
- Si deseas resetear completamente la aplicación:
  1. Detén el servidor si está en ejecución
  2. Elimina el archivo `data/kanban.db` (servidor)
  3. En el navegador, borra el LocalStorage para el dominio
  4. Reinicia el servidor
