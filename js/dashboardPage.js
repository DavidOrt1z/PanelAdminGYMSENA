document.addEventListener('DOMContentLoaded', () => {
    // Los datos del admin se manejan ahora centralizadamente en auth.js
    // Solo iniciamos la carga de datos específicos si el usuario está autenticado
    const user = checkAdminAuth();
    if (user) {
        loadDashboardData();
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    const confirmed = await showLogoutConfirm();
    if (confirmed) {
        logoutAdmin();
    }
});
