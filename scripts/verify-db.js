const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Rutas
const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'kanban.db');

// Verificar si la carpeta data existe
if (!fs.existsSync(DB_DIR)) {
  console.log('🔍 La carpeta data no existe, creándola...');
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('✅ Carpeta data creada en:', DB_DIR);
} else {
  console.log('✅ Carpeta data existe en:', DB_DIR);
}

// Verificar si la base de datos existe
if (!fs.existsSync(DB_PATH)) {
  console.log('🔍 La base de datos no existe, se creará al iniciar la aplicación');
} else {
  console.log('✅ Base de datos encontrada en:', DB_PATH);
  
  // Verificar la estructura de la base de datos
  const db = new sqlite3.Database(DB_PATH);
  
  console.log('🔍 Verificando la estructura de la base de datos...');
  
  // Verificar si existe la tabla tasks
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'", (err, row) => {
    if (err) {
      console.error('❌ Error al verificar la tabla tasks:', err.message);
    } else if (!row) {
      console.log('❌ La tabla tasks no existe');
    } else {
      console.log('✅ La tabla tasks existe');
      
      // Verificar la estructura de la tabla tasks
      db.all("PRAGMA table_info(tasks)", (err, rows) => {
        if (err) {
          console.error('❌ Error al verificar la estructura de la tabla tasks:', err.message);
        } else {
          console.log('✅ Estructura de la tabla tasks:');
          rows.forEach(column => {
            console.log(`   - ${column.name} (${column.type}${column.pk ? ', PRIMARY KEY' : ''})`);
          });
          
          // Verificar si hay datos en la tabla tasks
          db.get("SELECT COUNT(*) as count FROM tasks", (err, row) => {
            if (err) {
              console.error('❌ Error al contar registros en la tabla tasks:', err.message);
            } else {
              console.log(`✅ La tabla tasks tiene ${row.count} registro(s)`);
            }
            
            // Cerrar la conexión a la base de datos
            db.close(() => {
              console.log('✅ Verificación completada');
            });
          });
        }
      });
    }
  });
}

// Sugerencias adicionales
console.log('\n🔹 Consejos para la persistencia de datos:');
console.log('1️⃣ Para usar SQLite: ejecuta "npm start" para iniciar el servidor');
console.log('2️⃣ Sin servidor: la aplicación usará localStorage automáticamente');
console.log('3️⃣ Si usas el archivo .exe: la base de datos se guarda junto al ejecutable en /data');
