import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let db = null;
let branchMap = null;
let branchMarker = null;
let branchCircle = null;
let branches = [];
let editingBranchId = null;

const branchFormContainer = document.getElementById("branchFormContainer");
const branchForm = document.getElementById("branchForm");
const branchFormTitle = document.getElementById("branchFormTitle");
const branchId = document.getElementById("branchId");
const branchName = document.getElementById("branchName");
const branchAddress = document.getElementById("branchAddress");
const branchLatitude = document.getElementById("branchLatitude");
const branchLongitude = document.getElementById("branchLongitude");
const branchRadius = document.getElementById("branchRadius");
const radiusValue = document.getElementById("radiusValue");
const branchesList = document.getElementById("branchesList");
const branchListCount = document.getElementById("branchListCount");
const addBranchButton = document.getElementById("addBranchButton");
const closeBranchFormButton = document.getElementById("closeBranchFormButton");
const cancelBranchButton = document.getElementById("cancelBranchButton");

function getDefaultLocation() {
    return {
        lat: 16.0133783,
        lng: -97.4326783
    };
}

function updateRadiusDisplay() {
    if (!radiusValue || !branchRadius) {
        return;
    }

    radiusValue.textContent = branchRadius.value;

    updateCircle();
}

function updateCircle() {
    if (!branchMap || !branchMarker || !branchCircle) {
        return;
    }

    const lat = Number(branchLatitude.value);
    const lng = Number(branchLongitude.value);
    const radius = Number(branchRadius.value);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        !Number.isFinite(radius)
    ) {
        return;
    }

    branchMarker.setLatLng([lat, lng]);

    branchCircle.setLatLng([lat, lng]);
    branchCircle.setRadius(radius);

    branchMap.setView(
        [lat, lng],
        branchMap.getZoom()
    );
}

function setCoordinates(lat, lng, center = true) {
    branchLatitude.value = Number(lat).toFixed(7);
    branchLongitude.value = Number(lng).toFixed(7);

    updateCircle();

    if (
        branchMap &&
        center
    ) {
        branchMap.setView(
            [lat, lng],
            17
        );
    }
}

function createMap() {
    const mapElement = document.getElementById("branchMap");

    if (
        !mapElement ||
        typeof L === "undefined"
    ) {
        return;
    }

    if (branchMap) {
        branchMap.invalidateSize();
        return;
    }

    const defaultLocation = getDefaultLocation();

    branchMap = L.map(
        mapElement,
        {
            zoomControl: true,
            attributionControl: true
        }
    ).setView(
        [
            defaultLocation.lat,
            defaultLocation.lng
        ],
        15
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 20,
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(branchMap);

    branchMarker = L.marker(
        [
            defaultLocation.lat,
            defaultLocation.lng
        ],
        {
            draggable: true
        }
    ).addTo(branchMap);

    branchCircle = L.circle(
        [
            defaultLocation.lat,
            defaultLocation.lng
        ],
        {
            radius: Number(branchRadius.value),
            weight: 2,
            fillOpacity: 0.15
        }
    ).addTo(branchMap);

    branchMarker.on(
        "dragend",
        event => {

            const position =
                event.target.getLatLng();

            setCoordinates(
                position.lat,
                position.lng,
                false
            );
        }
    );

    branchMap.on(
        "click",
        event => {

            setCoordinates(
                event.latlng.lat,
                event.latlng.lng
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

function openNewBranchForm() {
    editingBranchId = null;

    branchId.value = "";
    branchName.value = "";
    branchAddress.value = "";

    const defaultLocation =
        getDefaultLocation();

    branchRadius.value = 50;

    setCoordinates(
        defaultLocation.lat,
        defaultLocation.lng,
        false
    );

    branchFormTitle.textContent =
        "Nueva sucursal";

    addBranchButton.classList.add(
        "hidden"
    );

    branchFormContainer.classList.remove(
        "hidden"
    );

    createMap();

    setTimeout(
        () => {

            if (branchMap) {
                branchMap.invalidateSize();
                branchMap.setView(
                    [
                        defaultLocation.lat,
                        defaultLocation.lng
                    ],
                    15
                );
            }

            updateRadiusDisplay();

        },
        100
    );
}

function closeBranchForm() {
    editingBranchId = null;

    branchForm.reset();

    branchRadius.value = 50;

    branchFormContainer.classList.add(
        "hidden"
    );

    addBranchButton.classList.remove(
        "hidden"
    );

    updateRadiusDisplay();
}

function editBranch(branch) {
    editingBranchId = branch.id;

    branchId.value = branch.id;
    branchName.value = branch.nombre || "";
    branchAddress.value = branch.direccion || "";

    branchLatitude.value =
        Number(branch.latitud).toFixed(7);

    branchLongitude.value =
        Number(branch.longitud).toFixed(7);

    branchRadius.value =
        Number(branch.radioPermitido) || 50;

    branchFormTitle.textContent =
        "Editar sucursal";

    addBranchButton.classList.add(
        "hidden"
    );

    branchFormContainer.classList.remove(
        "hidden"
    );

    createMap();

    setTimeout(
        () => {

            if (branchMap) {

                branchMap.invalidateSize();

                branchMap.setView(
                    [
                        Number(branch.latitud),
                        Number(branch.longitud)
                    ],
                    17
                );

            }

            setCoordinates(
                Number(branch.latitud),
                Number(branch.longitud),
                false
            );

            updateRadiusDisplay();

        },
        100
    );
}

async function saveBranch(event) {
    event.preventDefault();

    const nombre =
        branchName.value.trim();

    const direccion =
        branchAddress.value.trim();

    const latitud =
        Number(branchLatitude.value);

    const longitud =
        Number(branchLongitude.value);

    const radioPermitido =
        Number(branchRadius.value);

    if (!nombre) {
        window.AdminApp.notify(
            "Escribe el nombre de la sucursal.",
            "error"
        );

        return;
    }

    if (
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud)
    ) {
        window.AdminApp.notify(
            "Selecciona una ubicación válida en el mapa.",
            "error"
        );

        return;
    }

    if (
        !Number.isFinite(radioPermitido) ||
        radioPermitido < 10
    ) {
        window.AdminApp.notify(
            "El radio permitido no es válido.",
            "error"
        );

        return;
    }

    const saveButton =
        document.getElementById(
            "saveBranchButton"
        );

    saveButton.disabled = true;
    saveButton.textContent =
        "Guardando...";

    try {

        const branchData = {
            nombre,
            direccion,
            latitud,
            longitud,
            radioPermitido,
            estado: "activo",
            fechaActualizacion: serverTimestamp()
        };

        if (editingBranchId) {

            await updateDoc(
                doc(
                    db,
                    "sucursales",
                    editingBranchId
                ),
                branchData
            );

            window.AdminApp.notify(
                "Sucursal actualizada correctamente.",
                "success"
            );

        } else {

            branchData.fechaCreacion =
                serverTimestamp();

            await addDoc(
                collection(
                    db,
                    "sucursales"
                ),
                branchData
            );

            window.AdminApp.notify(
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

        window.AdminApp.notify(
            "No fue posible guardar la sucursal.",
            "error"
        );

    } finally {

        saveButton.disabled = false;

        saveButton.textContent =
            "Guardar sucursal";
    }
}

async function toggleBranch(branch) {
    try {

        const newState =
            branch.estado === "activo"
                ? "inactivo"
                : "activo";

        await updateDoc(
            doc(
                db,
                "sucursales",
                branch.id
            ),
            {
                estado: newState,
                fechaActualizacion:
                    serverTimestamp()
            }
        );

        window.AdminApp.notify(
            newState === "activo"
                ? "Sucursal activada."
                : "Sucursal desactivada.",
            "success"
        );

        await loadBranches();

    } catch (error) {

        console.error(
            "Error cambiando estado:",
            error
        );

        window.AdminApp.notify(
            "No fue posible cambiar el estado.",
            "error"
        );
    }
}

async function deleteBranch(branch) {
    const confirmed =
        confirm(
            `¿Deseas eliminar la sucursal "${branch.nombre}"?\n\nEsta acción no se puede deshacer.`
        );

    if (!confirmed) {
        return;
    }

    try {

        await deleteDoc(
            doc(
                db,
                "sucursales",
                branch.id
            )
        );

        window.AdminApp.notify(
            "Sucursal eliminada correctamente.",
            "success"
        );

        await loadBranches();

    } catch (error) {

        console.error(
            "Error eliminando sucursal:",
            error
        );

        window.AdminApp.notify(
            "No fue posible eliminar la sucursal.",
            "error"
        );
    }
}

function formatDate(timestamp) {
    if (
        !timestamp ||
        typeof timestamp.toDate !== "function"
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

function renderBranches() {
    if (!branchesList) {
        return;
    }

    branchListCount.textContent =
        branches.length;

    if (!branches.length) {

        branchesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📍</div>
                <h3>No hay sucursales</h3>
                <p>Agrega la primera sucursal para comenzar.</p>
            </div>
        `;

        return;
    }

    branchesList.innerHTML =
        branches.map(
            branch => {

                const active =
                    branch.estado !==
                    "inactivo";

                const statusClass =
                    active
                        ? "active"
                        : "inactive";

                const statusText =
                    active
                        ? "Activa"
                        : "Inactiva";

                const latitude =
                    Number(branch.latitud);

                const longitude =
                    Number(branch.longitud);

                const mapsUrl =
                    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

                return `
                    <article class="branch-card ${statusClass}">

                        <div class="branch-card-top">

                            <div class="branch-card-icon">
                                📍
                            </div>

                            <div class="branch-card-title">

                                <h3>
                                    ${escapeHtml(branch.nombre || "Sin nombre")}
                                </h3>

                                <span class="branch-status ${statusClass}">
                                    ${statusText}
                                </span>

                            </div>

                        </div>


                        <div class="branch-card-info">

                            <div>
                                <span>Dirección</span>
                                <strong>
                                    ${escapeHtml(branch.direccion || "Sin dirección")}
                                </strong>
                            </div>

                            <div>
                                <span>Radio permitido</span>
                                <strong>
                                    ${Number(branch.radioPermitido) || 0} m
                                </strong>
                            </div>

                            <div>
                                <span>Coordenadas</span>
                                <strong>
                                    ${latitude.toFixed(6)},
                                    ${longitude.toFixed(6)}
                                </strong>
                            </div>

                            <div>
                                <span>Creada</span>
                                <strong>
                                    ${formatDate(branch.fechaCreacion)}
                                </strong>
                            </div>

                        </div>


                        <div class="branch-card-actions">

                            <button
                                type="button"
                                class="branch-action maps"
                                data-action="maps"
                                data-id="${branch.id}"
                            >
                                🗺️ Ver mapa
                            </button>

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
                                class="branch-action toggle"
                                data-action="toggle"
                                data-id="${branch.id}"
                            >
                                ${active ? "⏸️ Desactivar" : "▶️ Activar"}
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

                    </article>
                `;
            }
        ).join("");

    branchesList
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const action =
                            button.dataset.action;

                        const id =
                            button.dataset.id;

                        const branch =
                            branches.find(
                                item =>
                                    item.id === id
                            );

                        if (!branch) {
                            return;
                        }

                        if (
                            action ===
                            "edit"
                        ) {

                            editBranch(
                                branch
                            );

                        }

                        if (
                            action ===
                            "toggle"
                        ) {

                            toggleBranch(
                                branch
                            );

                        }

                        if (
                            action ===
                            "delete"
                        ) {

                            deleteBranch(
                                branch
                            );

                        }

                        if (
                            action ===
                            "maps"
                        ) {

                            const url =
                                `https://www.google.com/maps/search/?api=1&query=${Number(branch.latitud)},${Number(branch.longitud)}`;

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

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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
            snapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            );

        branches.sort(
            (a, b) => {

                const dateA =
                    a.fechaCreacion?.toDate
                        ? a.fechaCreacion.toDate()
                        : new Date(0);

                const dateB =
                    b.fechaCreacion?.toDate
                        ? b.fechaCreacion.toDate()
                        : new Date(0);

                return dateB - dateA;
            }
        );

        renderBranches();

        const counter =
            document.getElementById(
                "branchesCount"
            );

        if (counter) {

            counter.textContent =
                branches.filter(
                    branch =>
                        branch.estado !==
                        "inactivo"
                ).length;

        }

    } catch (error) {

        console.error(
            "Error cargando sucursales:",
            error
        );

        branchesList.innerHTML = `
            <div class="empty-state error-state">
                <div class="empty-icon">⚠️</div>
                <h3>No fue posible cargar las sucursales</h3>
                <p>Revisa la conexión con Firebase.</p>
            </div>
        `;
    }
}

function setupEvents() {

    addBranchButton.addEventListener(
        "click",
        openNewBranchForm
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
        updateRadiusDisplay
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

                        branchRadius.value =
                            button.dataset.radius;

                        updateRadiusDisplay();

                    }
                );

            }
        );


    branchLatitude.addEventListener(
        "input",
        updateCircle
    );

    branchLongitude.addEventListener(
        "input",
        updateCircle
    );

}

export async function init() {

    db =
        window.AdminFirebase?.db;

    if (!db) {

        console.error(
            "Firebase Firestore no está disponible."
        );

        return;
    }

    setupEvents();

    updateRadiusDisplay();

    await loadBranches();
}

window.AdminSucursales = {

    refreshMap() {

        if (branchMap) {
            branchMap.invalidateSize();
        }

    },

    reload() {
        return loadBranches();
    }

};