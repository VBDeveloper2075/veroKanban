# veroKanban

Tablero Kanban simple con frontend estático y backend Node.js (Express + SQLite) opcional.

## Requisitos
- Node.js 18+ (incluye `npm`)

## Puesta en marcha (Windows cmd)

1. Instalar dependencias:
```
npm install
```

2. Iniciar el servidor (servirá el frontend y la API):
```
npm start
```

- App: http://localhost:3000
- API: http://localhost:3000/api/tasks

La base de datos SQLite se guarda en `data/kanban.db` (ignorada por git).

## Cómo funciona el almacenamiento
- Si el backend está corriendo, el frontend usa la API (SQLite).
- Si no, cae automáticamente en `localStorage` del navegador.

## Endpoints API
- GET `/api/tasks` → lista tareas
- POST `/api/tasks` → crea tarea `{ id?, title, urgency, column? }`
- PUT `/api/tasks/:id` → actualiza `{ title?, urgency?, column? }`
- DELETE `/api/tasks/:id` → elimina
- POST `/api/reset` → borra todas las tareas

## Notas de seguridad
- No subas `data/kanban.db` ni secretos al repo. `.gitignore` ya incluye patrones para `.env`, claves y BD.

## Despliegue
- En un host Node (Render, Railway, Fly.io, VPS, etc.). Ejecuta `node server.js`.
- Para frontend-only (GitHub Pages, Netlify): funcionará solo con `localStorage` (sin API).
