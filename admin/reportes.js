import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let db = null;
let attendances = [];
let filteredAttendances = [];

let startDateInput = null;
let endDateInput = null;
let branchSelect = null;
let reportCount = null;
let reportPreview = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getDate(timestamp) {
    if (
        timestamp &&
        typeof timestamp.toDate === "function"
    ) {
        return timestamp.toDate();
    }

    return null;
}

function formatDate(timestamp) {
    const date =
        getDate(timestamp);

    if (!date) {
        return "Sin fecha";
    }

    return date.toLocaleDateString(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function formatTime(timestamp) {
    const date =
        getDate(timestamp);

    if (!date) {
        return "Sin hora";
    }

    return date.toLocaleTimeString(
        "es-MX",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function formatDateForInput(date) {
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

    return `${year}-${month}-${day}`;
}

function getToday() {
    return formatDateForInput(
        new Date()
    );
}

function createInterface() {
    const module =
        document.getElementById(
            "reportsModule"
        );

    if (!module) {
        return;
    }

    module.innerHTML = `
        <div class="reports-toolbar">

            <div class="report-filter-grid">

                <div class="filter-field">

                    <label for="reportStartDate">
                        Desde
                    </label>

                    <input
                        id="reportStartDate"
                        type="date"
                    >

                </div>


                <div class="filter-field">

                    <label for="reportEndDate">
                        Hasta
                    </label>

                    <input
                        id="reportEndDate"
                        type="date"
                    >

                </div>


                <div class="filter-field report-branch-field">

                    <label for="reportBranch">
                        Sucursal
                    </label>

                    <select id="reportBranch">

                        <option value="">
                            Todas las sucursales
                        </option>

                    </select>

                </div>

            </div>


            <div class="report-actions">

                <button
                    id="generateReport"
                    type="button"
                    class="primary-action"
                >
                    📊 Generar reporte
                </button>

                <button
                    id="clearReport"
                    type="button"
                    class="secondary-action"
                >
                    Limpiar
                </button>

            </div>

        </div>


        <div class="report-summary">

            <div class="report-summary-icon">
                📋
            </div>

            <div>

                <span>
                    Registros encontrados
                </span>

                <strong id="reportCount">
                    0
                </strong>

            </div>

        </div>


        <div class="report-export-title">

            <div>

                <span class="section-eyebrow">
                    Exportar
                </span>

                <h3>
                    Descargar información
                </h3>

            </div>

        </div>


        <div class="report-export-grid">

            <button
                type="button"
                class="report-export-button"
                data-export="excel"
            >

                <span>
                    📊
                </span>

                <strong>
                    Excel
                </strong>

                <small>
                    Archivo .xlsx
                </small>

            </button>


            <button
                type="button"
                class="report-export-button"
                data-export="pdf"
            >

                <span>
                    📄
                </span>

                <strong>
                    PDF
                </strong>

                <small>
                    Documento PDF
                </small>

            </button>


            <button
                type="button"
                class="report-export-button"
                data-export="image"
            >

                <span>
                    🖼️
                </span>

                <strong>
                    Imagen
                </strong>

                <small>
                    Imagen PNG
                </small>

            </button>

        </div>


        <div class="report-preview-header">

            <div>

                <span class="section-eyebrow">
                    Vista previa
                </span>

                <h3>
                    Registros incluidos
                </h3>

            </div>

        </div>


        <div
            id="reportPreview"
            class="report-preview"
        ></div>

    `;

    startDateInput =
        document.getElementById(
            "reportStartDate"
        );

    endDateInput =
        document.getElementById(
            "reportEndDate"
        );

    branchSelect =
        document.getElementById(
            "reportBranch"
        );

    reportCount =
        document.getElementById(
            "reportCount"
        );

    reportPreview =
        document.getElementById(
            "reportPreview"
        );

    startDateInput.value =
        getToday();

    endDateInput.value =
        getToday();
}

async function loadAttendances() {
    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "asistencias"
                )
            );

        attendances =
            snapshot.docs.map(
                item => ({
                    id: item.id,
                    ...item.data()
                })
            );

        attendances.sort(
            (a, b) => {

                const dateA =
                    getDate(
                        a.fechaHora
                    );

                const dateB =
                    getDate(
                        b.fechaHora
                    );

                if (!dateA) {
                    return 1;
                }

                if (!dateB) {
                    return -1;
                }

                return dateB - dateA;
            }
        );

        loadBranches();

        applyFilters();

    } catch (error) {

        console.error(
            "Error cargando datos para reportes:",
            error
        );

        window.AdminApp.notify(
            "No fue posible cargar los datos para los reportes.",
            "error"
        );
    }
}

function loadBranches() {
    const branches =
        new Set();

    attendances.forEach(
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

    const sorted =
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

    sorted.forEach(
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
    const startValue =
        startDateInput.value;

    const endValue =
        endDateInput.value;

    const selectedBranch =
        branchSelect.value;

    let startDate =
        startValue
            ? new Date(
                `${startValue}T00:00:00`
            )
            : null;

    let endDate =
        endValue
            ? new Date(
                `${endValue}T23:59:59.999`
            )
            : null;

    if (
        startDate &&
        endDate &&
        startDate > endDate
    ) {

        const temporary =
            startDate;

        startDate =
            endDate;

        endDate =
            temporary;
    }

    filteredAttendances =
        attendances.filter(
            attendance => {

                const date =
                    getDate(
                        attendance.fechaHora
                    );

                if (!date) {
                    return false;
                }

                if (
                    startDate &&
                    date < startDate
                ) {
                    return false;
                }

                if (
                    endDate &&
                    date > endDate
                ) {
                    return false;
                }

                if (
                    selectedBranch &&
                    attendance.sucursalNombre !==
                    selectedBranch
                ) {
                    return false;
                }

                return true;
            }
        );

    renderPreview();
}

function renderPreview() {
    reportCount.textContent =
        filteredAttendances.length;

    if (
        !filteredAttendances.length
    ) {

        reportPreview.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    📋
                </div>

                <h3>
                    No hay registros
                </h3>

                <p>
                    Ajusta las fechas o la sucursal para encontrar asistencias.
                </p>

            </div>
        `;

        return;
    }

    reportPreview.innerHTML =
        filteredAttendances
            .slice(0, 30)
            .map(
                attendance => {

                    const distance =
                        Number(
                            attendance.distanciaMetros
                        );

                    return `
                        <div class="report-preview-row">

                            <div class="report-preview-main">

                                <strong>
                                    ${escapeHtml(
                                        attendance.trabajadorNombre ||
                                        "Sin nombre"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        attendance.sucursalNombre ||
                                        "Sin sucursal"
                                    )}
                                </span>

                            </div>


                            <div class="report-preview-data">

                                <span>
                                    ${formatDate(
                                        attendance.fechaHora
                                    )}
                                </span>

                                <span>
                                    ${formatTime(
                                        attendance.fechaHora
                                    )}
                                </span>

                                <span>
                                    ${
                                        Number.isFinite(
                                            distance
                                        )
                                            ? `${Math.round(distance)} m`
                                            : "--"
                                    }
                                </span>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");

    if (
        filteredAttendances.length > 30
    ) {

        reportPreview.innerHTML += `
            <div class="report-more">

                Mostrando los primeros 30 registros.
                El archivo de exportación incluirá
                los ${filteredAttendances.length} registros.

            </div>
        `;
    }
}

function getReportRows() {
    return filteredAttendances.map(
        attendance => {

            const distance =
                Number(
                    attendance.distanciaMetros
                );

            const radius =
                Number(
                    attendance.radioPermitido
                );

            const precision =
                Number(
                    attendance.precisionGps
                );

            return {
                Trabajador:
                    attendance.trabajadorNombre ||
                    "",

                Correo:
                    attendance.trabajadorCorreo ||
                    "",

                Sucursal:
                    attendance.sucursalNombre ||
                    "",

                Fecha:
                    formatDate(
                        attendance.fechaHora
                    ),

                Hora:
                    formatTime(
                        attendance.fechaHora
                    ),

                Distancia:
                    Number.isFinite(
                        distance
                    )
                        ? Math.round(distance)
                        : "",

                "Radio permitido":
                    Number.isFinite(
                        radius
                    )
                        ? Math.round(radius)
                        : "",

                "Precisión GPS":
                    Number.isFinite(
                        precision
                    )
                        ? Math.round(precision)
                        : "",

                Latitud:
                    attendance.latitud ||
                    "",

                Longitud:
                    attendance.longitud ||
                    ""
            };
        }
    );
}

function exportExcel() {
    if (
        !filteredAttendances.length
    ) {

        window.AdminApp.notify(
            "No hay registros para exportar.",
            "error"
        );

        return;
    }

    if (
        typeof XLSX ===
        "undefined"
    ) {

        window.AdminApp.notify(
            "La librería de Excel todavía no está disponible.",
            "error"
        );

        return;
    }

    const rows =
        getReportRows();

    const worksheet =
        XLSX.utils.json_to_sheet(
            rows
        );

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Asistencias"
    );

    const today =
        getToday();

    XLSX.writeFile(
        workbook,
        `asistencias_${today}.xlsx`
    );

    window.AdminApp.notify(
        "Excel generado correctamente.",
        "success"
    );
}

function exportPDF() {
    if (
        !filteredAttendances.length
    ) {

        window.AdminApp.notify(
            "No hay registros para exportar.",
            "error"
        );

        return;
    }

    if (
        typeof window.jspdf ===
        "undefined"
    ) {

        window.AdminApp.notify(
            "La librería PDF todavía no está disponible.",
            "error"
        );

        return;
    }

    const {
        jsPDF
    } =
        window.jspdf;

    const pdf =
        new jsPDF(
            "landscape",
            "mm",
            "a4"
        );

    const rows =
        getReportRows();

    const headers =
        Object.keys(
            rows[0]
        );

    pdf.setFontSize(
        16
    );

    pdf.text(
        "Reporte de asistencias",
        14,
        15
    );

    pdf.setFontSize(
        9
    );

    pdf.text(
        `Registros: ${rows.length}`,
        14,
        22
    );

    if (
        typeof pdf.autoTable ===
        "function"
    ) {

        pdf.autoTable({
            head: [headers],
            body: rows.map(
                row =>
                    headers.map(
                        header =>
                            String(
                                row[header] ??
                                ""
                            )
                    )
            ),
            startY: 27,
            styles: {
                fontSize: 7
            },
            headStyles: {
                fillColor: [
                    255,
                    157,
                    0
                ],
                textColor: [
                    0,
                    0,
                    0
                ]
            }
        });

    } else {

        let y = 32;

        rows.forEach(
            row => {

                const line =
                    headers
                        .map(
                            header =>
                                `${header}: ${row[header]}`
                        )
                        .join(" | ");

                const lines =
                    pdf.splitTextToSize(
                        line,
                        270
                    );

                pdf.text(
                    lines,
                    14,
                    y
                );

                y +=
                    7 *
                    lines.length;

                if (
                    y > 190
                ) {

                    pdf.addPage(
                        "landscape"
                    );

                    y = 15;
                }
            }
        );
    }

    pdf.save(
        `asistencias_${getToday()}.pdf`
    );

    window.AdminApp.notify(
        "PDF generado correctamente.",
        "success"
    );
}

function exportImage() {
    if (
        !filteredAttendances.length
    ) {

        window.AdminApp.notify(
            "No hay registros para exportar.",
            "error"
        );

        return;
    }

    if (
        typeof html2canvas ===
        "undefined"
    ) {

        window.AdminApp.notify(
            "La librería de imágenes todavía no está disponible.",
            "error"
        );

        return;
    }

    const exportContainer =
        document.createElement(
            "div"
        );

    exportContainer.style.position =
        "fixed";

    exportContainer.style.left =
        "-100000px";

    exportContainer.style.top =
        "0";

    exportContainer.style.width =
        "1000px";

    exportContainer.style.padding =
        "35px";

    exportContainer.style.background =
        "#ffffff";

    exportContainer.style.color =
        "#111111";

    exportContainer.style.fontFamily =
        "Arial, sans-serif";

    const rows =
        getReportRows();

    exportContainer.innerHTML = `
        <div style="
            font-size:28px;
            font-weight:800;
            margin-bottom:10px;
        ">
            Corporación La Sureña
        </div>

        <div style="
            font-size:22px;
            font-weight:700;
            margin-bottom:8px;
        ">
            Reporte de asistencias
        </div>

        <div style="
            font-size:14px;
            margin-bottom:20px;
        ">
            Registros: ${rows.length}
        </div>

        <table style="
            width:100%;
            border-collapse:collapse;
            font-size:13px;
        ">

            <thead>

                <tr>

                    ${Object.keys(rows[0])
                        .map(
                            header => `
                                <th style="
                                    padding:10px;
                                    border:1px solid #cccccc;
                                    background:#ff9d00;
                                    text-align:left;
                                ">
                                    ${escapeHtml(header)}
                                </th>
                            `
                        )
                        .join("")}

                </tr>

            </thead>

            <tbody>

                ${rows
                    .map(
                        row => `
                            <tr>

                                ${Object.values(row)
                                    .map(
                                        value => `
                                            <td style="
                                                padding:9px;
                                                border:1px solid #cccccc;
                                            ">
                                                ${escapeHtml(value)}
                                            </td>
                                        `
                                    )
                                    .join("")}

                            </tr>
                        `
                    )
                    .join("")}

            </tbody>

        </table>
    `;

    document.body.appendChild(
        exportContainer
    );

    html2canvas(
        exportContainer,
        {
            scale: 2,
            backgroundColor:
                "#ffffff"
        }
    )
        .then(
            canvas => {

                const link =
                    document.createElement(
                        "a"
                    );

                link.download =
                    `asistencias_${getToday()}.png`;

                link.href =
                    canvas.toDataURL(
                        "image/png"
                    );

                link.click();

                exportContainer.remove();

                window.AdminApp.notify(
                    "Imagen generada correctamente.",
                    "success"
                );

            }
        )
        .catch(
            error => {

                console.error(
                    "Error generando imagen:",
                    error
                );

                exportContainer.remove();

                window.AdminApp.notify(
                    "No fue posible generar la imagen.",
                    "error"
                );
            }
        );
}

function setupEvents() {

    startDateInput.addEventListener(
        "change",
        applyFilters
    );

    endDateInput.addEventListener(
        "change",
        applyFilters
    );

    branchSelect.addEventListener(
        "change",
        applyFilters
    );


    document
        .getElementById(
            "generateReport"
        )
        .addEventListener(
            "click",
            applyFilters
        );


    document
        .getElementById(
            "clearReport"
        )
        .addEventListener(
            "click",
            () => {

                startDateInput.value =
                    "";

                endDateInput.value =
                    "";

                branchSelect.value =
                    "";

                applyFilters();

            }
        );


    document
        .querySelectorAll(
            "[data-export]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const type =
                            button.dataset.export;

                        if (
                            type ===
                            "excel"
                        ) {

                            exportExcel();

                        }

                        if (
                            type ===
                            "pdf"
                        ) {

                            exportPDF();

                        }

                        if (
                            type ===
                            "image"
                        ) {

                            exportImage();

                        }

                    }
                );

            }
        );
}

export async function init() {

    db =
        window.AdminFirebase?.db;

    if (!db) {

        console.error(
            "Firestore no está disponible para reportes."
        );

        return;
    }

    createInterface();

    setupEvents();

    await loadAttendances();
}

window.AdminReportes = {

    reload() {
        return loadAttendances();
    },

    getFiltered() {
        return filteredAttendances;
    }

};