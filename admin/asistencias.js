import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let db = null;
let allAttendances = [];
let filteredAttendances = [];

let searchInput = null;
let dateInput = null;
let branchSelect = null;
let clearButton = null;
let refreshButton = null;
let listContainer = null;
let countElement = null;

function getElement(id) {
    return document.getElementById(id);
}

function formatDate(timestamp) {
    if (
        !timestamp ||
        typeof timestamp.toDate !== "function"
    ) {
        return {
            date: "Sin fecha",
            time: "Sin hora",
            full: "Sin fecha"
        };
    }

    const date =
        timestamp.toDate();

    return {
        date: date.toLocaleDateString(
            "es-MX",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ),
        time: date.toLocaleTimeString(
            "es-MX",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        ),
        full: date
            .toLocaleString(
                "es-MX",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
    };
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getMapsUrl(attendance) {
    const latitude =
        Number(attendance.latitud);

    const longitude =
        Number(attendance.longitud);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        return "#";
    }

    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function getAttendanceDate(attendance) {
    if (
        attendance.fechaHora &&
        typeof attendance.fechaHora.toDate === "function"
    ) {
        return attendance.fechaHora.toDate();
    }

    return null;
}

function sortAttendances() {
    allAttendances.sort(
        (a, b) => {

            const dateA =
                getAttendanceDate(a);

            const dateB =
                getAttendanceDate(b);

            if (!dateA && !dateB) {
                return 0;
            }

            if (!dateA) {
                return 1;
            }

            if (!dateB) {
                return -1;
            }

            return dateB - dateA;
        }
    );
}

function buildFilters() {
    const branches =
        new Set();

    allAttendances.forEach(
        attendance => {

            if (
                attendance.sucursalNombre
            ) {

                branches.add(
                    attendance.sucursalNombre
                );

            }

        }
    );

    const sortedBranches =
        [...branches].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "es"
                )
        );

    branchSelect.innerHTML = `
        <option value="">
            Todas las sucursales
        </option>
    `;

    sortedBranches.forEach(
        branch => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                branch;

            option.textContent =
                branch;

            branchSelect.appendChild(
                option
            );

        }
    );
}

function applyFilters() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedDate =
        dateInput.value;

    const selectedBranch =
        branchSelect.value;


    filteredAttendances =
        allAttendances.filter(
            attendance => {

                const name =
                    String(
                        attendance.trabajadorNombre || ""
                    ).toLowerCase();

                const email =
                    String(
                        attendance.trabajadorCorreo || ""
                    ).toLowerCase();

                const branch =
                    String(
                        attendance.sucursalNombre || ""
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    name.includes(search) ||
                    email.includes(search) ||
                    branch.includes(search);


                const matchesBranch =
                    !selectedBranch ||
                    attendance.sucursalNombre ===
                    selectedBranch;


                let matchesDate =
                    true;


                if (selectedDate) {

                    const date =
                        getAttendanceDate(
                            attendance
                        );

                    if (!date) {
                        matchesDate = false;
                    } else {

                        const year =
                            date.getFullYear();

                        const month =
                            String(
                                date.getMonth() + 1
                            ).padStart(
                                2,
                                "0"
                            );

                        const day =
                            String(
                                date.getDate()
                            ).padStart(
                                2,
                                "0"
                            );

                        const attendanceDate =
                            `${year}-${month}-${day}`;

                        matchesDate =
                            attendanceDate ===
                            selectedDate;
                    }

                }


                return (
                    matchesSearch &&
                    matchesBranch &&
                    matchesDate
                );

            }
        );


    renderAttendances();
}

function renderAttendances() {

    countElement.textContent =
        filteredAttendances.length;


    if (
        !filteredAttendances.length
    ) {

        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    📋
                </div>

                <h3>
                    No hay asistencias
                </h3>

                <p>
                    No encontramos registros con los filtros seleccionados.
                </p>
            </div>
        `;

        return;
    }


    listContainer.innerHTML =
        filteredAttendances
            .map(
                attendance =>
                    renderAttendanceCard(
                        attendance
                    )
            )
            .join("");


    listContainer
        .querySelectorAll(
            "[data-attendance-maps]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.attendanceMaps;

                        const attendance =
                            filteredAttendances.find(
                                item =>
                                    item.id === id
                            );

                        if (!attendance) {
                            return;
                        }

                        const url =
                            getMapsUrl(
                                attendance
                            );

                        if (url !== "#") {

                            window.open(
                                url,
                                "_blank"
                            );

                        }

                    }
                );

            }
        );
}

function renderAttendanceCard(
    attendance
) {

    const date =
        formatDate(
            attendance.fechaHora
        );


    const distance =
        Number(
            attendance.distanciaMetros
        );


    const radius =
        Number(
            attendance.radioPermitido
        );


    const gpsPrecision =
        Number(
            attendance.precisionGps
        );


    const distanceText =
        Number.isFinite(distance)
            ? `${Math.round(distance)} m`
            : "No disponible";


    const radiusText =
        Number.isFinite(radius)
            ? `${Math.round(radius)} m`
            : "No disponible";


    const precisionText =
        Number.isFinite(gpsPrecision)
            ? `${Math.round(gpsPrecision)} m`
            : "No disponible";


    const workerName =
        escapeHtml(
            attendance.trabajadorNombre ||
            "Trabajador sin nombre"
        );


    const workerEmail =
        escapeHtml(
            attendance.trabajadorCorreo ||
            "Sin correo"
        );


    const branchName =
        escapeHtml(
            attendance.sucursalNombre ||
            "Sucursal sin nombre"
        );


    const mapsUrl =
        getMapsUrl(
            attendance
        );


    return `
        <article class="attendance-card">

            <div class="attendance-card-header">

                <div class="attendance-avatar">
                    👷
                </div>

                <div class="attendance-worker">

                    <h3>
                        ${workerName}
                    </h3>

                    <span>
                        ${workerEmail}
                    </span>

                </div>

            </div>


            <div class="attendance-branch">

                <div class="attendance-branch-icon">
                    📍
                </div>

                <div>

                    <span>
                        Sucursal
                    </span>

                    <strong>
                        ${branchName}
                    </strong>

                </div>

            </div>


            <div class="attendance-date">

                <div>

                    <span>
                        Fecha
                    </span>

                    <strong>
                        ${date.date}
                    </strong>

                </div>


                <div>

                    <span>
                        Hora
                    </span>

                    <strong>
                        ${date.time}
                    </strong>

                </div>

            </div>


            <div class="attendance-metrics">

                <div class="attendance-metric">

                    <span>
                        Distancia
                    </span>

                    <strong>
                        ${distanceText}
                    </strong>

                </div>


                <div class="attendance-metric">

                    <span>
                        Radio permitido
                    </span>

                    <strong>
                        ${radiusText}
                    </strong>

                </div>


                <div class="attendance-metric">

                    <span>
                        Precisión GPS
                    </span>

                    <strong>
                        ${precisionText}
                    </strong>

                </div>

            </div>


            <div class="attendance-status">

                <span>
                    ✓ Asistencia registrada
                </span>

                <small>
                    ${escapeHtml(date.full)}
                </small>

            </div>


            ${
                mapsUrl !== "#"
                    ? `
                        <button
                            type="button"
                            class="attendance-map-button"
                            data-attendance-maps="${attendance.id}"
                        >
                            🗺️ Ver ubicación en Google Maps
                        </button>
                    `
                    : ""
            }

        </article>
    `;
}

async function loadAttendances() {

    listContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                ⏳
            </div>

            <h3>
                Cargando asistencias...
            </h3>

            <p>
                Estamos consultando los registros.
            </p>
        </div>
    `;


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "asistencias"
                )
            );


        allAttendances =
            snapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            );


        sortAttendances();

        buildFilters();

        applyFilters();


        const dashboardCount =
            document.getElementById(
                "recordsCount"
            );


        if (dashboardCount) {

            dashboardCount.textContent =
                allAttendances.length;

        }


        const todayCount =
            document.getElementById(
                "attendanceCount"
            );


        if (todayCount) {

            const now =
                new Date();

            const year =
                now.getFullYear();

            const month =
                now.getMonth();

            const day =
                now.getDate();


            const today =
                allAttendances.filter(
                    attendance => {

                        const date =
                            getAttendanceDate(
                                attendance
                            );

                        if (!date) {
                            return false;
                        }

                        return (
                            date.getFullYear() === year &&
                            date.getMonth() === month &&
                            date.getDate() === day
                        );

                    }
                );


            todayCount.textContent =
                today.length;

        }

    } catch (error) {

        console.error(
            "Error cargando asistencias:",
            error
        );


        listContainer.innerHTML = `
            <div class="empty-state error-state">

                <div class="empty-icon">
                    ⚠️
                </div>

                <h3>
                    No fue posible cargar las asistencias
                </h3>

                <p>
                    Revisa la conexión con Firebase e inténtalo nuevamente.
                </p>

            </div>
        `;

        window.AdminApp.notify(
            "No fue posible cargar las asistencias.",
            "error"
        );

    }

}

function clearFilters() {

    searchInput.value = "";
    dateInput.value = "";
    branchSelect.value = "";

    applyFilters();
}

function setupEvents() {

    searchInput.addEventListener(
        "input",
        applyFilters
    );


    dateInput.addEventListener(
        "change",
        applyFilters
    );


    branchSelect.addEventListener(
        "change",
        applyFilters
    );


    clearButton.addEventListener(
        "click",
        clearFilters
    );


    refreshButton.addEventListener(
        "click",
        async () => {

            refreshButton.disabled =
                true;

            refreshButton.classList.add(
                "loading"
            );

            await loadAttendances();

            refreshButton.disabled =
                false;

            refreshButton.classList.remove(
                "loading"
            );

        }
    );

}

function createAttendanceInterface() {

    const module =
        document.getElementById(
            "attendanceModule"
        );


    if (!module) {
        return;
    }


    module.innerHTML = `
        <div class="attendance-toolbar">

            <div class="attendance-search">

                <span>
                    🔎
                </span>

                <input
                    id="attendanceSearch"
                    type="search"
                    placeholder="Buscar trabajador, correo o sucursal..."
                    autocomplete="off"
                >

            </div>


            <div class="attendance-filters">

                <div class="filter-field">

                    <label for="attendanceDate">
                        Fecha
                    </label>

                    <input
                        id="attendanceDate"
                        type="date"
                    >

                </div>


                <div class="filter-field">

                    <label for="attendanceBranch">
                        Sucursal
                    </label>

                    <select
                        id="attendanceBranch"
                    >

                        <option value="">
                            Todas las sucursales
                        </option>

                    </select>

                </div>

            </div>


            <div class="attendance-toolbar-actions">

                <button
                    id="clearAttendanceFilters"
                    type="button"
                    class="secondary-action"
                >
                    Limpiar filtros
                </button>


                <button
                    id="refreshAttendances"
                    type="button"
                    class="primary-action"
                >
                    ↻ Actualizar
                </button>

            </div>

        </div>


        <div class="attendance-list-header">

            <div>

                <span class="section-eyebrow">
                    Registros
                </span>

                <h3>
                    Historial de asistencias
                </h3>

            </div>


            <span
                id="attendanceListCount"
                class="list-count"
            >
                0
            </span>

        </div>


        <div
            id="attendanceList"
            class="attendance-list"
        ></div>
    `;


    searchInput =
        getElement(
            "attendanceSearch"
        );


    dateInput =
        getElement(
            "attendanceDate"
        );


    branchSelect =
        getElement(
            "attendanceBranch"
        );


    clearButton =
        getElement(
            "clearAttendanceFilters"
        );


    refreshButton =
        getElement(
            "refreshAttendances"
        );


    listContainer =
        getElement(
            "attendanceList"
        );


    countElement =
        getElement(
            "attendanceListCount"
        );

}

export async function init() {

    db =
        window.AdminFirebase?.db;


    if (!db) {

        console.error(
            "Firestore no está disponible para asistencias."
        );

        return;
    }


    createAttendanceInterface();

    setupEvents();

    await loadAttendances();

}

window.AdminAsistencias = {

    reload() {
        return loadAttendances();
    },

    getAll() {
        return allAttendances;
    }

};