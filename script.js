// --- ESTADO Y DATOS INICIALES ---
const columns = [
    { id: 'backlog', title: 'Pila de Tareas' },
    { id: 'todo', title: 'Por Hacer' },
    { id: 'inprogress', title: 'En Progreso' },
    { id: 'review', title: 'En Revisión' },
    { id: 'blocked', title: 'Bloqueado' },
    { id: 'done', title: 'Hecho' }
];

const defaultTasks = [
    { id: 1, title: 'Diseñar la nueva landing page', urgency: 'high', column: 'todo' },
    { id: 2, title: 'Desarrollar la API de autenticación', urgency: 'high', column: 'inprogress' },
    { id: 3, title: 'Revisar el feedback de los usuarios', urgency: 'medium', column: 'review' },
    { id: 4, title: 'Investigar nueva librería de gráficos', urgency: 'low', column: 'backlog' },
    { id: 5, title: 'Fix: El botón de pago no funciona en Safari', urgency: 'high', column: 'blocked' },
    { id: 6, title: 'Desplegar la versión 2.1 a producción', urgency: 'medium', column: 'done' },
];

// --- PERSISTENCIA DE DATOS (localStorage) ---
let tasks = [];

// Backend API helper with fallback
const API_BASE = '';
let apiAvailabilityCache = null;
let lastApiCheck = 0;

async function apiAvailable() {
  const now = Date.now();
  // Usar caché por 30 segundos para evitar muchas llamadas al servidor
  if (apiAvailabilityCache !== null && now - lastApiCheck < 30000) {
    return apiAvailabilityCache;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch('/api/tasks', { 
      method: 'HEAD', // HEAD es más ligero que GET
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    apiAvailabilityCache = res.ok;
    lastApiCheck = now;
    console.log('API disponible:', apiAvailabilityCache);
    return apiAvailabilityCache;
  } catch (e) {
    apiAvailabilityCache = false;
    lastApiCheck = now;
    console.log('API no disponible:', e.message);
    return false;
  }
}

async function loadTasks() {
  try {
    if (await apiAvailable()) {
      console.log('API disponible, cargando tareas desde el servidor...');
      const res = await fetch('/api/tasks');
      if (!res.ok) {
        throw new Error('Error al obtener tareas del servidor');
      }
      tasks = await res.json();
      // También guardamos en localStorage como respaldo
      saveTasks();
      console.log('Tareas cargadas desde el servidor:', tasks.length);
    } else {
      console.log('API no disponible, cargando tareas desde localStorage...');
      const savedTasks = localStorage.getItem('kanbanTasks');
      if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        console.log('Tareas cargadas desde localStorage:', tasks.length);
      } else {
        console.log('No hay tareas en localStorage, usando tareas por defecto');
        tasks = JSON.parse(JSON.stringify(defaultTasks));
        saveTasks();
      }
    }
  } catch (error) {
    console.error('Error al cargar las tareas:', error);
    tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || JSON.parse(JSON.stringify(defaultTasks));
  }
}

function saveTasks() {
  localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
}

async function persistTask(task) {
  try {
    if (await apiAvailable()) {
      const res = await fetch('/api/tasks', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(task) 
      });
      if (!res.ok) {
        throw new Error(`Error al guardar tarea: ${res.status} ${res.statusText}`);
      }
      console.log('Tarea guardada en el servidor:', task.id);
    }
    // Siempre guardamos en localStorage, incluso si el servidor está disponible
    // como respaldo en caso de que el servidor falle en el futuro
    saveTasks();
  } catch (error) {
    console.error('Error al persistir tarea:', error);
    // Aseguramos que al menos se guarda en localStorage
    saveTasks();
  }
}

async function updateTask(task) {
  try {
    if (await apiAvailable()) {
      const res = await fetch(`/api/tasks/${task.id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(task) 
      });
      if (!res.ok) {
        throw new Error(`Error al actualizar tarea: ${res.status} ${res.statusText}`);
      }
      console.log('Tarea actualizada en el servidor:', task.id);
    }
    // Siempre actualizamos localStorage
    saveTasks();
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    // Aseguramos que al menos se guarda en localStorage
    saveTasks();
  }
}

async function resetServer() {
  try {
    if (await apiAvailable()) {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Error al resetear servidor: ${res.status} ${res.statusText}`);
      }
      console.log('Servidor reseteado exitosamente');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error al resetear el servidor:', error);
    return false;
  }
}

// --- REFERENCIAS AL DOM ---
const board = document.getElementById('kanban-board');
const addTaskBtn = document.getElementById('add-task-btn');
const taskTitleInput = document.getElementById('task-title');
const taskUrgencySelect = document.getElementById('task-urgency');
const exportCsvBtn = document.getElementById('export-csv-btn');
const resetBoardBtn = document.getElementById('reset-board-btn');
const confirmModal = document.getElementById('confirm-modal');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// --- RENDERIZADO ---
function renderBoard() {
    board.innerHTML = '';
    columns.forEach(column => {
        const columnEl = document.createElement('div');
        columnEl.className = 'bg-gray-100 rounded-lg w-80 flex-shrink-0 flex flex-col';
        columnEl.innerHTML = `
            <h3 class="font-semibold text-gray-700 p-3 flex-shrink-0">${column.title}</h3>
            <div class="kanban-column-container p-3 pt-0" data-column-id="${column.id}">
                    <div class="kanban-column space-y-3"></div>
            </div>
        `;
        board.appendChild(columnEl);
        const columnContainerEl = columnEl.querySelector('.kanban-column-container');
        addDragAndDropListeners(columnContainerEl);
    });
    renderTasks();
}

function renderTasks() {
    document.querySelectorAll('.kanban-column').forEach(col => col.innerHTML = '');
    tasks.forEach(task => {
        const columnContainer = document.querySelector(`[data-column-id="${task.column}"]`);
        if (columnContainer) {
            const columnContent = columnContainer.querySelector('.kanban-column');
            const taskEl = createTaskElement(task);
            columnContent.appendChild(taskEl);
        }
    });
}

function createTaskElement(task) {
    const taskEl = document.createElement('div');
    taskEl.id = `task-${task.id}`;
    taskEl.className = 'task-card p-3 rounded-md shadow bg-white';
    taskEl.draggable = true;
    const urgencyColors = {
        high: 'border-l-4 border-red-500',
        medium: 'border-l-4 border-yellow-500',
        low: 'border-l-4 border-green-500'
    };
    const classesToAdd = urgencyColors[task.urgency].split(' ');
    taskEl.classList.add(...classesToAdd);
    taskEl.innerHTML = `<p class="text-sm font-medium text-gray-800">${task.title}</p>`;
    taskEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        taskEl.classList.add('dragging');
    });
    taskEl.addEventListener('dragend', () => {
        taskEl.classList.remove('dragging');
    });
    return taskEl;
}

// --- LÓGICA DE DRAG AND DROP ---
function addDragAndDropListeners(dropZone) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('bg-blue-100');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('bg-blue-100');
  });
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-blue-100');
    const taskId = e.dataTransfer.getData('text/plain');
    const targetColumnId = dropZone.dataset.columnId;
    const taskToMove = tasks.find(t => t.id == taskId);
    if (taskToMove && taskToMove.column !== targetColumnId) {
      taskToMove.column = targetColumnId;
      await updateTask(taskToMove);
      renderTasks();
    }
  });
}

// --- MANEJO DE EVENTOS ---
async function handleAddTask() {
  const title = taskTitleInput.value.trim();
  if (!title) {
    taskTitleInput.classList.add('border-red-500', 'ring-red-500');
    taskTitleInput.placeholder = 'El título es obligatorio';
    setTimeout(() => {
      taskTitleInput.classList.remove('border-red-500', 'ring-red-500');
      taskTitleInput.placeholder = 'Título de la tarea...';
    }, 2000);
    return;
  }
  const newTask = {
    id: Date.now(),
    title: title,
    urgency: taskUrgencySelect.value,
    column: 'backlog'
  };
  tasks.push(newTask);
  await persistTask(newTask);
  renderTasks();
  taskTitleInput.value = '';
}

function handleExportToCSV() {
    const columnTitles = columns.reduce((acc, col) => {
        acc[col.id] = col.title;
        return acc;
    }, {});
    const urgencyTitles = { high: 'Alta', medium: 'Media', low: 'Baja' };
    let csvContent = "data:text/csv;charset=utf-8,Título de la Tarea,Urgencia,Estado\n";
    tasks.forEach(task => {
        const title = `"${task.title.replace(/"/g, '""')}"`;
        const urgency = urgencyTitles[task.urgency];
        const status = columnTitles[task.column];
        csvContent += [title, urgency, status].join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kanban_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleResetBoard() {
    confirmModal.classList.remove('hidden');
    confirmModal.classList.add('flex');
}

// --- ASIGNACIÓN DE EVENTOS ---
addTaskBtn.addEventListener('click', handleAddTask);
taskTitleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddTask();
});
exportCsvBtn.addEventListener('click', handleExportToCSV);
resetBoardBtn.addEventListener('click', handleResetBoard);

modalCancelBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    confirmModal.classList.remove('flex');
});

modalConfirmBtn.addEventListener('click', async () => {
  try {
    // Primero reseteamos localStorage
    localStorage.removeItem('kanbanTasks');
    console.log('LocalStorage reseteado');
    
    // Intentamos resetear el servidor
    const serverReset = await resetServer();
    
    // Cargamos las tareas por defecto
    tasks = JSON.parse(JSON.stringify(defaultTasks));
    
    // Si el servidor está disponible, persistimos las tareas por defecto
    if (serverReset && await apiAvailable()) {
      console.log('Persistiendo tareas por defecto en el servidor...');
      for (const t of tasks) {
        await persistTask(t);
      }
    } else {
      // Si no, solo guardamos en localStorage
      console.log('Persistiendo tareas por defecto en localStorage');
      saveTasks();
    }
    
    // Renderizamos el tablero
    renderBoard();
    
    // Ocultamos el modal
    confirmModal.classList.add('hidden');
    confirmModal.classList.remove('flex');
    
    // Mostramos mensaje de éxito
    console.log('Tablero reseteado exitosamente');
  } catch (error) {
    console.error('Error al resetear tablero:', error);
    alert('Hubo un error al resetear el tablero. Por favor, intenta de nuevo.');
    
    // Ocultamos el modal
    confirmModal.classList.add('hidden');
    confirmModal.classList.remove('flex');
  }
});

// --- INICIALIZACIÓN ---
async function initState() {
  try {
    await loadTasks();
    console.log('Estado cargado correctamente');
  } catch (error) {
    console.error('Error al cargar el estado:', error);
    tasks = JSON.parse(JSON.stringify(defaultTasks));
    saveTasks();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initState();
  renderBoard();
});
