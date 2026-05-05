document.addEventListener('DOMContentLoaded', () => {
    const user = checkAdminAuth();
    if (user) {
        document.getElementById('adminName').textContent = user.name || 'Administrador';
        document.getElementById('adminEmail').textContent = user.email;
        const avatar = document.querySelector('.admin-avatar');
        if (avatar) {
            avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'A';
        }

        loadUsers();
    }

    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', submitUserForm);
    }

    document.getElementById('addUserBtn')?.addEventListener('click', () => {
        openUserModal();
    });

    document.getElementById('cancelUserBtn')?.addEventListener('click', closeUserModal);
    document.getElementById('closeUserModal')?.addEventListener('click', closeUserModal);

    document.getElementById('userModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'userModal') closeUserModal();
    });

    // El rol en usuarios es fijo "Usuario"; no se inicializa custom select.
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('¿Esta seguro de que desea cerrar sesion?')) {
        logoutAdmin();
    }
});

function setupCustomSelect() {}
