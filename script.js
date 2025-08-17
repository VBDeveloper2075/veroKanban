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
    
    // Contenido principal de la tarjeta
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    taskContent.innerHTML = `<p class="text-sm font-medium text-gray-800">${task.title}</p>`;
    taskEl.appendChild(taskContent);
    
    // Botones de acción (editar y eliminar)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';
    
    // Botón de editar (lapicito)
    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn edit-btn';
    editBtn.title = 'Editar tarea';
    editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editTask(task, taskContent);
    });
    
    // Botón de eliminar (tachito)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-action-btn delete-btn';
    deleteBtn.title = 'Eliminar tarea';
    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });
    
    // Agregar botones al div de acciones
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    
    // Agregar div de acciones a la tarjeta
    taskEl.appendChild(actionsDiv);
    
    // Eventos para arrastrar
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

// Función para editar una tarea
function editTask(task, taskContentEl) {
  // Guardar el título original por si se cancela la edición
  const originalTitle = task.title;
  
  // Crear el formulario de edición
  const editForm = document.createElement('div');
  editForm.className = 'task-edit-form';
  editForm.innerHTML = `
    <input type="text" value="${task.title}" class="edit-task-input" />
    <div class="flex justify-end gap-2 mt-2">
      <button class="bg-gray-200 text-gray-800 px-2 py-1 rounded cancel-edit">Cancelar</button>
      <button class="bg-blue-500 text-white px-2 py-1 rounded save-edit">Guardar</button>
    </div>
  `;
  
  // Reemplazar el contenido con el formulario
  taskContentEl.innerHTML = '';
  taskContentEl.appendChild(editForm);
  
  // Enfocar el input
  const input = editForm.querySelector('input');
  input.focus();
  input.select();
  
  // Prevenir el arrastrar mientras se edita
  const taskEl = taskContentEl.closest('.task-card');
  taskEl.draggable = false;
  
  // Manejar el guardar
  const saveBtn = editForm.querySelector('.save-edit');
  saveBtn.addEventListener('click', async () => {
    const newTitle = input.value.trim();
    if (newTitle) {
      task.title = newTitle;
      await updateTask(task);
      finishEditing();
    }
  });
  
  // Manejar el cancelar
  const cancelBtn = editForm.querySelector('.cancel-edit');
  cancelBtn.addEventListener('click', () => {
    task.title = originalTitle; // Restaurar título original
    finishEditing();
  });
  
  // Manejar tecla Enter y Escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    } else if (e.key === 'Escape') {
      cancelBtn.click();
    }
  });
  
  // Función para terminar la edición
  function finishEditing() {
    taskContentEl.innerHTML = `<p class="text-sm font-medium text-gray-800">${task.title}</p>`;
    taskEl.draggable = true;
  }
}

// Función para eliminar una tarea
async function deleteTask(taskId) {
  // Pedir confirmación
  if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
    // Buscar la tarea
    const taskIndex = tasks.findIndex(t => t.id == taskId);
    
    if (taskIndex !== -1) {
      const task = tasks[taskIndex];
      
      // Eliminar del arreglo local
      tasks.splice(taskIndex, 1);
      
      // Eliminar de la base de datos
      if (await apiAvailable()) {
        try {
          const res = await fetch(`/api/tasks/${taskId}`, { 
            method: 'DELETE' 
          });
          
          if (!res.ok) {
            console.error('Error al eliminar tarea del servidor:', res.statusText);
          } else {
            console.log('Tarea eliminada del servidor:', taskId);
          }
        } catch (error) {
          console.error('Error al eliminar tarea:', error);
        }
      }
      
      // Actualizar localStorage
      saveTasks();
      
      // Re-renderizar las tareas
      renderTasks();
    }
  }
}

function handleExportToWord() {
    const columnTitles = columns.reduce((acc, col) => {
        acc[col.id] = col.title;
        return acc;
    }, {});
    const urgencyTitles = { high: 'Alta', medium: 'Media', low: 'Baja' };
    const urgencyColors = { high: '#ffcccc', medium: '#ffffcc', low: '#ccffcc' };
    
    // Fecha actual para el encabezado
    const now = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const currentDate = now.toLocaleDateString('es-ES', dateOptions);
    
    // Crear el contenido HTML compatible con Word
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Tablero Kanban - Exportación</title>
        <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #2a4b8d; text-align: center; }
            .date { text-align: center; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #2a4b8d; color: white; padding: 8px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .high { background-color: #ffcccc; }
            .medium { background-color: #ffffcc; }
            .low { background-color: #ccffcc; }
            .summary { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
    </head>
    <body>
        <h1>Tablero Kanban - Tareas</h1>
        <div class="date">${currentDate}</div>
        
        <table>
            <tr>
                <th style="width: 50%">Título de la Tarea</th>
                <th style="width: 20%">Urgencia</th>
                <th style="width: 30%">Estado</th>
            </tr>`;
            
    // Agregar filas para cada tarea
    tasks.forEach(task => {
        const title = task.title;
        const urgency = urgencyTitles[task.urgency];
        const status = columnTitles[task.column];
        const urgencyClass = task.urgency;
        
        htmlContent += `
            <tr class="${urgencyClass}">
                <td>${title}</td>
                <td>${urgency}</td>
                <td>${status}</td>
            </tr>`;
    });
    
    // Agregar resumen de tareas por estado
    const tasksByState = columns.map(col => {
        return {
            name: col.title,
            count: tasks.filter(t => t.column === col.id).length
        };
    });
    
    htmlContent += `
        </table>
        
        <div class="summary">
            <h3>Resumen de tareas por estado:</h3>
            <ul>`;
            
    tasksByState.forEach(state => {
        htmlContent += `<li><strong>${state.name}:</strong> ${state.count} tareas</li>`;
    });
            
    htmlContent += `
            </ul>
            <p><strong>Total de tareas:</strong> ${tasks.length}</p>
        </div>
    </body>
    </html>`;
    
    // Crear un blob con el contenido HTML
    const blob = new Blob([htmlContent], {type: 'application/msword'});
    
    // Crear un URL para el blob
    const url = URL.createObjectURL(blob);
    
    // Crear un enlace para descargar el archivo
    const link = document.createElement("a");
    link.href = url;
    link.download = "kanban_tablero.doc"; // Extensión .doc para compatibilidad con Word
    document.body.appendChild(link);
    link.click();
    
    // Limpiar el URL creado
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
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
exportCsvBtn.addEventListener('click', handleExportToWord);
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
    
    // Establecer un array vacío para las tareas (eliminar todas las tarjetas)
    tasks = [];
    
    // Si el servidor está disponible, nos aseguramos de que esté vacío
    if (await apiAvailable()) {
      console.log('El servidor ha sido reseteado correctamente');
      // No necesitamos hacer nada más, el servidor ya está vacío
    } else {
      // Si no hay servidor disponible, guardamos el array vacío en localStorage
      console.log('Guardando tablero vacío en localStorage');
      saveTasks();
    }
    
    // Renderizamos el tablero vacío
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
