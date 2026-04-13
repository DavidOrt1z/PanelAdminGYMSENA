document.addEventListener('DOMContentLoaded', () => {
    const user = checkAdminAuth();
    if (user) {
        document.getElementById('adminName').textContent = user.name || 'Administrador';
        document.getElementById('adminEmail').textContent = user.email;
        const avatar = document.querySelector('.admin-avatar');
        if (avatar) {
            avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'A';
        }

        loadDashboardData();
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('¿Esta seguro de que desea cerrar sesion?')) {
        logoutAdmin();
    }
});
