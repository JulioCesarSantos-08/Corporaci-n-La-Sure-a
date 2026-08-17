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
    getDocs
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


const app =
    initializeApp(
        firebaseConfig
    );


const auth =
    getAuth(app);


const db =
    getFirestore(app);


window.AdminFirebase = {
    app,
    auth,
    db
};


let currentUser = null;
let adminData = null;


const loadingScreen =
    document.getElementById(
        "loadingScreen"
    );


const appContainer =
    document.getElementById(
        "app"
    );


const adminName =
    document.getElementById(
        "adminName"
    );


const workersCount =
    document.getElementById(
        "workersCount"
    );


const branchesCount =
    document.getElementById(
        "branchesCount"
    );


const attendanceCount =
    document.getElementById(
        "attendanceCount"
    );


const recordsCount =
    document.getElementById(
        "recordsCount"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const notification =
    document.getElementById(
        "notification"
    );


function showNotification(
    message,
    type = "normal"
) {

    if (!notification) {
        return;
    }

    notification.textContent =
        message;

    notification.className =
        "notification show";

    if (
        type === "success"
    ) {

        notification.classList.add(
            "success"
        );
    }

    if (
        type === "error"
    ) {

        notification.classList.add(
            "error"
        );
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


window.AdminApp = {

    getUser() {
        return currentUser;
    },

    getAdminData() {
        return adminData;
    },

    getAuth() {
        return auth;
    },

    getDatabase() {
        return db;
    },

    notify(
        message,
        type = "normal"
    ) {

        showNotification(
            message,
            type
        );
    }

};


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


    if (
        !snapshot.exists()
    ) {

        await signOut(
            auth
        );

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

            return false;
        }


        if (
            adminData.rol ===
            "gerente"
        ) {

            window.location.replace(
                "gerente.html"
            );

            return false;
        }


        await signOut(
            auth
        );

        window.location.replace(
            "login.html"
        );

        return false;
    }


    if (
        adminData.estado ===
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


    adminName.textContent =
        adminData.nombre ||
        "Administrador";


    return true;
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
            item => {

                const data =
                    item.data();


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
            item => {

                const data =
                    item.data();


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


        let today =
            0;


        attendanceSnapshot.forEach(
            item => {

                const data =
                    item.data();


                if (
                    !data.fechaHora ||
                    !data.fechaHora.toDate
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

    const buttons =
        document.querySelectorAll(
            "[data-section]"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const section =
                        button.dataset.section;


                    document
                        .querySelectorAll(
                            ".app-section"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    const target =
                        document.getElementById(
                            `section${
                                section
                                    .charAt(0)
                                    .toUpperCase()
                                + section.slice(1)
                            }`
                        );


                    if (target) {

                        target.classList.add(
                            "active"
                        );

                    }


                    document
                        .querySelectorAll(
                            ".nav-item"
                        )
                        .forEach(
                            item => {

                                item.classList.toggle(
                                    "active",
                                    item.dataset.section ===
                                    section
                                );

                            }
                        );


                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });


                    if (
                        section ===
                        "sucursales"
                    ) {

                        setTimeout(
                            () => {

                                if (
                                    window.AdminSucursales &&
                                    typeof window.AdminSucursales.refreshMap ===
                                    "function"
                                ) {

                                    window.AdminSucursales.refreshMap();

                                }

                            },
                            200
                        );

                    }

                }
            );

        }
    );

}


async function loadModules() {

    try {

        const modules = await Promise.all([
            import("./admin/inicio.js"),
            import("./admin/trabajadores.js"),
            import("./admin/asistencias.js"),
            import("./admin/sucursales.js"),
            import("./admin/reportes.js")
        ]);


        for (
            const module of modules
        ) {

            if (
                typeof module.init ===
                "function"
            ) {

                await module.init();

            }

        }

    } catch (error) {

        console.error(
            "Error cargando módulos:",
            error
        );

        showNotification(
            "Uno de los módulos del administrador no pudo cargarse.",
            "error"
        );

    }

}


function setupLogout() {

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

                showNotification(
                    "No fue posible cerrar sesión.",
                    "error"
                );

            }

        }
    );

}


async function initializeAdmin() {

    try {

        const valid =
            await verifyAdministrator();


        if (!valid) {
            return;
        }


        await loadDashboardStats();


        setupNavigation();


        setupLogout();


        await loadModules();


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