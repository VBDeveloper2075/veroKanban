const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname.replace(/\\scripts$/, '');
const DIST = path.join(ROOT, 'dist');
let EXE = path.join(DIST, 'verokanban.exe');
const ALT_EXE = path.join(DIST, 'server.exe');
if (!fs.existsSync(EXE) && fs.existsSync(ALT_EXE)) {
  // normalize name to verokanban.exe
  fs.renameSync(ALT_EXE, EXE);
}
const DATA = path.join(DIST, 'data');

if (!fs.existsSync(EXE)) {
  console.error('Executable not found at', EXE);
  process.exit(1);
}

// Ensure data folder exists and has a README
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
const dataReadme = path.join(DATA, 'README.txt');
if (!fs.existsSync(dataReadme)) {
  fs.writeFileSync(
    dataReadme,
    'Esta carpeta almacena la base de datos SQLite (kanban.db) generada por la app. Puedes borrar esta carpeta para resetear los datos.'
  );
}

// Create portable ZIP
const ZIP = path.join(DIST, 'veroKanban-portable.zip');
if (fs.existsSync(ZIP)) fs.unlinkSync(ZIP);

try {
  // Use bestzip if available; fallback to powershell Compress-Archive
  try {
    execSync(`npx bestzip ${ZIP} verokanban.exe data`, { cwd: DIST, stdio: 'inherit' });
  } catch (e) {
    console.warn('bestzip failed, trying PowerShell Compress-Archive...');
    execSync(`powershell -NoLogo -NoProfile -Command "Compress-Archive -Path 'verokanban.exe','data' -DestinationPath 'veroKanban-portable.zip' -Force"`, {
      cwd: DIST,
      stdio: 'inherit',
    });
  }
  console.log('ZIP creado en', ZIP);
} catch (e) {
  console.error('Error creando ZIP:', e.message);
  process.exit(1);
}
