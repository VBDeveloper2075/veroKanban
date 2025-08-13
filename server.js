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
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      urgency TEXT NOT NULL CHECK (urgency IN ('high','medium','low')),
      columnId TEXT NOT NULL
  )`);
});

app.use(cors());
app.use(express.json());

// Static frontend
// Serve static files from snapshot (__dirname) which contains index.html, css, js
app.use(express.static(__dirname));

// Helpers
function mapRow(row) {
  return { id: row.id, title: row.title, urgency: row.urgency, column: row.columnId };
}

// Routes
app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(mapRow));
  });
});

app.post('/api/tasks', (req, res) => {
  const { id, title, urgency, column } = req.body || {};
  if (!title || !urgency) return res.status(400).json({ error: 'title and urgency are required' });
  const finalId = id || Date.now();
  const stmt = db.prepare('INSERT INTO tasks (id, title, urgency, columnId) VALUES (?,?,?,?)');
  stmt.run(finalId, title, urgency, column || 'backlog', function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: finalId, title, urgency, column: column || 'backlog' });
  });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, urgency, column } = req.body || {};
  db.run(
    'UPDATE tasks SET title = COALESCE(?, title), urgency = COALESCE(?, urgency), columnId = COALESCE(?, columnId) WHERE id = ?',
    [title, urgency, column, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
      res.json({ id: Number(id), title, urgency, column });
    }
  );
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM tasks WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.status(204).end();
  });
});

app.post('/api/reset', (req, res) => {
  db.run('DELETE FROM tasks', [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).end();
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
