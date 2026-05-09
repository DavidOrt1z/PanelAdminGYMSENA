document.addEventListener('DOMContentLoaded', () => {
    // Los datos del admin se manejan ahora centralizadamente en auth.js
    const user = checkAdminAuth();
    if (user) {
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

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    const confirmed = await showLogoutConfirm();
    if (confirmed) {
        logoutAdmin();
    }
});

function setupCustomSelect() {}
