import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAA668dcBZXPdrx8MGujZCCP6EM2WNlprw",
    authDomain: "refrigeracionessantos.firebaseapp.com",
    databaseURL: "https://refrigeracionessantos-default-rtdb.firebaseio.com",
    projectId: "refrigeracionessantos",
    storageBucket: "refrigeracionessantos.firebasestorage.app",
    messagingSenderId: "456489319194",
    appId: "1:456489319194:web:5929a5f7eb50ccbde58aa3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentProfile = null;

let map = null;
let userMarker = null;
let userCircle = null;

let currentPosition = null;
let selectedBranch = null;

let branches = [];
let myAttendances = [];
let generalAttendances = [];

let watchId = null;

const workerName =
    document.getElementById("workerName");

const locationStatus =
    document.getElementById("locationStatus");

const locationMessage =
    document.getElementById("locationMessage");

const locationIndicator =
    document.getElementById("locationIndicator");

const accuracyElement =
    document.getElementById("accuracy");

const latitudeElement =
    document.getElementById("latitude");

const longitudeElement =
    document.getElementById("longitude");

const branchCount =
    document.getElementById("branchCount");

const branchesContainer =
    document.getElementById("branchesContainer");

const selectedBranchElement =
    document.getElementById("selectedBranch");

const takeAttendanceButton =
    document.getElementById(
        "takeAttendanceButton"
    );

const attendanceStatus =
    document.getElementById(
        "attendanceStatus"
    );

const currentDate =
    document.getElementById("currentDate");

const myHistoryContainer =
    document.getElementById(
        "myHistoryContainer"
    );

const myHistoryCount =
    document.getElementById(
        "myHistoryCount"
    );

const generalHistoryContainer =
    document.getElementById(
        "generalHistoryContainer"
    );

const generalHistoryCount =
    document.getElementById(
        "generalHistoryCount"
    );

const historySearch =
    document.getElementById(
        "historySearch"
    );

const historyDateFilter =
    document.getElementById(
        "historyDateFilter"
    );

const loadingOverlay =
    document.getElementById(
        "loadingOverlay"
    );

const messageModal =
    document.getElementById(
        "messageModal"
    );

const messageIcon =
    document.getElementById(
        "messageIcon"
    );

const messageTitle =
    document.getElementById(
        "messageTitle"
    );

const messageText =
    document.getElementById(
        "messageText"
    );

const messageClose =
    document.getElementById(
        "messageClose"
    );

function showLoading(show) {
    if (!loadingOverlay) {
        return;
    }

    if (show) {
        loadingOverlay.classList.add(
            "show"
        );
    } else {
        loadingOverlay.classList.remove(
            "show"
        );
    }
}

function showMessage(
    title,
    text,
    type = "success"
) {
    messageTitle.textContent =
        title;

    messageText.textContent =
        text;

    messageIcon.textContent =
        type === "error"
            ? "!"
            : type === "warning"
                ? "⚠"
                : "✓";

    messageIcon.className =
        `message-icon ${type}`;

    messageModal.classList.add(
        "show"
    );
}

function closeMessage() {
    messageModal.classList.remove(
        "show"
    );
}

messageClose.addEventListener(
    "click",
    closeMessage
);

messageModal.addEventListener(
    "click",
    event => {
        if (
            event.target ===
            messageModal
        ) {
            closeMessage();
        }
    }
);

function updateDate() {
    const now =
        new Date();

    currentDate.textContent =
        now.toLocaleDateString(
            "es-MX",
            {
                weekday: "short",
                day: "2-digit",
                month: "short"
            }
        );
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
    if (
        !timestamp ||
        typeof timestamp.toDate !==
        "function"
    ) {
        return "Sin fecha";
    }

    return timestamp
        .toDate()
        .toLocaleDateString(
            "es-MX",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
}

function formatTime(timestamp) {
    if (
        !timestamp ||
        typeof timestamp.toDate !==
        "function"
    ) {
        return "Sin hora";
    }

    return timestamp
        .toDate()
        .toLocaleTimeString(
            "es-MX",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {
    const earthRadius = 6371000;

    const dLat =
        (
            lat2 -
            lat1
        ) *
        Math.PI /
        180;

    const dLon =
        (
            lon2 -
            lon1
        ) *
        Math.PI /
        180;

    const a =
        Math.sin(
            dLat / 2
        ) ** 2 +
        Math.cos(
            lat1 *
            Math.PI /
            180
        ) *
        Math.cos(
            lat2 *
            Math.PI /
            180
        ) *
        Math.sin(
            dLon / 2
        ) ** 2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadius * c;
}

function initializeMap() {
    if (
        typeof L ===
        "undefined"
    ) {
        console.error(
            "Leaflet no está disponible."
        );

        return;
    }

    map = L.map(
        "map",
        {
            zoomControl: false
        }
    ).setView(
        [
            17.0732,
            -96.7266
        ],
        12
    );

    L.control.zoom({
        position: "bottomright"
    }).addTo(map);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap"
        }
    ).addTo(map);
}

function updateUserLocation(
    position
) {
    currentPosition = {
        latitude:
            position.coords.latitude,

        longitude:
            position.coords.longitude,

        accuracy:
            position.coords.accuracy
    };

    latitudeElement.textContent =
        currentPosition.latitude.toFixed(
            6
        );

    longitudeElement.textContent =
        currentPosition.longitude.toFixed(
            6
        );

    accuracyElement.textContent =
        `${Math.round(
            currentPosition.accuracy
        )} m`;

    locationStatus.textContent =
        "Ubicación activa";

    locationMessage.textContent =
        "Tu dispositivo está proporcionando ubicación.";

    locationIndicator.className =
        "location-indicator active";

    if (!map) {
        return;
    }

    const lat =
        currentPosition.latitude;

    const lng =
        currentPosition.longitude;

    if (!userMarker) {

        userMarker =
            L.marker(
                [lat, lng],
                {
                    title:
                        "Mi ubicación"
                }
            ).addTo(map);

        userMarker.bindPopup(
            "<strong>Tu ubicación</strong>"
        );

    } else {

        userMarker.setLatLng(
            [lat, lng]
        );

    }

    if (!userCircle) {

        userCircle =
            L.circle(
                [lat, lng],
                {
                    radius:
                        currentPosition.accuracy,
                    color:
                        "#2563eb",
                    fillColor:
                        "#2563eb",
                    fillOpacity:
                        0.10,
                    weight: 1
                }
            ).addTo(map);

    } else {

        userCircle.setLatLng(
            [lat, lng]
        );

        userCircle.setRadius(
            currentPosition.accuracy
        );

    }

    updateBranchDistances();
}

function handleLocationError(
    error
) {
    console.error(
        "Error de ubicación:",
        error
    );

    locationIndicator.className =
        "location-indicator error";

    locationStatus.textContent =
        "Ubicación no disponible";

    if (
        error.code ===
        1
    ) {

        locationMessage.textContent =
            "Debes permitir el acceso a tu ubicación.";

    } else if (
        error.code ===
        2
    ) {

        locationMessage.textContent =
            "No fue posible obtener tu ubicación.";

    } else if (
        error.code ===
        3
    ) {

        locationMessage.textContent =
            "La solicitud de ubicación tardó demasiado.";

    } else {

        locationMessage.textContent =
            "No fue posible acceder a tu ubicación.";
    }

    takeAttendanceButton.disabled =
        true;
}

function startLocationTracking() {
    if (
        !navigator.geolocation
    ) {

        handleLocationError({
            code: 2
        });

        return;
    }

    locationStatus.textContent =
        "Solicitando ubicación...";

    locationMessage.textContent =
        "Acepta el permiso de ubicación de tu dispositivo.";

    watchId =
        navigator.geolocation.watchPosition(
            updateUserLocation,
            handleLocationError,
            {
                enableHighAccuracy:
                    true,

                maximumAge:
                    5000,

                timeout:
                    15000
            }
        );
}

function stopLocationTracking() {
    if (
        watchId !== null &&
        navigator.geolocation
    ) {

        navigator.geolocation.clearWatch(
            watchId
        );

        watchId = null;
    }
}

function loadBranchesOnMap() {
    if (!map) {
        return;
    }

    branches.forEach(
        branch => {

            if (
                typeof branch.latitud !==
                "number" ||
                typeof branch.longitud !==
                "number"
            ) {
                return;
            }

            const marker =
                L.marker(
                    [
                        branch.latitud,
                        branch.longitud
                    ]
                ).addTo(map);

            const radius =
                Number(
                    branch.radio
                ) || 50;

            L.circle(
                [
                    branch.latitud,
                    branch.longitud
                ],
                {
                    radius,
                    color:
                        "#f39a00",
                    fillColor:
                        "#f39a00",
                    fillOpacity:
                        0.08,
                    weight: 2
                }
            ).addTo(map);

            marker.bindPopup(
                `
                    <strong>
                        ${escapeHtml(
                            branch.nombre
                        )}
                    </strong>
                    <br>
                    Radio de asistencia:
                    ${radius} metros
                `
            );

            branch.marker =
                marker;
        }
    );
}

async function loadBranches() {
    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "sucursales"
                )
            );

        branches =
            snapshot.docs
                .map(
                    item => ({
                        id:
                            item.id,
                        ...item.data()
                    })
                )
                .filter(
                    branch =>
                        branch.estado !==
                        "inactivo"
                )
                .filter(
                    branch =>
                        typeof branch.latitud ===
                        "number" &&
                        typeof branch.longitud ===
                        "number"
                );

        branchCount.textContent =
            `${branches.length} ${
                branches.length === 1
                    ? "sucursal"
                    : "sucursales"
            }`;

        renderBranches();

        loadBranchesOnMap();

        updateBranchDistances();

    } catch (error) {

        console.error(
            "Error cargando sucursales:",
            error
        );

        branchesContainer.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <p>
                    No fue posible cargar las sucursales.
                </p>
            </div>
        `;
    }
}

function getGoogleMapsUrl(
    branch
) {
    return `https://www.google.com/maps/dir/?api=1&destination=${branch.latitud},${branch.longitud}`;
}

function renderBranches() {
    if (!branches.length) {

        branchesContainer.innerHTML = `
            <div class="empty-state">
                <span>🏪</span>
                <p>
                    No existen sucursales disponibles.
                </p>
            </div>
        `;

        return;
    }

    branchesContainer.innerHTML =
        branches
            .map(
                branch => {

                    const distance =
                        getBranchDistance(
                            branch
                        );

                    const radius =
                        Number(
                            branch.radio
                        ) || 50;

                    const inside =
                        distance !== null &&
                        distance <= radius;

                    return `
                        <article
                            class="branch-card ${
                                inside
                                    ? "inside"
                                    : ""
                            }"
                        >

                            <div class="branch-card-top">

                                <div class="branch-icon">
                                    🏪
                                </div>

                                <div class="branch-main">

                                    <h3>
                                        ${escapeHtml(
                                            branch.nombre ||
                                            "Sucursal"
                                        )}
                                    </h3>

                                    <span>
                                        Radio:
                                        ${radius} m
                                    </span>

                                </div>

                                ${
                                    distance !== null
                                        ? `
                                            <div class="distance-badge ${
                                                inside
                                                    ? "inside"
                                                    : "outside"
                                            }">

                                                ${
                                                    inside
                                                        ? "✓ Dentro"
                                                        : `${Math.round(distance)} m`
                                                }

                                            </div>
                                        `
                                        : ""
                                }

                            </div>


                            <div class="branch-card-details">

                                ${
                                    distance !== null
                                        ? `
                                            <div>
                                                <span>
                                                    DISTANCIA
                                                </span>

                                                <strong>
                                                    ${Math.round(
                                                        distance
                                                    )} m
                                                </strong>
                                            </div>
                                        `
                                        : `
                                            <div>
                                                <span>
                                                    DISTANCIA
                                                </span>

                                                <strong>
                                                    —
                                                </strong>
                                            </div>
                                        `
                                }


                                <div>
                                    <span>
                                        RADIO
                                    </span>

                                    <strong>
                                        ${radius} m
                                    </strong>
                                </div>

                            </div>


                            <div class="branch-card-actions">

                                <button
                                    type="button"
                                    class="select-branch-button"
                                    data-branch-id="${branch.id}"
                                >
                                    ${
                                        selectedBranch?.id ===
                                        branch.id
                                            ? "✓ Seleccionada"
                                            : "Seleccionar"
                                    }
                                </button>

                                <button
                                    type="button"
                                    class="maps-button"
                                    data-maps-id="${branch.id}"
                                >
                                    🧭 Ir a Google Maps
                                </button>

                            </div>

                        </article>
                    `;
                }
            )
            .join("");

    branchesContainer
        .querySelectorAll(
            "[data-branch-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const branch =
                            branches.find(
                                item =>
                                    item.id ===
                                    button.dataset.branchId
                            );

                        if (branch) {
                            selectBranch(
                                branch
                            );
                        }
                    }
                );
            }
        );

    branchesContainer
        .querySelectorAll(
            "[data-maps-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const branch =
                            branches.find(
                                item =>
                                    item.id ===
                                    button.dataset.mapsId
                            );

                        if (branch) {

                            window.open(
                                getGoogleMapsUrl(
                                    branch
                                ),
                                "_blank"
                            );

                        }
                    }
                );
            }
        );
}

function getBranchDistance(
    branch
) {
    if (!currentPosition) {
        return null;
    }

    return calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        branch.latitud,
        branch.longitud
    );
}

function updateBranchDistances() {
    if (!branches.length) {
        return;
    }

    renderBranches();

    updateSelectedBranchStatus();
}

function selectBranch(
    branch
) {
    selectedBranch =
        branch;

    selectedBranchElement.innerHTML = `
        <span>
            🏪
        </span>

        <div>

            <strong>
                ${escapeHtml(
                    branch.nombre
                )}
            </strong>

            <small>
                Radio permitido:
                ${Number(branch.radio) || 50} metros
            </small>

        </div>
    `;

    if (map) {

        map.setView(
            [
                branch.latitud,
                branch.longitud
            ],
            17,
            {
                animate: true
            }
        );

        if (branch.marker) {
            branch.marker.openPopup();
        }
    }

    updateSelectedBranchStatus();

    renderBranches();
}

function updateSelectedBranchStatus() {
    if (!selectedBranch) {

        attendanceStatus.textContent =
            "Selecciona una sucursal cercana para registrar tu asistencia.";

        takeAttendanceButton.disabled =
            true;

        return;
    }

    if (!currentPosition) {

        attendanceStatus.textContent =
            "Activa tu ubicación para comprobar si estás dentro del radio.";

        takeAttendanceButton.disabled =
            true;

        return;
    }

    const distance =
        getBranchDistance(
            selectedBranch
        );

    const radius =
        Number(
            selectedBranch.radio
        ) || 50;

    if (
        distance !== null &&
        distance <= radius
    ) {

        attendanceStatus.textContent =
            `✓ Estás dentro del radio permitido. Distancia: ${Math.round(
                distance
            )} metros.`;

        attendanceStatus.className =
            "attendance-status allowed";

        takeAttendanceButton.disabled =
            false;

    } else {

        attendanceStatus.textContent =
            distance !== null
                ? `Estás fuera del radio permitido. Distancia: ${Math.round(
                    distance
                )} m / máximo ${radius} m.`
                : "No se pudo calcular la distancia.";

        attendanceStatus.className =
            "attendance-status denied";

        takeAttendanceButton.disabled =
            true;
    }
}

async function takeAttendance() {
    if (
        !currentUser ||
        !currentProfile
    ) {
        return;
    }

    if (!selectedBranch) {

        showMessage(
            "Selecciona una sucursal",
            "Debes seleccionar una sucursal antes de registrar tu asistencia.",
            "warning"
        );

        return;
    }

    if (!currentPosition) {

        showMessage(
            "Ubicación requerida",
            "Debes permitir el acceso a la ubicación de tu dispositivo.",
            "warning"
        );

        return;
    }

    const distance =
        getBranchDistance(
            selectedBranch
        );

    const radius =
        Number(
            selectedBranch.radio
        ) || 50;

    if (
        distance === null ||
        distance > radius
    ) {

        showMessage(
            "Fuera del radio",
            `No puedes registrar asistencia porque estás a ${Math.round(
                distance || 0
            )} metros y el límite es de ${radius} metros.`,
            "warning"
        );

        return;
    }

    takeAttendanceButton.disabled =
        true;

    takeAttendanceButton.textContent =
        "Registrando...";

    try {

        await addDoc(
            collection(
                db,
                "asistencias"
            ),
            {
                trabajadorUid:
                    currentUser.uid,

                trabajadorNombre:
                    currentProfile.nombre ||
                    "Sin nombre",

                sucursalId:
                    selectedBranch.id,

                sucursalNombre:
                    selectedBranch.nombre ||
                    "Sucursal",

                fechaHora:
                    serverTimestamp(),

                latitud:
                    currentPosition.latitude,

                longitud:
                    currentPosition.longitude,

                precisionGps:
                    currentPosition.accuracy,

                distanciaMetros:
                    distance,

                radioPermitido:
                    radius,

                estado:
                    "registrada",

                tipoUsuario:
                    "gerente"
            }
        );

        showMessage(
            "Asistencia registrada",
            `Tu asistencia fue registrada correctamente en ${selectedBranch.nombre}.`,
            "success"
        );

        await loadMyAttendances();

        await loadGeneralAttendances();

    } catch (error) {

        console.error(
            "Error registrando asistencia:",
            error
        );

        showMessage(
            "No fue posible registrar",
            "Ocurrió un error al guardar tu asistencia. Intenta nuevamente.",
            "error"
        );

    } finally {

        takeAttendanceButton.disabled =
            false;

        takeAttendanceButton.textContent =
            "📍 Tomar asistencia";

        updateSelectedBranchStatus();
    }
}

async function loadMyAttendances() {
    try {

        const q =
            query(
                collection(
                    db,
                    "asistencias"
                ),
                where(
                    "trabajadorUid",
                    "==",
                    currentUser.uid
                )
            );

        const snapshot =
            await getDocs(q);

        myAttendances =
            snapshot.docs
                .map(
                    item => ({
                        id:
                            item.id,
                        ...item.data()
                    })
                )
                .sort(
                    (a, b) => {

                        const dateA =
                            a.fechaHora?.toDate
                                ? a.fechaHora.toDate()
                                : new Date(0);

                        const dateB =
                            b.fechaHora?.toDate
                                ? b.fechaHora.toDate()
                                : new Date(0);

                        return dateB - dateA;
                    }
                );

        renderMyHistory();

    } catch (error) {

        console.error(
            "Error cargando historial propio:",
            error
        );

        myHistoryContainer.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <p>
                    No fue posible cargar tu historial.
                </p>
            </div>
        `;
    }
}

function renderMyHistory() {
    myHistoryCount.textContent =
        `${myAttendances.length} ${
            myAttendances.length === 1
                ? "registro"
                : "registros"
        }`;

    if (!myAttendances.length) {

        myHistoryContainer.innerHTML = `
            <div class="empty-state">
                <span>📋</span>
                <h3>
                    Sin asistencias
                </h3>
                <p>
                    Todavía no tienes registros de asistencia.
                </p>
            </div>
        `;

        return;
    }

    myHistoryContainer.innerHTML =
        myAttendances
            .map(
                attendance =>
                    renderMyAttendance(
                        attendance
                    )
            )
            .join("");
}

function renderMyAttendance(
    attendance
) {
    const distance =
        Number(
            attendance.distanciaMetros
        );

    return `
        <article class="history-card">

            <div class="history-card-icon">
                ✓
            </div>

            <div class="history-card-main">

                <strong>
                    ${escapeHtml(
                        attendance.sucursalNombre ||
                        "Sucursal"
                    )}
                </strong>

                <span>
                    ${formatDate(
                        attendance.fechaHora
                    )}
                    ·
                    ${formatTime(
                        attendance.fechaHora
                    )}
                </span>

            </div>

            <div class="history-distance">

                ${
                    Number.isFinite(
                        distance
                    )
                        ? `${Math.round(
                            distance
                        )} m`
                        : "—"
                }

            </div>

        </article>
    `;
}

async function loadGeneralAttendances() {
    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "asistencias"
                )
            );

        generalAttendances =
            snapshot.docs
                .map(
                    item => ({
                        id:
                            item.id,
                        ...item.data()
                    })
                )
                .sort(
                    (a, b) => {

                        const dateA =
                            a.fechaHora?.toDate
                                ? a.fechaHora.toDate()
                                : new Date(0);

                        const dateB =
                            b.fechaHora?.toDate
                                ? b.fechaHora.toDate()
                                : new Date(0);

                        return dateB - dateA;
                    }
                );

        renderGeneralHistory();

    } catch (error) {

        console.error(
            "Error cargando historial general:",
            error
        );

        generalHistoryContainer.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <p>
                    No fue posible cargar el historial general.
                </p>
            </div>
        `;
    }
}

function filterGeneralHistory() {
    const search =
        historySearch.value
            .trim()
            .toLowerCase();

    const dateFilter =
        historyDateFilter.value;

    const now =
        new Date();

    return generalAttendances.filter(
        attendance => {

            const name =
                String(
                    attendance.trabajadorNombre ||
                    ""
                ).toLowerCase();

            const branch =
                String(
                    attendance.sucursalNombre ||
                    ""
                ).toLowerCase();

            if (
                search &&
                !name.includes(search) &&
                !branch.includes(search)
            ) {
                return false;
            }

            const date =
                attendance.fechaHora?.toDate
                    ? attendance.fechaHora.toDate()
                    : null;

            if (!date) {
                return false;
            }

            if (
                dateFilter ===
                "hoy"
            ) {

                return (
                    date.getFullYear() ===
                        now.getFullYear() &&
                    date.getMonth() ===
                        now.getMonth() &&
                    date.getDate() ===
                        now.getDate()
                );
            }

            if (
                dateFilter ===
                "semana"
            ) {

                const weekStart =
                    new Date();

                weekStart.setDate(
                    weekStart.getDate() -
                    7
                );

                return date >=
                    weekStart;
            }

            if (
                dateFilter ===
                "mes"
            ) {

                return (
                    date.getFullYear() ===
                        now.getFullYear() &&
                    date.getMonth() ===
                        now.getMonth()
                );
            }

            return true;
        }
    );
}

function renderGeneralHistory() {
    const filtered =
        filterGeneralHistory();

    generalHistoryCount.textContent =
        `${filtered.length} ${
            filtered.length === 1
                ? "registro"
                : "registros"
        }`;

    if (!filtered.length) {

        generalHistoryContainer.innerHTML = `
            <div class="empty-state">
                <span>📋</span>
                <h3>
                    Sin resultados
                </h3>
                <p>
                    No existen asistencias que coincidan con tu búsqueda.
                </p>
            </div>
        `;

        return;
    }

    generalHistoryContainer.innerHTML =
        filtered
            .map(
                attendance =>
                    renderGeneralAttendance(
                        attendance
                    )
            )
            .join("");
}

function renderGeneralAttendance(
    attendance
) {
    const distance =
        Number(
            attendance.distanciaMetros
        );

    return `
        <article class="general-history-card">

            <div class="general-avatar">
                👤
            </div>

            <div class="general-main">

                <strong>
                    ${escapeHtml(
                        attendance.trabajadorNombre ||
                        "Trabajador"
                    )}
                </strong>

                <span class="general-branch">
                    🏪
                    ${escapeHtml(
                        attendance.sucursalNombre ||
                        "Sucursal"
                    )}
                </span>

                <span class="general-date">
                    📅
                    ${formatDate(
                        attendance.fechaHora
                    )}
                    ·
                    ${formatTime(
                        attendance.fechaHora
                    )}
                </span>

            </div>

            <div class="general-distance">

                <strong>
                    ${
                        Number.isFinite(
                            distance
                        )
                            ? `${Math.round(
                                distance
                            )} m`
                            : "—"
                    }
                </strong>

                <span>
                    Distancia
                </span>

            </div>

        </article>
    `;
}

function centerOnUser() {
    if (
        !currentPosition ||
        !map
    ) {

        showMessage(
            "Ubicación no disponible",
            "Todavía no tenemos una ubicación válida de tu dispositivo.",
            "warning"
        );

        return;
    }

    map.setView(
        [
            currentPosition.latitude,
            currentPosition.longitude
        ],
        17,
        {
            animate: true
        }
    );

    if (userMarker) {
        userMarker.openPopup();
    }
}

function setupNavigation() {
    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".nav-item"
                            )
                            .forEach(
                                nav =>
                                    nav.classList.remove(
                                        "active"
                                    )
                            );

                        item.classList.add(
                            "active"
                        );

                        const section =
                            item.dataset.section;

                        if (
                            section ===
                            "inicio"
                        ) {

                            window.scrollTo({
                                top: 0,
                                behavior:
                                    "smooth"
                            });

                        }

                        if (
                            section ===
                            "asistencia"
                        ) {

                            document
                                .querySelector(
                                    ".attendance-card"
                                )
                                ?.scrollIntoView({
                                    behavior:
                                        "smooth"
                                });

                        }

                        if (
                            section ===
                            "historial"
                        ) {

                            document
                                .querySelector(
                                    ".general-history-section"
                                )
                                ?.scrollIntoView({
                                    behavior:
                                        "smooth"
                                });

                        }
                    }
                );
            }
        );
}

async function loadProfile(user) {
    const profileRef =
        doc(
            db,
            "users",
            user.uid
        );

    const profileSnapshot =
        await getDoc(
            profileRef
        );

    if (
        !profileSnapshot.exists()
    ) {

        window.location.href =
            "completarPerfil.html";

        return false;
    }

    currentProfile =
        profileSnapshot.data();

    if (
        currentProfile.rol !==
        "gerente"
    ) {

        if (
            currentProfile.rol ===
            "administrador"
        ) {

            window.location.href =
                "admin.html";

        } else {

            window.location.href =
                "trabajador.html";
        }

        return false;
    }

    if (
        currentProfile.estado ===
        "suspendido"
    ) {

        await signOut(
            auth
        );

        window.location.href =
            "login.html";

        return false;
    }

    workerName.textContent =
        currentProfile.nombre ||
        "Gerente";

    return true;
}

async function initializePanel(user) {
    currentUser =
        user;

    const valid =
        await loadProfile(
            user
        );

    if (!valid) {
        return;
    }

    initializeMap();

    updateDate();

    setupNavigation();

    startLocationTracking();

    await loadBranches();

    await loadMyAttendances();

    await loadGeneralAttendances();

    showLoading(false);
}

document
    .getElementById(
        "centerLocationButton"
    )
    .addEventListener(
        "click",
        centerOnUser
    );

takeAttendanceButton.addEventListener(
    "click",
    takeAttendance
);

historySearch.addEventListener(
    "input",
    renderGeneralHistory
);

historyDateFilter.addEventListener(
    "change",
    renderGeneralHistory
);

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        async () => {

            stopLocationTracking();

            await signOut(
                auth
            );

            window.location.href =
                "login.html";
        }
    );

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }

        try {

            await initializePanel(
                user
            );

        } catch (error) {

            console.error(
                "Error inicializando panel:",
                error
            );

            showLoading(false);

            showMessage(
                "Error",
                "No fue posible cargar tu panel. Intenta nuevamente.",
                "error"
            );
        }
    }
);

window.addEventListener(
    "beforeunload",
    stopLocationTracking
);