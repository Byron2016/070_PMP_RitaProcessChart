/**
 * script.js - Gestión de procesos PMP
 * Movimiento preciso con guía visual (placeholder) y limpieza por columnas.
 */

const pendingColumn = document.getElementById("pending");
const shuffleBtn = document.getElementById("shuffle-btn");
const columnas = document.querySelectorAll(".columna");

const resetAllBtn = document.getElementById("reset-all-btn");

// 1. Crear el marcador visual (Placeholder)
const placeholder = document.createElement("div");
placeholder.className = "placeholder";

let pmpTasks = [];

// 2. Carga inicial de datos
async function loadPmpData() {
  try {
    // Cambia la ruta según tu archivo real (pmp_data.json o pmp_data_test.json)
    const response = await fetch("./src/data/pmp_data.json");
    //const response = await fetch("./data/pmp_data_test.json");
    const data = await response.json();
    pmpTasks = data.tasks;
    renderPendingTasks();
  } catch (error) {
    console.error("Error cargando el JSON:", error);
  }
}

// 3. Función de barajado (Fisher-Yates)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 4. Renderizar tareas y limpiar todo el tablero
function renderPendingTasks() {
  if (pmpTasks.length === 0) return;

  // Limpiar todas las columnas (Pending y las de Completed)
  // const todosLosItems = document.querySelectorAll(".item");
  // todosLosItems.forEach((item) => item.remove());

  // Limpiar elementos de columna pending
  const pendingItems = pendingColumn.querySelectorAll(".item");
  pendingItems.forEach((item) => item.remove());

  const randomizedTasks = shuffle([...pmpTasks]);
  // const randomizedTasks = [...pmpTasks];
  randomizedTasks.forEach((task) => {
    const taskDiv = document.createElement("div");
    taskDiv.className = "item";
    taskDiv.id = task.id;
    taskDiv.draggable = true;
    taskDiv.textContent = task.content;
    taskDiv.dataset.correctGroup = task.group;
    pendingColumn.appendChild(taskDiv);
  });
}

// 5. Mover elementos de una columna específica a Pending y barajarlos
function clearToPending(columnId) {
  const targetColumn = document.getElementById(columnId);
  if (!targetColumn) return;

  const itemsToMove = Array.from(targetColumn.querySelectorAll(".item"));
  if (itemsToMove.length === 0) return;

  const currentPendingItems = Array.from(
    pendingColumn.querySelectorAll(".item")
  );
  const allItemsToShuffle = [...itemsToMove, ...currentPendingItems];

  // Limpiar ambas columnas antes de re-insertar
  itemsToMove.forEach((item) => item.remove());
  currentPendingItems.forEach((item) => item.remove());

  const shuffledItems = shuffle(allItemsToShuffle);
  shuffledItems.forEach((item) => pendingColumn.appendChild(item));
  actualizarPuntuacionesTablero();
}

// 6. Cálculo de posición para inserción entre elementos
function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".item:not(.dragging):not(.placeholder)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

/**
 * Recolecta todos los items de todas las fases de COMPLETED
 * y los devuelve a PENDING barajados.
 */
function resetAllCompleted() {
  // 1. Identificamos todas las columnas que están dentro de la sección completed
  const phases = [
    "initiating",
    "planning",
    "executing",
    "monitoring",
    "closing",
  ];
  let itemsToReturn = [];

  // 2. Recolectamos los items de cada una
  phases.forEach((id) => {
    const col = document.getElementById(id);
    if (col) {
      const items = Array.from(col.querySelectorAll(".item"));
      itemsToReturn = [...itemsToReturn, ...items];
      // Limpiamos visualmente la fase
      items.forEach((item) => item.remove());
    }
  });

  if (itemsToReturn.length === 0) return;

  // 3. Obtenemos lo que ya esté en Pending
  const currentPending = Array.from(pendingColumn.querySelectorAll(".item"));
  const totalToShuffle = [...itemsToReturn, ...currentPending];

  // 4. Limpiamos Pending para el nuevo barajado
  currentPending.forEach((item) => item.remove());

  // 5. Mezclamos y reinsertamos en Pending
  const shuffled = shuffle(totalToShuffle);
  shuffled.forEach((item) => pendingColumn.appendChild(item));

  // Reseteo visual de marcadores
  const todosLosStats = document.querySelectorAll(".stats-row");
  todosLosStats.forEach((row) => {
    if (row.id === "stats-completed") {
      row.innerHTML =
        'Pendientes: <span class="stat-val">0%</span> | Aciertos totales: <span class="stat-val">0%</span>';
    } else {
      row.innerHTML =
        'Aciertos: <span class="stat-val">0%</span> | Orden: <span class="stat-val">0%</span>';
    }
  });
  actualizarPuntuacionesTablero();
}

// Asignar evento
if (resetAllBtn) {
  resetAllBtn.addEventListener("click", resetAllCompleted);
}

// =========================================================
// 7. EVENTOS DE DRAG & DROP
// =========================================================

// Inicio del arrastre (Delegación a nivel documento para mayor estabilidad)
document.addEventListener("dragstart", (e) => {
  if (e.target.classList.contains("item")) {
    e.dataTransfer.setData("text/plain", e.target.id);
    e.target.classList.add("dragging");
    e.dataTransfer.dropEffect = "move";
  }
});

// Durante el arrastre sobre las columnas
columnas.forEach((columna) => {
  columna.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    columna.classList.add("columna-hover");

    const afterElement = getDragAfterElement(columna, e.clientY);

    if (afterElement == null) {
      columna.appendChild(placeholder);
    } else {
      columna.insertBefore(placeholder, afterElement);
    }
  });

  columna.addEventListener("dragleave", () => {
    columna.classList.remove("columna-hover");
  });

  columna.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    columna.classList.remove("columna-hover");

    const id = e.dataTransfer.getData("text/plain");
    const tarjeta = document.getElementById(id);

    if (tarjeta && placeholder.parentNode) {
      // Insertar la tarjeta exactamente donde el placeholder marcó el espacio
      placeholder.parentNode.insertBefore(tarjeta, placeholder);
    }
    placeholder.remove();

    actualizarPuntuacionesTablero();
  });
});

// Function to update evaluations
function actualizarPuntuacionesTablero() {
  const fasesIds = [
    "initiating",
    "planning",
    "executing",
    "monitoring",
    "closing",
  ];
  let aciertosGlobalesTotal = 0; // Para el cálculo global

  const getClaseColor = (valor) => {
    if (valor < 50) return "stat-low";
    if (valor < 85) return "stat-medium";
    return "stat-high";
  };

  fasesIds.forEach((id) => {
    const columna = document.getElementById(id);
    const itemsEnColumna = Array.from(columna.querySelectorAll(".item"));
    const grupoCorrecto = id.toUpperCase();

    const secuenciaMaestra = pmpTasks
      .filter((t) => t.group === grupoCorrecto)
      .map((t) => t.id);

    const totalItemsEsperados = secuenciaMaestra.length;
    const correctosEnFase = itemsEnColumna.filter(
      (item) => item.dataset.correctGroup === grupoCorrecto
    ).length;

    aciertosGlobalesTotal += correctosEnFase; // Sumar al total global

    const pctAciertos =
      totalItemsEsperados > 0
        ? ((correctosEnFase / totalItemsEsperados) * 100).toFixed(1)
        : "0.0";

    // Lógica de Orden
    let puntosOrden = 0;
    itemsEnColumna.forEach((item, index) => {
      const idActual = item.id;
      const posicionEnMaestra = secuenciaMaestra.indexOf(idActual);
      if (posicionEnMaestra !== -1) {
        if (index === 0) {
          if (posicionEnMaestra === 0) puntosOrden++;
        } else {
          const idAnterior = itemsEnColumna[index - 1].id;
          const posicionAnteriorEnMaestra =
            secuenciaMaestra.indexOf(idAnterior);
          if (
            posicionAnteriorEnMaestra !== -1 &&
            posicionEnMaestra > posicionAnteriorEnMaestra
          ) {
            puntosOrden++;
          }
        }
      }
    });

    const pctOrden =
      itemsEnColumna.length > 0
        ? ((puntosOrden / itemsEnColumna.length) * 100).toFixed(1)
        : "0.0";

    const statsFase = document.getElementById(`stats-${id}`);
    if (statsFase) {
      statsFase.innerHTML = `
        Aciertos: <span class="stat-val ${getClaseColor(
          pctAciertos
        )}">${pctAciertos}%</span> | 
        Orden: <span class="stat-val ${getClaseColor(
          pctOrden
        )}">${pctOrden}%</span>
      `;
    }
  });

  // --- NUEVA LÓGICA PARA LA BARRA COMPLETED ---
  const totalTareas = pmpTasks.length;
  const tasksInPending = pendingColumn.querySelectorAll(".item").length;
  const pctPending = ((tasksInPending / totalTareas) * 100).toFixed(1);
  const pctGlobal = ((aciertosGlobalesTotal / totalTareas) * 100).toFixed(1);

  const statsGlobal = document.getElementById("stats-completed");
  if (statsGlobal) {
    statsGlobal.innerHTML = `
      Pendientes: <span class="stat-val">${pctPending}%</span> | 
      Aciertos totales: <span class="stat-val ${getClaseColor(
        pctGlobal
      )}">${pctGlobal}%</span>
    `;
  }
}

// Limpiar estados al soltar (sea donde sea)
document.addEventListener("dragend", (e) => {
  if (e.target.classList.contains("item")) {
    e.target.classList.remove("dragging");
  }
  placeholder.remove();
  columnas.forEach((col) => col.classList.remove("columna-hover"));
});

// Inicialización
shuffleBtn.addEventListener("click", renderPendingTasks);
document.addEventListener("DOMContentLoaded", loadPmpData);

// Evaluate
const evaluateBtn = document.getElementById("evaluate-btn");
const modal = document.getElementById("modal-evaluacion");
const closeModal = document.querySelector(".close-modal");
const resultadosLista = document.getElementById("resultados-lista");

// Función para abrir el modal y calcular datos
function evaluarProgreso() {
  const totalTareas = pmpTasks.length;
  const tasksInPending = pendingColumn.querySelectorAll(".item").length;
  const pctPending = ((tasksInPending / totalTareas) * 100).toFixed(1);

  const fasesIds = [
    "initiating",
    "planning",
    "executing",
    "monitoring",
    "closing",
  ];
  let aciertosGlobalesTotal = 0;
  let reporteFases = "";

  // Función auxiliar para determinar la clase CSS según el valor
  const getClaseColor = (valor) => {
    if (valor < 50) return "stat-low";
    if (valor < 85) return "stat-medium";
    return "stat-high";
  };

  fasesIds.forEach((id) => {
    const columna = document.getElementById(id);
    const itemsEnColumna = Array.from(columna.querySelectorAll(".item"));
    const grupoCorrecto = id.toUpperCase();

    const secuenciaMaestra = pmpTasks
      .filter((t) => t.group === grupoCorrecto)
      .map((t) => t.id);

    const totalItemsEsperados = secuenciaMaestra.length;
    const correctosEnFase = itemsEnColumna.filter(
      (item) => item.dataset.correctGroup === grupoCorrecto
    ).length;
    aciertosGlobalesTotal += correctosEnFase;

    const pctAciertosGrupo =
      totalItemsEsperados > 0
        ? ((correctosEnFase / totalItemsEsperados) * 100).toFixed(1)
        : "0.0";

    let puntosOrden = 0;
    itemsEnColumna.forEach((item, index) => {
      const idActual = item.id;
      const posicionEnMaestra = secuenciaMaestra.indexOf(idActual);
      if (posicionEnMaestra !== -1) {
        if (index === 0) {
          if (posicionEnMaestra === 0) puntosOrden++;
        } else {
          const idAnterior = itemsEnColumna[index - 1].id;
          const posicionAnteriorEnMaestra =
            secuenciaMaestra.indexOf(idAnterior);
          if (
            posicionAnteriorEnMaestra !== -1 &&
            posicionEnMaestra > posicionAnteriorEnMaestra
          ) {
            puntosOrden++;
          }
        }
      }
    });

    const pctOrden =
      itemsEnColumna.length > 0
        ? ((puntosOrden / itemsEnColumna.length) * 100).toFixed(1)
        : "0.0";

    // --- ACTUALIZACIÓN DINÁMICA EN EL TABLERO ---
    const statsFase = document.getElementById(`stats-${id}`);
    if (statsFase) {
      statsFase.innerHTML = `
        Aciertos: <span class="stat-val ${getClaseColor(
          pctAciertosGrupo
        )}">${pctAciertosGrupo}%</span> | 
        Orden: <span class="stat-val ${getClaseColor(
          pctOrden
        )}">${pctOrden}%</span>
      `;
    }

    reporteFases += `
    <div class="resultado-grupo">
        <div class="grupo-header"><h4>${grupoCorrecto}</h4></div>
        <div class="grupo-data-line">
            <span class="data-item">Aciertos: <strong>${pctAciertosGrupo}%</strong></span>
            <span class="data-separator">|</span>
            <span class="data-item">Orden: <strong>${pctOrden}%</strong></span>
        </div>
    </div>`;
  });

  const pctGlobal = ((aciertosGlobalesTotal / totalTareas) * 100).toFixed(1);

  // ACTUALIZACIÓN DE LA BARRA PRINCIPAL DE "COMPLETED"
  const statsGlobal = document.getElementById("stats-completed");
  if (statsGlobal) {
    statsGlobal.innerHTML = `
      Pendientes: <span class="stat-val">${pctPending}%</span> | 
      Aciertos totales: <span class="stat-val ${getClaseColor(
        pctGlobal
      )}">${pctGlobal}%</span>
    `;
  }

  resultadosLista.innerHTML = reporteFases;
  modal.style.display = "block";
}

function evaluarProgreso() {
  const totalTareas = pmpTasks.length;
  const tasksInPending = pendingColumn.querySelectorAll(".item").length;
  const pctPending = ((tasksInPending / totalTareas) * 100).toFixed(1);

  const fasesIds = [
    "initiating",
    "planning",
    "executing",
    "monitoring",
    "closing",
  ];
  let aciertosGlobalesTotal = 0;
  let reporteFases = "";

  // Función auxiliar interna para determinar el color según el porcentaje
  const getClaseColor = (valor) => {
    const num = parseFloat(valor);
    if (num < 50) return "stat-low"; // Rojo
    if (num < 85) return "stat-medium"; // Naranja
    return "stat-high"; // Verde
  };

  fasesIds.forEach((id) => {
    const columna = document.getElementById(id);
    const itemsEnColumna = Array.from(columna.querySelectorAll(".item"));
    const grupoCorrecto = id.toUpperCase();

    // 1. Obtener la secuencia correcta del JSON para esta fase
    const secuenciaMaestra = pmpTasks
      .filter((t) => t.group === grupoCorrecto)
      .map((t) => t.id);

    const totalItemsEsperados = secuenciaMaestra.length;

    // 2. Calcular Aciertos (¿Está la tarea en la columna correcta?)
    const correctosEnFase = itemsEnColumna.filter(
      (item) => item.dataset.correctGroup === grupoCorrecto
    ).length;
    aciertosGlobalesTotal += correctosEnFase;

    const pctAciertosGrupo =
      totalItemsEsperados > 0
        ? ((correctosEnFase / totalItemsEsperados) * 100).toFixed(1)
        : "0.0";

    // 3. Calcular Orden Relativo
    let puntosOrden = 0;
    itemsEnColumna.forEach((item, index) => {
      const idActual = item.id;
      const posicionEnMaestra = secuenciaMaestra.indexOf(idActual);

      if (posicionEnMaestra !== -1) {
        if (index === 0) {
          // Si es el primero de la columna, debe ser el primero de la lista maestra
          if (posicionEnMaestra === 0) puntosOrden++;
        } else {
          // Si no es el primero, el anterior en el DOM debe estar antes en la lista maestra
          const idAnterior = itemsEnColumna[index - 1].id;
          const posicionAnteriorEnMaestra =
            secuenciaMaestra.indexOf(idAnterior);
          if (
            posicionAnteriorEnMaestra !== -1 &&
            posicionEnMaestra > posicionAnteriorEnMaestra
          ) {
            puntosOrden++;
          }
        }
      }
    });

    const pctOrden =
      itemsEnColumna.length > 0
        ? ((puntosOrden / itemsEnColumna.length) * 100).toFixed(1)
        : "0.0";

    // 4. Actualizar las estadísticas visuales en el TABLERO (columnas)
    const statsFase = document.getElementById(`stats-${id}`);
    if (statsFase) {
      statsFase.innerHTML = `
        Aciertos: <span class="stat-val ${getClaseColor(
          pctAciertosGrupo
        )}">${pctAciertosGrupo}%</span> | 
        Orden: <span class="stat-val ${getClaseColor(
          pctOrden
        )}">${pctOrden}%</span>
      `;
    }

    // 5. Construir el HTML para el MODAL (detalles por fase)
    reporteFases += `
      <div class="resultado-grupo" style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
          <h4 style="margin: 0 0 5px 0; color: #172b4d;">${grupoCorrecto}</h4>
          <div class="grupo-data-line" style="font-size: 0.9rem;">
              <span>Aciertos: <strong class="${getClaseColor(
                pctAciertosGrupo
              )}">${pctAciertosGrupo}%</strong></span>
              <span style="margin: 0 10px; color: #ccc;">|</span>
              <span>Orden: <strong class="${getClaseColor(
                pctOrden
              )}">${pctOrden}%</strong></span>
          </div>
      </div>`;
  });

  // --- CÁLCULO Y RENDERIZADO DEL RESUMEN GLOBAL EN EL MODAL ---
  const pctGlobal = ((aciertosGlobalesTotal / totalTareas) * 100).toFixed(1);

  // Actualizar la barra superior de "COMPLETED" en la pantalla principal
  const statsGlobal = document.getElementById("stats-completed");
  if (statsGlobal) {
    statsGlobal.innerHTML = `
      Pendientes: <span class="stat-val">${pctPending}%</span> | 
      Aciertos totales: <span class="stat-val ${getClaseColor(
        pctGlobal
      )}">${pctGlobal}%</span>
    `;
  }

  // Crear el HTML del encabezado del modal con los totales
  const resumenGlobalHTML = `
    <div class="resultado-global-modal" style="background: #f4f5f7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: bold; color: #5e6c84; text-transform: uppercase; font-size: 0.75rem;">Resumen General</p>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 1.1rem;">
            <span>Pendientes: <strong>${pctPending}%</strong></span>
            <span>Aciertos Totales: <strong class="${getClaseColor(
              pctGlobal
            )}">${pctGlobal}%</strong></span>
        </div>
    </div>
  `;

  // Inyectar todo en el modal y mostrarlo
  resultadosLista.innerHTML = resumenGlobalHTML + reporteFases;
  modal.style.display = "block";
}

// Eventos del Modal
evaluateBtn.addEventListener("click", evaluarProgreso);
closeModal.addEventListener("click", () => (modal.style.display = "none"));
window.addEventListener("click", (e) => {
  if (e.target == modal) modal.style.display = "none";
});

// filter

const filterInput = document.getElementById("task-filter");
const clearFilterBtn = document.getElementById("clear-filter");

filterInput.addEventListener("input", function () {
  const searchTerm = filterInput.value.toLowerCase();
  // Buscamos solo los items que están dentro de la columna PENDING
  const pendingItems = pendingColumn.querySelectorAll(".item");

  // Mostrar u ocultar el botón de limpiar
  clearFilterBtn.style.display = searchTerm.length > 0 ? "block" : "none";

  pendingItems.forEach((item) => {
    const text = item.textContent.toLowerCase();
    // Si el texto de la tarea incluye lo que escribimos, la mostramos; si no, la ocultamos
    if (text.includes(searchTerm)) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
});

// Lógica para el botón de limpiar
clearFilterBtn.addEventListener("click", function () {
  filterInput.value = ""; // Limpiar texto
  this.style.display = "none"; // Ocultar el botón X

  // Mostrar todas las tareas de nuevo
  const pendingItems = pendingColumn.querySelectorAll(".item");
  pendingItems.forEach((item) => {
    item.style.display = "block";
  });

  filterInput.focus(); // Devolver el foco al input
});
