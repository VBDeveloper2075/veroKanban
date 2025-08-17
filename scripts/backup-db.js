const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Rutas
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'kanban.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Asegurarse de que exista el directorio de respaldos
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Directorio de respaldos creado: ${BACKUP_DIR}`);
}

// Obtener la fecha actual para el nombre del archivo
const now = new Date();
const timestamp = now.toISOString()
  .replace(/T/, '_')
  .replace(/:/g, '-')
  .replace(/\..+/, '');
const backupFile = path.join(BACKUP_DIR, `kanban_backup_${timestamp}.db`);

// Verificar si existe la base de datos original
if (!fs.existsSync(DB_PATH)) {
  console.log('No existe la base de datos para respaldar.');
  process.exit(0);
}

try {
  // Copia del archivo
  fs.copyFileSync(DB_PATH, backupFile);
  console.log(`✅ Respaldo creado correctamente: ${backupFile}`);
  
  // Limpiar respaldos antiguos (mantener solo los últimos 10)
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('kanban_backup_') && file.endsWith('.db'))
    .map(file => path.join(BACKUP_DIR, file));
  
  if (backups.length > 10) {
    // Ordenar por fecha de modificación (el más antiguo primero)
    backups.sort((a, b) => fs.statSync(a).mtime.getTime() - fs.statSync(b).mtime.getTime());
    
    // Eliminar los más antiguos
    const toDelete = backups.slice(0, backups.length - 10);
    toDelete.forEach(file => {
      fs.unlinkSync(file);
      console.log(`🗑️ Respaldo antiguo eliminado: ${path.basename(file)}`);
    });
  }
  
  console.log(`✅ Se mantienen los últimos ${Math.min(10, backups.length)} respaldos.`);
} catch (error) {
  console.error(`❌ Error al crear respaldo: ${error.message}`);
  process.exit(1);
}
