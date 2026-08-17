import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let db = null;

async function countWorkers() {
    try {
        const snapshot = await getDocs(
            collection(db, "users")
        );

        let total = 0;

        snapshot.forEach(item => {
            const data = item.data();

            if (
                data.rol === "trabajador" &&
                data.estado !== "suspendido"
            ) {
                total++;
            }
        });

        return total;

    } catch (error) {
        console.error(
            "Error contando trabajadores:",
            error
        );

        return 0;
    }
}

async function countBranches() {
    try {
        const snapshot = await getDocs(
            collection(db, "sucursales")
        );

        let total = 0;

        snapshot.forEach(item => {
            const data = item.data();

            if (
                data.estado !== "inactivo"
            ) {
                total++;
            }
        });

        return total;

    } catch (error) {
        console.error(
            "Error contando sucursales:",
            error
        );

        return 0;
    }
}

async function getAttendanceData() {
    try {
        const snapshot = await getDocs(
            collection(db, "asistencias")
        );

        const now = new Date();

        const year =
            now.getFullYear();

        const month =
            now.getMonth();

        const day =
            now.getDate();

        let today = 0;

        snapshot.forEach(item => {
            const data = item.data();

            if (
                !data.fechaHora ||
                typeof data.fechaHora.toDate !== "function"
            ) {
                return;
            }

            const date =
                data.fechaHora.toDate();

            if (
                date.getFullYear() === year &&
                date.getMonth() === month &&
                date.getDate() === day
            ) {
                today++;
            }
        });

        return {
            total: snapshot.size,
            today
        };

    } catch (error) {
        console.error(
            "Error contando asistencias:",
            error
        );

        return {
            total: 0,
            today: 0
        };
    }
}

function updateElement(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

async function loadStatistics() {
    const [
        workers,
        branches,
        attendance
    ] = await Promise.all([
        countWorkers(),
        countBranches(),
        getAttendanceData()
    ]);

    updateElement(
        "workersCount",
        workers
    );

    updateElement(
        "branchesCount",
        branches
    );

    updateElement(
        "attendanceCount",
        attendance.today
    );

    updateElement(
        "recordsCount",
        attendance.total
    );
}

export async function init() {
    db =
        window.AdminFirebase?.db;

    if (!db) {
        console.error(
            "Firestore no está disponible para inicio."
        );

        return;
    }

    await loadStatistics();
}

window.AdminInicio = {
    reload() {
        return loadStatistics();
    }
};