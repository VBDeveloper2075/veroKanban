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
async function apiAvailable() {
  try {
    const res = await fetch('/api/tasks', { method: 'GET' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function loadTasks() {
  if (await apiAvailable()) {
    const res = await fetch('/api/tasks');
    tasks = await res.json();
    saveTasks();
  } else {
    tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || JSON.parse(JSON.stringify(defaultTasks));
  }
}

function saveTasks() {
  localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
}

async function persistTask(task) {
  if (await apiAvailable()) {
    await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
  } else {
    saveTasks();
  }
}

async function updateTask(task) {
  if (await apiAvailable()) {
    await fetch(`/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
  } else {
    saveTasks();
  }
}

async function resetServer() {
  if (await apiAvailable()) {
    await fetch('/api/reset', { method: 'POST' });
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
  localStorage.removeItem('kanbanTasks');
  await resetServer();
  tasks = JSON.parse(JSON.stringify(defaultTasks));
  // persist defaults if server available
  if (await apiAvailable()) {
    for (const t of tasks) {
      await persistTask(t);
    }
  } else {
    saveTasks();
  }
  renderBoard();
  confirmModal.classList.add('hidden');
  confirmModal.classList.remove('flex');
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
  await initState();
  renderBoard();
});
