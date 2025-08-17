const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
// When packaged with pkg, __dirname is read-only (snapshot). Choose a writable base for DB.
const WRITABLE_BASE = process.pkg
  ? path.join(process.cwd(), 'data')
  : path.join(__dirname, 'data');
const DB_DIR = WRITABLE_BASE;
const DB_PATH = path.join(DB_DIR, 'kanban.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// DB init
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
  } else {
    console.log(`Base de datos SQLite conectada en: ${DB_PATH}`);
  }
});

// Configure database
db.serialize(() => {
  // Habilitar foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Habilitar escritura segura
  db.run('PRAGMA journal_mode = WAL');

  // Crear tabla si no existe
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      urgency TEXT NOT NULL CHECK (urgency IN ('high','medium','low')),
      columnId TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error al crear tabla tasks:', err.message);
    } else {
      console.log('Tabla tasks verificada/creada correctamente');
    }
  });
  
  // Crear índices para mejorar rendimiento
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(columnId)');
});

app.use(cors());
app.use(express.json());

// Static frontend
// Serve static files from snapshot (__dirname) which contains index.html, css, js
app.use(express.static(__dirname));

// Helpers
function mapRow(row) {
  return { 
    id: row.id, 
    title: row.title, 
    urgency: row.urgency, 
    column: row.columnId,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Middleware para el manejo de errores
function handleDbError(err, res, message = 'Error de base de datos') {
  console.error(`${message}:`, err);
  res.status(500).json({ error: `${message}: ${err.message}` });
}

// Routes
app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY id DESC', (err, rows) => {
    if (err) return handleDbError(err, res, 'Error al obtener tareas');
    res.json(rows.map(mapRow));
  });
});

app.post('/api/tasks', (req, res) => {
  const { id, title, urgency, column } = req.body || {};
  
  // Validación
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  
  if (!urgency || !['high', 'medium', 'low'].includes(urgency)) {
    return res.status(400).json({ error: 'Urgencia inválida. Debe ser: high, medium o low' });
  }
  
  const finalId = id || Date.now();
  const finalColumn = column || 'backlog';
  const timestamp = new Date().toISOString();
  
  const stmt = db.prepare(
    'INSERT INTO tasks (id, title, urgency, columnId, created_at, updated_at) VALUES (?,?,?,?,?,?)'
  );
  
  stmt.run(finalId, title.trim(), urgency, finalColumn, timestamp, timestamp, function (err) {
    if (err) return handleDbError(err, res, 'Error al crear tarea');
    
    res.status(201).json({ 
      id: finalId, 
      title: title.trim(), 
      urgency, 
      column: finalColumn,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    
    console.log(`Tarea creada: ID=${finalId}, Título=${title.trim()}`);
  });
  
  stmt.finalize();
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, urgency, column } = req.body || {};
  
  // Validar que exista al menos un campo para actualizar
  if (!title && !urgency && !column) {
    return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar' });
  }
  
  // Validar urgencia si se proporciona
  if (urgency && !['high', 'medium', 'low'].includes(urgency)) {
    return res.status(400).json({ error: 'Urgencia inválida. Debe ser: high, medium o low' });
  }
  
  const timestamp = new Date().toISOString();
  
  db.run(
    `UPDATE tasks SET 
      title = COALESCE(?, title), 
      urgency = COALESCE(?, urgency), 
      columnId = COALESCE(?, columnId),
      updated_at = ?
     WHERE id = ?`,
    [title?.trim(), urgency, column, timestamp, id],
    function (err) {
      if (err) return handleDbError(err, res, 'Error al actualizar tarea');
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
      }
      
      // Obtener la tarea actualizada
      db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
        if (err) return handleDbError(err, res, 'Error al obtener tarea actualizada');
        
        if (!row) {
          return res.status(404).json({ error: 'Tarea no encontrada después de actualizar' });
        }
        
        res.json(mapRow(row));
        console.log(`Tarea actualizada: ID=${id}`);
      });
    }
  );
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM tasks WHERE id = ?', [id], function (err) {
    if (err) return handleDbError(err, res, 'Error al eliminar tarea');
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    res.status(204).end();
    console.log(`Tarea eliminada: ID=${id}`);
  });
});

app.post('/api/reset', (req, res) => {
  db.run('DELETE FROM tasks', [], function (err) {
    if (err) return handleDbError(err, res, 'Error al reiniciar tablero');
    
    console.log(`Tablero reiniciado. Eliminadas ${this.changes} tareas.`);
    res.status(204).end();
  });
});

// Ruta de estado/diagnóstico
app.get('/api/status', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM tasks', (err, row) => {
    if (err) return handleDbError(err, res, 'Error al obtener estado');
    
    res.json({
      status: 'ok',
      database: 'connected',
      tasks: row?.count || 0,
      timestamp: new Date().toISOString()
    });
  });
});

// Función para hacer respaldo automático al iniciar
function backupDatabase() {
  try {
    // Sólo hacemos backup si existe el archivo DB
    if (fs.existsSync(DB_PATH)) {
      const BACKUP_DIR = path.join(DB_DIR, 'backups');
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }
      
      // Crear nombre con timestamp
      const now = new Date();
      const timestamp = now.toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '-')
        .replace(/\..+/, '');
      const backupFile = path.join(BACKUP_DIR, `kanban_backup_${timestamp}.db`);
      
      // Copiar BD
      fs.copyFileSync(DB_PATH, backupFile);
      console.log(`✅ Respaldo automático creado: ${backupFile}`);
      
      // Limpiar respaldos antiguos (mantener solo los últimos 5 autogenerados)
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('kanban_backup_') && file.endsWith('.db'))
        .map(file => path.join(BACKUP_DIR, file));
      
      if (backups.length > 5) {
        // Ordenar por fecha de modificación (el más antiguo primero)
        backups.sort((a, b) => fs.statSync(a).mtime.getTime() - fs.statSync(b).mtime.getTime());
        
        // Eliminar los más antiguos
        const toDelete = backups.slice(0, backups.length - 5);
        toDelete.forEach(file => {
          fs.unlinkSync(file);
          console.log(`🗑️ Respaldo antiguo eliminado: ${path.basename(file)}`);
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error al crear respaldo automático: ${error.message}`);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Realizar respaldo automático al iniciar
  backupDatabase();
});
