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
    updateDoc,
    deleteDoc,
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
let adminData = null;

let branchMap = null;
let branchMarker = null;
let branchCircle = null;

let editingBranchId = null;

let branches = [];

const loadingScreen =
    document.getElementById("loadingScreen");

const appContainer =
    document.getElementById("app");

const adminName =
    document.getElementById("adminName");

const workersCount =
    document.getElementById("workersCount");

const branchesCount =
    document.getElementById("branchesCount");

const attendanceCount =
    document.getElementById("attendanceCount");

const recordsCount =
    document.getElementById("recordsCount");

const logoutButton =
    document.getElementById("logoutButton");

const branchFormContainer =
    document.getElementById("branchFormContainer");

const addBranchButton =
    document.getElementById("addBranchButton");

const closeBranchFormButton =
    document.getElementById("closeBranchFormButton");

const cancelBranchButton =
    document.getElementById("cancelBranchButton");

const branchForm =
    document.getElementById("branchForm");

const branchFormTitle =
    document.getElementById("branchFormTitle");

const branchId =
    document.getElementById("branchId");

const branchName =
    document.getElementById("branchName");

const branchAddress =
    document.getElementById("branchAddress");

const branchLatitude =
    document.getElementById("branchLatitude");

const branchLongitude =
    document.getElementById("branchLongitude");

const branchRadius =
    document.getElementById("branchRadius");

const radiusValue =
    document.getElementById("radiusValue");

const saveBranchButton =
    document.getElementById("saveBranchButton");

const branchesList =
    document.getElementById("branchesList");

const branchListCount =
    document.getElementById("branchListCount");

const notification =
    document.getElementById("notification");

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showNotification(
    message,
    type = "normal"
) {

    notification.textContent =
        message;

    notification.className =
        "notification show";

    if (type === "success") {
        notification.classList.add("success");
    }

    if (type === "error") {
        notification.classList.add("error");
    }

    setTimeout(
        () => {
            notification.classList.remove(
                "show"
            );
        },
        3500
    );
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

function getTodayRange() {

    const now =
        new Date();

    const start =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
            0
        );

    const end =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999
        );

    return {
        start,
        end
    };
}

async function verifyAdministrator() {

    if (!currentUser) {
        return false;
    }

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

    if (!snapshot.exists()) {

        await signOut(auth);

        window.location.replace(
            "login.html"
        );

        return false;
    }

    adminData =
        snapshot.data();

    if (
        adminData.rol !==
        "administrador"
    ) {

        if (
            adminData.rol ===
            "trabajador"
        ) {

            window.location.replace(
                "trabajador.html"
            );

        } else if (
            adminData.rol ===
            "gerente"
        ) {

            window.location.replace(
                "gerente.html"
            );

        } else {

            await signOut(auth);

            window.location.replace(
                "login.html"
            );
        }

        return false;
    }

    if (
        adminData.estado ===
        "suspendido"
    ) {

        await signOut(auth);

        window.location.replace(
            "login.html"
        );

        return false;
    }

    adminName.textContent =
        adminData.nombre ||
        "Administrador";

    return true;
}

function initializeBranchMap() {

    if (branchMap) {
        return;
    }

    branchMap =
        L.map(
            "branchMap",
            {
                zoomControl: false
            }
        ).setView(
            [19.4326, -99.1332],
            5
        );

    L.control.zoom({
        position: "bottomright"
    }).addTo(branchMap);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(branchMap);

    branchMap.on(
        "click",
        event => {

            setBranchLocation(
                event.latlng.lat,
                event.latlng.lng,
                true
            );
        }
    );

    setTimeout(
        () => {
            branchMap.invalidateSize();
        },
        200
    );
}

function setBranchLocation(
    latitude,
    longitude,
    moveMap = false
) {

    const lat =
        Number(latitude);

    const lng =
        Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {
        return;
    }

    branchLatitude.value =
        lat.toFixed(6);

    branchLongitude.value =
        lng.toFixed(6);

    const radius =
        Number(
            branchRadius.value
        ) || 50;

    if (!branchMarker) {

        branchMarker =
            L.marker(
                [lat, lng],
                {
                    draggable: true
                }
            )
            .addTo(branchMap);

        branchMarker.on(
            "dragend",
            () => {

                const position =
                    branchMarker.getLatLng();

                setBranchLocation(
                    position.lat,
                    position.lng,
                    false
                );
            }
        );

    } else {

        branchMarker.setLatLng(
            [lat, lng]
        );
    }

    if (!branchCircle) {

        branchCircle =
            L.circle(
                [lat, lng],
                {
                    radius,
                    color: "#ff9d00",
                    fillColor: "#ff9d00",
                    fillOpacity: 0.16,
                    weight: 2
                }
            ).addTo(branchMap);

    } else {

        branchCircle.setLatLng(
            [lat, lng]
        );

        branchCircle.setRadius(
            radius
        );
    }

    if (moveMap) {

        branchMap.setView(
            [lat, lng],
            17,
            {
                animate: true
            }
        );
    }
}

function updateRadius() {

    const radius =
        Number(
            branchRadius.value
        ) || 50;

    radiusValue.textContent =
        radius;

    if (branchCircle) {

        branchCircle.setRadius(
            radius
        );
    }
}

function clearMapMarker() {

    if (
        branchMarker &&
        branchMap
    ) {

        branchMap.removeLayer(
            branchMarker
        );

        branchMarker =
            null;
    }

    if (
        branchCircle &&
        branchMap
    ) {

        branchMap.removeLayer(
            branchCircle
        );

        branchCircle =
            null;
    }
}

function openBranchForm(
    branch = null
) {

    branchFormContainer.classList.remove(
        "hidden"
    );

    initializeBranchMap();

    clearMapMarker();

    if (branch) {

        editingBranchId =
            branch.id;

        branchId.value =
            branch.id;

        branchFormTitle.textContent =
            "Editar sucursal";

        saveBranchButton.textContent =
            "Guardar cambios";

        branchName.value =
            branch.nombre ||
            "";

        branchAddress.value =
            branch.direccion ||
            "";

        branchLatitude.value =
            branch.latitud ??
            "";

        branchLongitude.value =
            branch.longitud ??
            "";

        branchRadius.value =
            Number(
                branch.radio
            ) || 50;

    } else {

        editingBranchId =
            null;

        branchId.value =
            "";

        branchFormTitle.textContent =
            "Nueva sucursal";

        saveBranchButton.textContent =
            "Guardar sucursal";

        branchForm.reset();

        branchRadius.value =
            50;
    }

    updateRadius();

    const latitude =
        Number(
            branchLatitude.value
        );

    const longitude =
        Number(
            branchLongitude.value
        );

    if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
    ) {

        setBranchLocation(
            latitude,
            longitude,
            true
        );

    } else {

        branchMap.setView(
            [19.4326, -99.1332],
            5
        );
    }

    setTimeout(
        () => {

            branchMap.invalidateSize();

        },
        150
    );

    branchFormContainer.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function closeBranchForm() {

    branchFormContainer.classList.add(
        "hidden"
    );

    editingBranchId =
        null;

    branchForm.reset();

    branchRadius.value =
        50;

    radiusValue.textContent =
        "50";

    clearMapMarker();
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

                branches.push({
                    id:
                        documentSnapshot.id,
                    ...documentSnapshot.data()
                });
            }
        );

        branches.sort(
            (a, b) => {

                const nameA =
                    String(
                        a.nombre || ""
                    ).toLowerCase();

                const nameB =
                    String(
                        b.nombre || ""
                    ).toLowerCase();

                return nameA.localeCompare(
                    nameB
                );
            }
        );

        renderBranches();

        branchesCount.textContent =
            branches.filter(
                branch =>
                    branch.estado !==
                    "inactivo"
            ).length;

    } catch (error) {

        console.error(
            "Error cargando sucursales:",
            error
        );

        showNotification(
            "No fue posible cargar las sucursales.",
            "error"
        );
    }
}

function renderBranches() {

    branchListCount.textContent =
        branches.length;

    if (
        branches.length === 0
    ) {

        branchesList.innerHTML = `
            <div class="no-branches">

                <div class="no-branches-icon">
                    📍
                </div>

                <h3>
                    No hay sucursales
                </h3>

                <p>
                    Crea la primera sucursal para que los trabajadores puedan verla en su mapa y registrar asistencia dentro del radio permitido.
                </p>

            </div>
        `;

        return;
    }

    branchesList.innerHTML = "";

    branches.forEach(
        branch => {

            const isActive =
                branch.estado !==
                "inactivo";

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                `branch-card ${
                    isActive
                        ? ""
                        : "inactive"
                }`;

            const latitude =
                Number(
                    branch.latitud
                );

            const longitude =
                Number(
                    branch.longitud
                );

            card.innerHTML = `
                <div class="branch-card-top">

                    <div class="branch-card-icon">
                        📍
                    </div>

                    <div class="branch-card-main">

                        <h3>
                            ${escapeHtml(
                                branch.nombre ||
                                "Sin nombre"
                            )}
                        </h3>

                        <p>
                            ${
                                branch.direccion
                                    ? escapeHtml(
                                        branch.direccion
                                    )
                                    : "Sin dirección registrada"
                            }
                        </p>

                    </div>

                    <span class="branch-status ${
                        isActive
                            ? ""
                            : "inactive"
                    }">

                        ${
                            isActive
                                ? "Activa"
                                : "Inactiva"
                        }

                    </span>

                </div>

                <div class="branch-details">

                    <div class="branch-detail">

                        <span>
                            Radio
                        </span>

                        <strong>
                            ${Number(
                                branch.radio
                            ) || 50} m
                        </strong>

                    </div>

                    <div class="branch-detail">

                        <span>
                            Latitud
                        </span>

                        <strong>
                            ${
                                Number.isFinite(
                                    latitude
                                )
                                    ? latitude.toFixed(5)
                                    : "--"
                            }
                        </strong>

                    </div>

                    <div class="branch-detail">

                        <span>
                            Longitud
                        </span>

                        <strong>
                            ${
                                Number.isFinite(
                                    longitude
                                )
                                    ? longitude.toFixed(5)
                                    : "--"
                            }
                        </strong>

                    </div>

                </div>

                <div class="branch-actions">

                    <button
                        type="button"
                        class="branch-action edit"
                        data-action="edit"
                        data-id="${branch.id}"
                    >
                        ✏️ Editar
                    </button>

                    <button
                        type="button"
                        class="branch-action toggle ${
                            isActive
                                ? ""
                                : "inactive"
                        }"
                        data-action="toggle"
                        data-id="${branch.id}"
                    >

                        ${
                            isActive
                                ? "⏸️ Desactivar"
                                : "▶️ Activar"
                        }

                    </button>

                    <button
                        type="button"
                        class="branch-action delete"
                        data-action="delete"
                        data-id="${branch.id}"
                    >
                        🗑️ Eliminar
                    </button>

                </div>
            `;

            branchesList.appendChild(
                card
            );
        }
    );
}

function getBranchById(
    id
) {

    return branches.find(
        branch =>
            branch.id === id
    );
}

async function saveBranch(
    event
) {

    event.preventDefault();

    const name =
        branchName.value.trim();

    const address =
        branchAddress.value.trim();

    const latitude =
        Number(
            branchLatitude.value
        );

    const longitude =
        Number(
            branchLongitude.value
        );

    const radius =
        Number(
            branchRadius.value
        );

    if (!name) {

        showNotification(
            "Escribe el nombre de la sucursal.",
            "error"
        );

        branchName.focus();

        return;
    }

    if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
    ) {

        showNotification(
            "La latitud no es válida.",
            "error"
        );

        branchLatitude.focus();

        return;
    }

    if (
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {

        showNotification(
            "La longitud no es válida.",
            "error"
        );

        branchLongitude.focus();

        return;
    }

    if (
        !Number.isFinite(radius) ||
        radius < 10 ||
        radius > 500
    ) {

        showNotification(
            "El radio debe estar entre 10 y 500 metros.",
            "error"
        );

        return;
    }

    saveBranchButton.disabled =
        true;

    saveBranchButton.textContent =
        editingBranchId
            ? "Guardando..."
            : "Creando...";

    try {

        const branchData = {
            nombre: name,
            direccion: address,
            latitud: latitude,
            longitud: longitude,
            radio: radius,
            estado: "activo",
            actualizadoPor:
                currentUser.uid,
            fechaActualizacion:
                serverTimestamp()
        };

        if (
            editingBranchId
        ) {

            await updateDoc(
                doc(
                    db,
                    "sucursales",
                    editingBranchId
                ),
                branchData
            );

            showNotification(
                "Sucursal actualizada correctamente.",
                "success"
            );

        } else {

            await addDoc(
                collection(
                    db,
                    "sucursales"
                ),
                {
                    ...branchData,
                    creadoPor:
                        currentUser.uid,
                    fechaCreacion:
                        serverTimestamp()
                }
            );

            showNotification(
                "Sucursal creada correctamente.",
                "success"
            );
        }

        closeBranchForm();

        await loadBranches();

    } catch (error) {

        console.error(
            "Error guardando sucursal:",
            error
        );

        if (
            error.code ===
            "permission-denied"
        ) {

            showNotification(
                "Firebase rechazó la operación. Necesitamos revisar las reglas de Firestore.",
                "error"
            );

        } else {

            showNotification(
                "No fue posible guardar la sucursal.",
                "error"
            );
        }

    } finally {

        saveBranchButton.disabled =
            false;

        saveBranchButton.textContent =
            editingBranchId
                ? "Guardar cambios"
                : "Guardar sucursal";
    }
}

async function toggleBranch(
    id
) {

    const branch =
        getBranchById(id);

    if (!branch) {
        return;
    }

    const currentlyActive =
        branch.estado !==
        "inactivo";

    const newState =
        currentlyActive
            ? "inactivo"
            : "activo";

    const actionText =
        currentlyActive
            ? "desactivar"
            : "activar";

    const confirmed =
        window.confirm(
            `¿Seguro que deseas ${actionText} la sucursal "${branch.nombre}"?`
        );

    if (!confirmed) {
        return;
    }

    try {

        await updateDoc(
            doc(
                db,
                "sucursales",
                id
            ),
            {
                estado:
                    newState,
                actualizadoPor:
                    currentUser.uid,
                fechaActualizacion:
                    serverTimestamp()
            }
        );

        showNotification(
            currentlyActive
                ? "Sucursal desactivada."
                : "Sucursal activada.",
            "success"
        );

        await loadBranches();

    } catch (error) {

        console.error(
            "Error cambiando estado:",
            error
        );

        showNotification(
            "No fue posible cambiar el estado de la sucursal.",
            "error"
        );
    }
}

async function deleteBranch(
    id
) {

    const branch =
        getBranchById(id);

    if (!branch) {
        return;
    }

    const confirmed =
        window.confirm(
            `¿Seguro que deseas ELIMINAR la sucursal "${branch.nombre}"?\n\nEsta acción no se puede deshacer.`
        );

    if (!confirmed) {
        return;
    }

    try {

        await deleteDoc(
            doc(
                db,
                "sucursales",
                id
            )
        );

        showNotification(
            "Sucursal eliminada correctamente.",
            "success"
        );

        await loadBranches();

    } catch (error) {

        console.error(
            "Error eliminando sucursal:",
            error
        );

        showNotification(
            "No fue posible eliminar la sucursal.",
            "error"
        );
    }
}

function setupBranchActions() {

    branchesList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset.action;

            const id =
                button.dataset.id;

            if (
                action ===
                "edit"
            ) {

                const branch =
                    getBranchById(id);

                if (branch) {

                    openBranchForm(
                        branch
                    );
                }

            }

            if (
                action ===
                "toggle"
            ) {

                toggleBranch(
                    id
                );
            }

            if (
                action ===
                "delete"
            ) {

                deleteBranch(
                    id
                );
            }
        }
    );
}

async function loadDashboardStats() {

    try {

        const usersSnapshot =
            await getDocs(
                collection(
                    db,
                    "users"
                )
            );

        let workers =
            0;

        usersSnapshot.forEach(
            documentSnapshot => {

                const data =
                    documentSnapshot.data();

                if (
                    data.rol ===
                    "trabajador" &&
                    data.estado !==
                    "suspendido"
                ) {

                    workers++;
                }
            }
        );

        workersCount.textContent =
            workers;

    } catch (error) {

        console.error(
            "Error contando trabajadores:",
            error
        );
    }

    try {

        const branchesSnapshot =
            await getDocs(
                collection(
                    db,
                    "sucursales"
                )
            );

        let activeBranches =
            0;

        branchesSnapshot.forEach(
            documentSnapshot => {

                const data =
                    documentSnapshot.data();

                if (
                    data.estado !==
                    "inactivo"
                ) {

                    activeBranches++;
                }
            }
        );

        branchesCount.textContent =
            activeBranches;

    } catch (error) {

        console.error(
            "Error contando sucursales:",
            error
        );
    }

    try {

        const attendanceSnapshot =
            await getDocs(
                collection(
                    db,
                    "asistencias"
                )
            );

        const {
            start,
            end
        } =
            getTodayRange();

        let today =
            0;

        attendanceSnapshot.forEach(
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
                    date >= start &&
                    date <= end
                ) {

                    today++;
                }
            }
        );

        attendanceCount.textContent =
            today;

        recordsCount.textContent =
            attendanceSnapshot.size;

    } catch (error) {

        console.error(
            "Error contando asistencias:",
            error
        );
    }
}

function setupNavigation() {

    const navigationButtons =
        document.querySelectorAll(
            ".nav-item[data-section]"
        );

    const quickButtons =
        document.querySelectorAll(
            ".quick-card[data-section]"
        );

    function activateSection(
        sectionName
    ) {

        document
            .querySelectorAll(
                ".app-section"
            )
            .forEach(
                section => {

                    section.classList.remove(
                        "active"
                    );
                }
            );

        const target =
            document.getElementById(
                `section${
                    sectionName
                        .charAt(0)
                        .toUpperCase()
                    + sectionName.slice(1)
                }`
            );

        if (target) {

            target.classList.add(
                "active"
            );
        }

        navigationButtons.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.section ===
                    sectionName
                );
            }
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        if (
            sectionName ===
            "sucursales"
        ) {

            setTimeout(
                () => {

                    if (branchMap) {

                        branchMap.invalidateSize();
                    }

                },
                150
            );
        }
    }

    navigationButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    activateSection(
                        button.dataset.section
                    );
                }
            );
        }
    );

    quickButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    activateSection(
                        button.dataset.section
                    );
                }
            );
        }
    );
}

function setupEvents() {

    addBranchButton.addEventListener(
        "click",
        () => {

            openBranchForm();
        }
    );

    closeBranchFormButton.addEventListener(
        "click",
        closeBranchForm
    );

    cancelBranchButton.addEventListener(
        "click",
        closeBranchForm
    );

    branchForm.addEventListener(
        "submit",
        saveBranch
    );

    branchRadius.addEventListener(
        "input",
        updateRadius
    );

    document
        .querySelectorAll(
            ".radius-preset"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const radius =
                            Number(
                                button.dataset.radius
                            );

                        branchRadius.value =
                            radius;

                        updateRadius();
                    }
                );
            }
        );

    branchLatitude.addEventListener(
        "change",
        () => {

            setBranchLocation(
                branchLatitude.value,
                branchLongitude.value,
                true
            );
        }
    );

    branchLongitude.addEventListener(
        "change",
        () => {

            setBranchLocation(
                branchLatitude.value,
                branchLongitude.value,
                true
            );
        }
    );

    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                await signOut(
                    auth
                );

                window.location.replace(
                    "login.html"
                );

            } catch (error) {

                console.error(
                    "Error cerrando sesión:",
                    error
                );
            }
        }
    );

    setupBranchActions();

    setupNavigation();
}

async function initializeAdmin() {

    try {

        const validAdmin =
            await verifyAdministrator();

        if (!validAdmin) {
            return;
        }

        await loadBranches();

        await loadDashboardStats();

        loadingScreen.classList.add(
            "hidden"
        );

        appContainer.classList.remove(
            "hidden"
        );

    } catch (error) {

        console.error(
            "Error inicializando administrador:",
            error
        );

        await signOut(
            auth
        );

        window.location.replace(
            "login.html"
        );
    }
}

setupEvents();

onAuthStateChanged(
    auth,
    async user => {

        currentUser =
            user;

        if (!user) {

            window.location.replace(
                "login.html"
            );

            return;
        }

        await initializeAdmin();
    }
);