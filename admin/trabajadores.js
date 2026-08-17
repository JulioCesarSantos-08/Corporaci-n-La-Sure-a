import {
    collection,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let db = null;
let workers = [];
let filteredWorkers = [];

let searchInput = null;
let statusFilter = null;
let refreshButton = null;
let workersList = null;
let workersCount = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "Sin fecha";
    }

    return timestamp.toDate().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function getRoleName(role) {
    if (role === "administrador") return "Administrador";
    if (role === "gerente") return "Gerente";
    return "Trabajador";
}

function getRoleIcon(role) {
    if (role === "administrador") return "👑";
    if (role === "gerente") return "👔";
    return "👷";
}

function getRoleClass(role) {
    if (role === "administrador") return "admin";
    if (role === "gerente") return "manager";
    return "worker";
}

function applyFilters() {
    const search = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;

    filteredWorkers = workers.filter(worker => {
        const name = String(worker.nombre || "").toLowerCase();
        const email = String(worker.correo || "").toLowerCase();
        const role = String(worker.rol || "trabajador").toLowerCase();
        const workerStatus = worker.estado || "activo";

        const matchesSearch =
            !search ||
            name.includes(search) ||
            email.includes(search) ||
            role.includes(search);

        const matchesStatus =
            !status ||
            workerStatus === status;

        return matchesSearch && matchesStatus;
    });

    renderWorkers();
}

function renderWorkers() {
    workersCount.textContent = filteredWorkers.length;

    if (!filteredWorkers.length) {
        workersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>No hay usuarios</h3>
                <p>No encontramos usuarios con los filtros seleccionados.</p>
            </div>
        `;

        return;
    }

    workersList.innerHTML = filteredWorkers
        .map(worker => renderWorkerCard(worker))
        .join("");

    workersList
        .querySelectorAll("[data-worker-action]")
        .forEach(button => {
            button.addEventListener("click", async () => {
                const action = button.dataset.workerAction;
                const id = button.dataset.workerId;

                const worker = workers.find(item => item.id === id);

                if (!worker) return;

                if (action === "toggle") {
                    await toggleWorker(worker);
                }
            });
        });

    workersList
        .querySelectorAll("[data-role-change]")
        .forEach(select => {
            select.addEventListener("change", async () => {
                const id = select.dataset.roleChange;
                const newRole = select.value;

                const worker = workers.find(item => item.id === id);

                if (!worker) return;

                await changeWorkerRole(worker, newRole);
            });
        });
}

function renderWorkerCard(worker) {
    const active = worker.estado !== "suspendido";
    const statusClass = active ? "active" : "inactive";
    const statusText = active ? "Activo" : "Suspendido";

    const actionText = active
        ? "⏸️ Suspender"
        : "▶️ Reactivar";

    const currentRole = worker.rol || "trabajador";

    return `
        <article class="worker-card">

            <div class="worker-card-header">

                <div class="worker-avatar">
                    ${getRoleIcon(currentRole)}
                </div>

                <div class="worker-main">

                    <h3>
                        ${escapeHtml(worker.nombre || "Sin nombre")}
                    </h3>

                    <span>
                        ${escapeHtml(worker.correo || "Sin correo")}
                    </span>

                </div>

                <span class="worker-status ${statusClass}">
                    ${statusText}
                </span>

            </div>

            <div class="worker-info">

                <div class="worker-info-item">

                    <span>
                        Rol
                    </span>

                    <select
                        class="worker-role-select ${getRoleClass(currentRole)}"
                        data-role-change="${worker.id}"
                        ${!active ? "disabled" : ""}
                    >

                        <option
                            value="trabajador"
                            ${currentRole === "trabajador" ? "selected" : ""}
                        >
                            👷 Trabajador
                        </option>

                        <option
                            value="gerente"
                            ${currentRole === "gerente" ? "selected" : ""}
                        >
                            👔 Gerente
                        </option>

                        <option
                            value="administrador"
                            ${currentRole === "administrador" ? "selected" : ""}
                        >
                            👑 Administrador
                        </option>

                    </select>

                </div>

                <div class="worker-info-item">

                    <span>
                        Registro
                    </span>

                    <strong>
                        ${formatDate(worker.fechaCreacion)}
                    </strong>

                </div>

            </div>

            <div class="worker-role-description">
                ${getRoleIcon(currentRole)}
                ${getRoleName(currentRole)}
            </div>

            <div class="worker-actions">

                <button
                    type="button"
                    class="worker-action-button ${active ? "suspend" : "activate"}"
                    data-worker-action="toggle"
                    data-worker-id="${worker.id}"
                >
                    ${actionText}
                </button>

            </div>

        </article>
    `;
}

async function changeWorkerRole(worker, newRole) {
    const oldRole = worker.rol || "trabajador";

    if (newRole === oldRole) {
        return;
    }

    const oldRoleName = getRoleName(oldRole);
    const newRoleName = getRoleName(newRole);

    let message = `
¿Deseas cambiar el rol de:

${worker.nombre || worker.correo}

De: ${getRoleIcon(oldRole)} ${oldRoleName}
A: ${getRoleIcon(newRole)} ${newRoleName}
`;

    if (newRole === "administrador") {
        message += `

⚠️ IMPORTANTE

El rol Administrador tendrá acceso completo al sistema.

Podrá administrar usuarios, roles, sucursales, asistencias y reportes.

¿Deseas continuar?`;
    }

    const confirmed = confirm(message);

    if (!confirmed) {
        applyFilters();
        return;
    }

    try {
        await updateDoc(
            doc(db, "users", worker.id),
            {
                rol: newRole,
                fechaActualizacion: serverTimestamp()
            }
        );

        worker.rol = newRole;

        window.AdminApp.notify(
            `Rol cambiado a ${newRoleName}.`,
            "success"
        );

        applyFilters();

    } catch (error) {
        console.error("Error cambiando rol:", error);

        window.AdminApp.notify(
            "No fue posible cambiar el rol.",
            "error"
        );

        applyFilters();
    }
}

async function toggleWorker(worker) {
    const currentlyActive = worker.estado !== "suspendido";

    const newStatus = currentlyActive
        ? "suspendido"
        : "activo";

    const actionText = currentlyActive
        ? "suspender"
        : "reactivar";

    const confirmed = confirm(
        `¿Deseas ${actionText} a ${worker.nombre || worker.correo}?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await updateDoc(
            doc(db, "users", worker.id),
            {
                estado: newStatus,
                fechaActualizacion: serverTimestamp()
            }
        );

        worker.estado = newStatus;

        window.AdminApp.notify(
            currentlyActive
                ? "Usuario suspendido."
                : "Usuario reactivado.",
            "success"
        );

        applyFilters();

    } catch (error) {
        console.error("Error actualizando usuario:", error);

        window.AdminApp.notify(
            "No fue posible actualizar el usuario.",
            "error"
        );
    }
}

async function loadWorkers() {
    workersList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <h3>Cargando usuarios...</h3>
            <p>Estamos consultando la información.</p>
        </div>
    `;

    try {
        const snapshot = await getDocs(
            collection(db, "users")
        );

        workers = snapshot.docs
            .map(item => ({
                id: item.id,
                ...item.data()
            }))
            .filter(user => {
                const role = user.rol || "trabajador";

                return (
                    role === "trabajador" ||
                    role === "gerente" ||
                    role === "administrador"
                );
            });

        workers.sort((a, b) => {
            const dateA = a.fechaCreacion?.toDate
                ? a.fechaCreacion.toDate()
                : new Date(0);

            const dateB = b.fechaCreacion?.toDate
                ? b.fechaCreacion.toDate()
                : new Date(0);

            return dateB - dateA;
        });

        applyFilters();

        const dashboardCount =
            document.getElementById("workersCount");

        if (dashboardCount) {
            dashboardCount.textContent =
                workers.filter(
                    worker =>
                        worker.estado !== "suspendido"
                ).length;
        }

    } catch (error) {
        console.error(
            "Error cargando usuarios:",
            error
        );

        workersList.innerHTML = `
            <div class="empty-state error-state">
                <div class="empty-icon">⚠️</div>
                <h3>No fue posible cargar los usuarios</h3>
                <p>Revisa la conexión con Firebase.</p>
            </div>
        `;

        window.AdminApp.notify(
            "No fue posible cargar los usuarios.",
            "error"
        );
    }
}

function createWorkersInterface() {
    const module =
        document.getElementById("workersModule");

    if (!module) return;

    module.innerHTML = `
        <div class="workers-toolbar">

            <div class="workers-search">

                <span>🔎</span>

                <input
                    id="workerSearch"
                    type="search"
                    placeholder="Buscar por nombre, correo o rol..."
                    autocomplete="off"
                >

            </div>

            <div class="workers-filters">

                <label
                    class="filter-field"
                    for="workerStatusFilter"
                >

                    <span>
                        Estado
                    </span>

                    <select id="workerStatusFilter">

                        <option value="">
                            Todos
                        </option>

                        <option value="activo">
                            Activos
                        </option>

                        <option value="suspendido">
                            Suspendidos
                        </option>

                    </select>

                </label>

                <button
                    id="refreshWorkers"
                    type="button"
                    class="primary-action"
                >
                    ↻ Actualizar
                </button>

            </div>

        </div>

        <div class="workers-list-header">

            <div>

                <span class="section-eyebrow">
                    Personal registrado
                </span>

                <h3>
                    Trabajadores, gerentes y administradores
                </h3>

            </div>

            <span
                id="workersListCount"
                class="list-count"
            >
                0
            </span>

        </div>

        <div
            id="workersList"
            class="workers-list"
        ></div>

        <div class="workers-note">

            🔐 Las cuentas de acceso se administran
            directamente desde Firebase Authentication.

        </div>
    `;

    searchInput =
        document.getElementById("workerSearch");

    statusFilter =
        document.getElementById("workerStatusFilter");

    refreshButton =
        document.getElementById("refreshWorkers");

    workersList =
        document.getElementById("workersList");

    workersCount =
        document.getElementById("workersListCount");
}

function setupEvents() {
    searchInput.addEventListener(
        "input",
        applyFilters
    );

    statusFilter.addEventListener(
        "change",
        applyFilters
    );

    refreshButton.addEventListener(
        "click",
        async () => {

            refreshButton.disabled = true;
            refreshButton.textContent = "Cargando...";

            await loadWorkers();

            refreshButton.disabled = false;
            refreshButton.textContent = "↻ Actualizar";
        }
    );
}

export async function init() {
    db = window.AdminFirebase?.db;

    if (!db) {
        console.error(
            "Firestore no está disponible para trabajadores."
        );

        return;
    }

    createWorkersInterface();

    setupEvents();

    await loadWorkers();
}

window.AdminTrabajadores = {
    reload() {
        return loadWorkers();
    },

    getAll() {
        return workers;
    }
};