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

## Empaquetar en un único .exe (Windows)

Requisitos: `npm` instalado. El proyecto ya incluye configuración para [pkg].

1. Instalar dependencias (incluye devDependencies):
```
npm install
```

2. Construir el ejecutable:
```
npm run build:exe
```
Esto generará `dist/verokanban.exe` con todo incluido (Node + dependencias + frontend).

3. Ejecutar el .exe:
```
dist\verokanban.exe
```
Opcional: cambiar el puerto
```
set PORT=4000 && dist\verokanban.exe
```

Notas:
- Cuando está empaquetado, los archivos estáticos se sirven desde el propio ejecutable y la BD se guarda en una carpeta `data` junto al `.exe` (ruta de trabajo actual).
- `data/` ya está en `.gitignore`.
- El `.exe` puede activar el firewall la primera vez; permítelo para acceso local.
