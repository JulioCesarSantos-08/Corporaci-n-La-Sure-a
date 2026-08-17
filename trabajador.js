import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    addDoc,
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

const workerName =
    document.getElementById("workerName");

const locationIcon =
    document.getElementById("locationIcon");

const locationTitle =
    document.getElementById("locationTitle");

const locationText =
    document.getElementById("locationText");

const locationDot =
    document.getElementById("locationDot");

const locationDetails =
    document.getElementById("locationDetails");

const locationAccuracy =
    document.getElementById("locationAccuracy");

const locationLatitude =
    document.getElementById("locationLatitude");

const locationLongitude =
    document.getElementById("locationLongitude");

const activateLocationButton =
    document.getElementById("activateLocationButton");

const centerLocationButton =
    document.getElementById("centerLocationButton");

const branchCount =
    document.getElementById("branchCount");

const branchList =
    document.getElementById("branchList");

const mapMessage =
    document.getElementById("mapMessage");

const attendanceButton =
    document.getElementById("attendanceButton");

const attendanceStatus =
    document.getElementById("attendanceStatus");

const historyList =
    document.getElementById("historyList");

const historyTotal =
    document.getElementById("historyTotal");

const historyLast =
    document.getElementById("historyLast");

const todayDate =
    document.getElementById("todayDate");

const logoutButton =
    document.getElementById("logoutButton");

let currentUser = null;

let currentWorkerData = null;

let map = null;

let userMarker = null;

let userAccuracyCircle = null;

let currentPosition = null;

let branches = [];

let branchMarkers = [];

let locationWatchId = null;

let locationActive = false;

let attendanceAlreadyRegistered = false;

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(date) {

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);
}

function formatDateLong(date) {

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    ).format(date);
}

function formatTime(date) {

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    ).format(date);
}

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const earthRadius = 6371000;

    const toRadians =
        degrees =>
            degrees * Math.PI / 180;

    const differenceLat =
        toRadians(lat2 - lat1);

    const differenceLon =
        toRadians(lon2 - lon1);

    const a =
        Math.sin(differenceLat / 2) *
        Math.sin(differenceLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(differenceLon / 2) *
        Math.sin(differenceLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadius * c;
}

function formatDistance(distance) {

    if (
        distance === null ||
        distance === undefined ||
        !Number.isFinite(distance)
    ) {
        return "Distancia no disponible";
    }

    if (distance < 1000) {
        return `${Math.round(distance)} m`;
    }

    return `${(distance / 1000).toFixed(2)} km`;
}

function getGoogleMapsUrl(
    latitude,
    longitude
) {

    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

function initializeMap() {

    map =
        L.map(
            "map",
            {
                zoomControl: false
            }
        ).setView(
            [19.4326, -99.1332],
            5
        );

    L.control.zoom({
        position: "bottomright"
    }).addTo(map);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

    setTimeout(
        () => {
            map.invalidateSize();
        },
        300
    );
}

function createUserIcon() {

    return L.divIcon({
        className: "",
        html:
            `<div class="user-location-marker"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
}

function updateUserLocationOnMap(
    latitude,
    longitude,
    accuracy
) {

    if (!map) {
        return;
    }

    if (!userMarker) {

        userMarker =
            L.marker(
                [latitude, longitude],
                {
                    icon:
                        createUserIcon(),
                    zIndexOffset: 2000
                }
            )
            .addTo(map)
            .bindPopup(
                "<strong>📍 Tu ubicación</strong>"
            );

    } else {

        userMarker.setLatLng(
            [latitude, longitude]
        );
    }

    if (!userAccuracyCircle) {

        userAccuracyCircle =
            L.circle(
                [latitude, longitude],
                {
                    radius:
                        accuracy || 0,
                    color: "#3988ff",
                    fillColor: "#3988ff",
                    fillOpacity: 0.08,
                    weight: 1
                }
            ).addTo(map);

    } else {

        userAccuracyCircle.setLatLng(
            [latitude, longitude]
        );

        userAccuracyCircle.setRadius(
            accuracy || 0
        );
    }
}

function centerOnUser() {

    if (
        !map ||
        !currentPosition
    ) {
        return;
    }

    map.setView(
        [
            currentPosition.latitude,
            currentPosition.longitude
        ],
        18,
        {
            animate: true
        }
    );
}

function updateLocationInterface() {

    if (!locationActive) {

        locationIcon.textContent =
            "📍";

        locationTitle.textContent =
            "Mi ubicación";

        locationText.textContent =
            "Activa tu ubicación para comenzar.";

        locationDot.className =
            "location-dot";

        activateLocationButton.classList.remove(
            "hidden"
        );

        centerLocationButton.classList.add(
            "hidden"
        );

        return;
    }

    if (!currentPosition) {
        return;
    }

    locationIcon.textContent =
        "🟢";

    locationTitle.textContent =
        "Mi ubicación está activa";

    locationText.textContent =
        `Ubicación activa · Precisión aproximada ${Math.round(currentPosition.accuracy)} m`;

    locationDot.className =
        "location-dot active";

    locationAccuracy.textContent =
        `${Math.round(currentPosition.accuracy)} m`;

    locationLatitude.textContent =
        currentPosition.latitude.toFixed(6);

    locationLongitude.textContent =
        currentPosition.longitude.toFixed(6);

    activateLocationButton.classList.add(
        "hidden"
    );

    centerLocationButton.classList.remove(
        "hidden"
    );
}

function showLocationError(
    message
) {

    locationActive = false;

    locationIcon.textContent =
        "⚠️";

    locationTitle.textContent =
        "No fue posible obtener tu ubicación";

    locationText.textContent =
        message;

    locationDot.className =
        "location-dot error";

    activateLocationButton.classList.remove(
        "hidden"
    );

    centerLocationButton.classList.add(
        "hidden"
    );

    attendanceButton.disabled =
        true;

    attendanceStatus.className =
        "attendance-status error";

    attendanceStatus.textContent =
        message;
}

function startLocationTracking() {

    if (!navigator.geolocation) {

        showLocationError(
            "Este dispositivo o navegador no permite obtener la ubicación."
        );

        return;
    }

    if (
        locationWatchId !== null
    ) {

        navigator.geolocation.clearWatch(
            locationWatchId
        );

        locationWatchId = null;
    }

    locationActive = true;

    locationIcon.textContent =
        "⏳";

    locationTitle.textContent =
        "Obteniendo ubicación...";

    locationText.textContent =
        "Espera unos segundos mientras obtenemos una ubicación precisa.";

    locationDot.className =
        "location-dot";

    activateLocationButton.classList.add(
        "hidden"
    );

    centerLocationButton.classList.add(
        "hidden"
    );

    locationWatchId =
        navigator.geolocation.watchPosition(
            position => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                const accuracy =
                    position.coords.accuracy;

                currentPosition = {
                    latitude,
                    longitude,
                    accuracy
                };

                locationActive = true;

                updateLocationInterface();

                updateUserLocationOnMap(
                    latitude,
                    longitude,
                    accuracy
                );

                mapMessage.classList.add(
                    "hidden"
                );

                updateBranchDistances();

            },

            error => {

                console.error(
                    "Error de geolocalización:",
                    error
                );

                if (
                    error.code ===
                    error.PERMISSION_DENIED
                ) {

                    showLocationError(
                        "Permiso de ubicación denegado. Actívalo desde los ajustes del navegador."
                    );

                } else if (
                    error.code ===
                    error.POSITION_UNAVAILABLE
                ) {

                    showLocationError(
                        "No fue posible obtener la ubicación del dispositivo."
                    );

                } else if (
                    error.code ===
                    error.TIMEOUT
                ) {

                    showLocationError(
                        "La ubicación tardó demasiado en responder. Intenta nuevamente."
                    );

                } else {

                    showLocationError(
                        "Ocurrió un problema al obtener tu ubicación."
                    );
                }

            },

            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 20000
            }
        );
}

function renderBranches() {

    if (!map) {
        return;
    }

    branchMarkers.forEach(
        marker => {

            map.removeLayer(
                marker
            );
        }
    );

    branchMarkers = [];

    branchList.innerHTML = "";

    branchCount.textContent =
        `${branches.length} ${
            branches.length === 1
                ? "sucursal"
                : "sucursales"
        }`;

    if (
        branches.length === 0
    ) {

        branchList.innerHTML = `
            <div class="empty">
                🏪<br><br>
                Todavía no existen sucursales registradas.
            </div>
        `;

        return;
    }

    const bounds = [];

    branches.forEach(
        branch => {

            const latitude =
                Number(
                    branch.latitud
                );

            const longitude =
                Number(
                    branch.longitud
                );

            const radius =
                Number(
                    branch.radio
                ) || 50;

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {
                return;
            }

            const mapsUrl =
                getGoogleMapsUrl(
                    latitude,
                    longitude
                );

            const marker =
                L.marker(
                    [
                        latitude,
                        longitude
                    ]
                )
                .addTo(map);

            const distance =
                currentPosition
                    ? calculateDistance(
                        currentPosition.latitude,
                        currentPosition.longitude,
                        latitude,
                        longitude
                    )
                    : null;

            const inside =
                distance !== null &&
                distance <= radius;

            marker.bindPopup(`
                <div class="popup-name">
                    🏪 ${escapeHtml(
                        branch.nombre
                    )}
                </div>

                <div class="popup-radius">
                    Radio permitido:
                    ${radius} metros
                </div>

                <div class="popup-distance">
                    ${
                        distance !== null
                            ? `Distancia actual: ${formatDistance(distance)}`
                            : "Activa tu ubicación para calcular la distancia."
                    }
                </div>

                <a
                    class="popup-link"
                    href="${mapsUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    🧭 Ir a Google Maps
                </a>
            `);

            branchMarkers.push(
                marker
            );

            bounds.push(
                [
                    latitude,
                    longitude
                ]
            );

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "branch-card";

            card.innerHTML = `
                <div class="branch-header">

                    <div class="branch-icon">
                        🏪
                    </div>

                    <div class="branch-main">

                        <div class="branch-name">
                            ${escapeHtml(
                                branch.nombre
                            )}
                        </div>

                        <div class="branch-address">
                            ${
                                branch.direccion
                                    ? escapeHtml(
                                        branch.direccion
                                    )
                                    : "Ubicación registrada mediante coordenadas"
                            }
                        </div>

                        <div class="branch-distance ${
                            inside
                                ? "inside"
                                : "outside"
                        }">

                            ${
                                distance !== null
                                    ? inside
                                        ? `✅ Estás dentro del radio · ${formatDistance(distance)}`
                                        : `📍 Estás a ${formatDistance(distance)} · Radio: ${radius} m`
                                    : `📍 Radio de asistencia: ${radius} m`
                            }

                        </div>

                    </div>

                </div>

                <div class="branch-actions">

                    <button
                        type="button"
                        class="branch-action"
                        data-action="map"
                        data-lat="${latitude}"
                        data-lng="${longitude}"
                    >
                        🗺️ Ver mapa
                    </button>

                    <button
                        type="button"
                        class="branch-action primary"
                        data-action="google"
                        data-url="${mapsUrl}"
                    >
                        🧭 Ir a Google Maps
                    </button>

                </div>
            `;

            branchList.appendChild(
                card
            );
        }
    );

    branchList
        .querySelectorAll(
            '[data-action="map"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const latitude =
                            Number(
                                button.dataset.lat
                            );

                        const longitude =
                            Number(
                                button.dataset.lng
                            );

                        map.setView(
                            [
                                latitude,
                                longitude
                            ],
                            18,
                            {
                                animate: true
                            }
                        );

                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });
                    }
                );
            }
        );

    branchList
        .querySelectorAll(
            '[data-action="google"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        window.open(
                            button.dataset.url,
                            "_blank"
                        );
                    }
                );
            }
        );

    if (
        bounds.length > 0 &&
        !currentPosition
    ) {

        map.fitBounds(
            bounds,
            {
                padding: [
                    30,
                    30
                ]
            }
        );
    }
}

function updateBranchDistances() {

    if (
        !currentPosition
    ) {

        renderBranches();

        attendanceButton.disabled =
            true;

        attendanceStatus.className =
            "attendance-status";

        attendanceStatus.textContent =
            "Activa tu ubicación para comprobar si estás dentro de una sucursal.";

        return;
    }

    renderBranches();

    const validBranches =
        branches
            .map(
                branch => {

                    const latitude =
                        Number(
                            branch.latitud
                        );

                    const longitude =
                        Number(
                            branch.longitud
                        );

                    const distance =
                        calculateDistance(
                            currentPosition.latitude,
                            currentPosition.longitude,
                            latitude,
                            longitude
                        );

                    return {
                        branch,
                        distance
                    };
                }
            )
            .filter(
                item =>
                    Number.isFinite(
                        item.distance
                    )
            )
            .sort(
                (a, b) =>
                    a.distance -
                    b.distance
            );

    if (
        validBranches.length === 0
    ) {

        attendanceButton.disabled =
            true;

        attendanceStatus.className =
            "attendance-status error";

        attendanceStatus.textContent =
            "No existen sucursales con coordenadas válidas.";

        return;
    }

    const nearest =
        validBranches[0];

    const radius =
        Number(
            nearest.branch.radio
        ) || 50;

    const distance =
        nearest.distance;

    const accuracy =
        Number(
            currentPosition.accuracy
        ) || 9999;

    if (
        distance <= radius
    ) {

        if (
            accuracy > radius
        ) {

            attendanceButton.disabled =
                true;

            attendanceStatus.className =
                "attendance-status error";

            attendanceStatus.innerHTML =
                `⚠️ Estás cerca de <strong>${escapeHtml(nearest.branch.nombre)}</strong>, pero el GPS todavía no tiene suficiente precisión.<br>
                Precisión: ${Math.round(accuracy)} m · Radio: ${radius} m.<br>
                Espera unos segundos o muévete a un lugar con mejor señal.`;

            return;
        }

        attendanceButton.disabled =
            false;

        attendanceStatus.className =
            "attendance-status success";

        attendanceStatus.innerHTML =
            `✅ Estás dentro del radio de <strong>${escapeHtml(nearest.branch.nombre)}</strong>.<br>
            Distancia: ${formatDistance(distance)} · Radio permitido: ${radius} m`;

    } else {

        attendanceButton.disabled =
            true;

        attendanceStatus.className =
            "attendance-status error";

        attendanceStatus.innerHTML =
            `❌ Estás fuera del radio de asistencia.<br>
            Sucursal más cercana:
            <strong>${escapeHtml(nearest.branch.nombre)}</strong> ·
            Distancia: ${formatDistance(distance)} ·
            Radio permitido: ${radius} m`;
    }
}

async function loadWorkerProfile() {

    const userReference =
        doc(
            db,
            "users",
            currentUser.uid
        );

    const snapshot =
        await getDoc(
            userReference
        );

    if (
        !snapshot.exists()
    ) {

        window.location.replace(
            "completarPerfil.html"
        );

        return false;
    }

    currentWorkerData =
        snapshot.data();

    if (
        currentWorkerData.estado ===
        "suspendido"
    ) {

        await signOut(
            auth
        );

        window.location.replace(
            "login.html"
        );

        return false;
    }

    if (
        currentWorkerData.rol !==
        "trabajador"
    ) {

        if (
            currentWorkerData.rol ===
            "administrador"
        ) {

            window.location.replace(
                "admin.html"
            );

        } else if (
            currentWorkerData.rol ===
            "gerente"
        ) {

            window.location.replace(
                "gerente.html"
            );

        } else {

            await signOut(
                auth
            );

            window.location.replace(
                "login.html"
            );
        }

        return false;
    }

    workerName.textContent =
        currentWorkerData.nombre ||
        "Trabajador";

    return true;
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

        branches = [];

        snapshot.forEach(
            documentSnapshot => {

                const data =
                    documentSnapshot.data();

                if (
                    data.estado ===
                    "inactivo"
                ) {
                    return;
                }

                branches.push({
                    id:
                        documentSnapshot.id,
                    ...data
                });
            }
        );

        renderBranches();

        if (
            branches.length === 0
        ) {

            mapMessage.textContent =
                "No hay sucursales registradas todavía.";

            mapMessage.classList.remove(
                "hidden"
            );

        } else {

            mapMessage.classList.add(
                "hidden"
            );
        }

    } catch (error) {

        console.error(
            "Error cargando sucursales:",
            error
        );

        mapMessage.textContent =
            "No fue posible cargar las sucursales.";

        mapMessage.classList.remove(
            "hidden"
        );
    }
}

async function loadHistory() {

    historyList.innerHTML = `
        <div class="empty">
            Cargando historial...
        </div>
    `;

    try {

        const attendanceQuery =
            query(
                collection(
                    db,
                    "asistencias"
                ),
                where(
                    "usuarioId",
                    "==",
                    currentUser.uid
                )
            );

        const snapshot =
            await getDocs(
                attendanceQuery
            );

        const records = [];

        snapshot.forEach(
            documentSnapshot => {

                records.push({
                    id:
                        documentSnapshot.id,
                    ...documentSnapshot.data()
                });
            }
        );

        records.sort(
            (a, b) => {

                const dateA =
                    a.fechaHora?.toMillis
                        ? a.fechaHora.toMillis()
                        : 0;

                const dateB =
                    b.fechaHora?.toMillis
                        ? b.fechaHora.toMillis()
                        : 0;

                return dateB - dateA;
            }
        );

        historyTotal.textContent =
            records.length;

        if (
            records.length === 0
        ) {

            historyLast.textContent =
                "--";

            historyList.innerHTML = `
                <div class="empty">
                    📋<br><br>
                    Todavía no tienes asistencias registradas.
                </div>
            `;

            return;
        }

        const lastRecord =
            records[0];

        if (
            lastRecord.fechaHora?.toDate
        ) {

            historyLast.textContent =
                formatDate(
                    lastRecord.fechaHora.toDate()
                );
        }

        historyList.innerHTML = "";

        records.forEach(
            record => {

                let dateText =
                    "Fecha no disponible";

                let timeText =
                    "--:--";

                if (
                    record.fechaHora?.toDate
                ) {

                    const date =
                        record.fechaHora.toDate();

                    dateText =
                        formatDate(date);

                    timeText =
                        formatTime(date);
                }

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "history-card";

                card.innerHTML = `
                    <div class="history-icon">
                        ✓
                    </div>

                    <div class="history-info">

                        <div class="history-branch">
                            ${escapeHtml(
                                record.sucursalNombre ||
                                "Sucursal"
                            )}
                        </div>

                        <div class="history-date">
                            ${dateText}
                        </div>

                        <div class="history-distance">
                            Distancia registrada:
                            ${
                                record.distanciaMetros !== undefined
                                    ? `${record.distanciaMetros} m`
                                    : "--"
                            }
                        </div>

                    </div>

                    <div class="history-time">
                        ${timeText}
                    </div>
                `;

                historyList.appendChild(
                    card
                );
            }
        );

    } catch (error) {

        console.error(
            "Error cargando historial:",
            error
        );

        historyTotal.textContent =
            "0";

        historyLast.textContent =
            "--";

        historyList.innerHTML = `
            <div class="empty">
                No fue posible cargar tu historial.
            </div>
        `;
    }
}

async function checkTodayAttendance() {

    try {

        const attendanceQuery =
            query(
                collection(
                    db,
                    "asistencias"
                ),
                where(
                    "usuarioId",
                    "==",
                    currentUser.uid
                )
            );

        const snapshot =
            await getDocs(
                attendanceQuery
            );

        const today =
            new Date();

        const startOfDay =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                0,
                0,
                0
            );

        const endOfDay =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                23,
                59,
                59
            );

        attendanceAlreadyRegistered =
            false;

        snapshot.forEach(
            documentSnapshot => {

                const data =
                    documentSnapshot.data();

                if (
                    !data.fechaHora?.toDate
                ) {
                    return;
                }

                const date =
                    data.fechaHora.toDate();

                if (
                    date >= startOfDay &&
                    date <= endOfDay
                ) {

                    attendanceAlreadyRegistered =
                        true;
                }
            }
        );

        if (
            attendanceAlreadyRegistered
        ) {

            attendanceButton.disabled =
                true;

            attendanceButton.textContent =
                "✓ Asistencia de hoy registrada";

            attendanceStatus.className =
                "attendance-status success";

            attendanceStatus.textContent =
                "Ya tienes una asistencia registrada el día de hoy.";

        }

    } catch (error) {

        console.error(
            "Error verificando asistencia:",
            error
        );
    }
}

async function takeAttendance() {

    if (
        attendanceAlreadyRegistered
    ) {

        return;
    }

    if (
        !currentPosition
    ) {

        attendanceStatus.className =
            "attendance-status error";

        attendanceStatus.textContent =
            "Primero debes activar tu ubicación.";

        return;
    }

    if (
        branches.length === 0
    ) {

        attendanceStatus.className =
            "attendance-status error";

        attendanceStatus.textContent =
            "Todavía no existen sucursales disponibles.";

        return;
    }

    attendanceButton.disabled =
        true;

    attendanceButton.textContent =
        "Verificando ubicación...";

    try {

        const validBranches =
            branches
                .map(
                    branch => {

                        const latitude =
                            Number(
                                branch.latitud
                            );

                        const longitude =
                            Number(
                                branch.longitud
                            );

                        const distance =
                            calculateDistance(
                                currentPosition.latitude,
                                currentPosition.longitude,
                                latitude,
                                longitude
                            );

                        return {
                            branch,
                            distance
                        };
                    }
                )
                .filter(
                    item =>
                        Number.isFinite(
                            item.distance
                        )
                )
                .sort(
                    (a, b) =>
                        a.distance -
                        b.distance
                );

        if (
            validBranches.length === 0
        ) {

            throw new Error(
                "No existen sucursales válidas."
            );
        }

        const nearest =
            validBranches[0];

        const radius =
            Number(
                nearest.branch.radio
            ) || 50;

        const accuracy =
            Number(
                currentPosition.accuracy
            ) || 9999;

        if (
            nearest.distance >
            radius
        ) {

            attendanceStatus.className =
                "attendance-status error";

            attendanceStatus.innerHTML =
                `❌ No puedes registrar asistencia porque estás fuera del radio permitido de <strong>${escapeHtml(nearest.branch.nombre)}</strong>.<br>
                Distancia: ${formatDistance(nearest.distance)} ·
                Radio permitido: ${radius} m`;

            return;
        }

        if (
            accuracy >
            radius
        ) {

            attendanceStatus.className =
                "attendance-status error";

            attendanceStatus.innerHTML =
                `⚠️ El GPS todavía no tiene suficiente precisión para registrar la asistencia.<br>
                Precisión actual: ${Math.round(accuracy)} m ·
                Radio de la sucursal: ${radius} m`;

            return;
        }

        await addDoc(
            collection(
                db,
                "asistencias"
            ),
            {
                usuarioId:
                    currentUser.uid,

                trabajadorNombre:
                    currentWorkerData.nombre,

                trabajadorCorreo:
                    currentUser.email || "",

                sucursalId:
                    nearest.branch.id,

                sucursalNombre:
                    nearest.branch.nombre,

                latitud:
                    currentPosition.latitude,

                longitud:
                    currentPosition.longitude,

                distanciaMetros:
                    Math.round(
                        nearest.distance
                    ),

                radioPermitido:
                    radius,

                precisionGps:
                    Math.round(
                        currentPosition.accuracy ||
                        0
                    ),

                fechaHora:
                    serverTimestamp()
            }
        );

        attendanceAlreadyRegistered =
            true;

        attendanceStatus.className =
            "attendance-status success";

        attendanceStatus.innerHTML =
            `✅ <strong>Asistencia registrada correctamente.</strong><br>
            ${escapeHtml(
                nearest.branch.nombre
            )} ·
            Distancia:
            ${formatDistance(
                nearest.distance
            )}`;

        attendanceButton.textContent =
            "✓ Asistencia de hoy registrada";

        await loadHistory();

    } catch (error) {

        console.error(
            "Error registrando asistencia:",
            error
        );

        attendanceStatus.className =
            "attendance-status error";

        if (
            error.code ===
            "permission-denied"
        ) {

            attendanceStatus.textContent =
                "Firebase no permite registrar la asistencia. Necesitamos configurar las reglas de seguridad.";

        } else {

            attendanceStatus.textContent =
                "No fue posible registrar la asistencia.";
        }

        attendanceButton.disabled =
            false;

        attendanceButton.textContent =
            "📍 Tomar asistencia";
    }
}

function setupNavigation() {

    document
        .querySelectorAll(
            ".nav-button[data-section]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        document
                            .querySelectorAll(
                                ".nav-button"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        button.classList.add(
                            "active"
                        );

                        document
                            .querySelectorAll(
                                ".section-page"
                            )
                            .forEach(
                                section =>
                                    section.classList.remove(
                                        "active"
                                    )
                            );

                        const section =
                            document.getElementById(
                                button.dataset.section
                            );

                        section.classList.add(
                            "active"
                        );

                        if (
                            button.dataset.section ===
                            "historySection"
                        ) {

                            await loadHistory();
                        }

                        if (
                            button.dataset.section ===
                            "homeSection"
                        ) {

                            setTimeout(
                                () => {

                                    map.invalidateSize();

                                },
                                100
                            );
                        }
                    }
                );
            }
        );

    document
        .getElementById("navLocation")
        .addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".nav-button"
                    )
                    .forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );

                document
                    .querySelector(
                        '[data-section="homeSection"]'
                    )
                    .classList.add(
                        "active"
                    );

                document
                    .querySelectorAll(
                        ".section-page"
                    )
                    .forEach(
                        section =>
                            section.classList.remove(
                                "active"
                            )
                    );

                document
                    .getElementById(
                        "homeSection"
                    )
                    .classList.add(
                        "active"
                    );

                setTimeout(
                    () => {

                        map.invalidateSize();

                        if (
                            currentPosition
                        ) {

                            centerOnUser();

                        } else {

                            activateLocationButton.click();
                        }

                    },
                    100
                );
            }
        );
}

activateLocationButton.addEventListener(
    "click",
    () => {

        startLocationTracking();
    }
);

centerLocationButton.addEventListener(
    "click",
    () => {

        centerOnUser();
    }
);

attendanceButton.addEventListener(
    "click",
    takeAttendance
);

logoutButton.addEventListener(
    "click",
    async () => {

        if (
            locationWatchId !== null
        ) {

            navigator.geolocation.clearWatch(
                locationWatchId
            );

            locationWatchId =
                null;
        }

        await signOut(
            auth
        );

        window.location.replace(
            "login.html"
        );
    }
);

todayDate.textContent =
    formatDate(
        new Date()
    );

initializeMap();

setupNavigation();

async function initializeWorker() {

    try {

        await auth.authStateReady();

        currentUser =
            auth.currentUser;

        if (!currentUser) {

            window.location.replace(
                "login.html"
            );

            return;
        }

        const profileLoaded =
            await loadWorkerProfile();

        if (!profileLoaded) {
            return;
        }

        await loadBranches();

        await loadHistory();

        await checkTodayAttendance();

    } catch (error) {

        console.error(
            "Error iniciando trabajador:",
            error
        );

        window.location.replace(
            "login.html"
        );
    }
}

initializeWorker();