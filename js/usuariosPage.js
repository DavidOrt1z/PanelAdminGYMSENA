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

    const customSelect = document.getElementById('customUserRole');
    if (customSelect) {
        setupCustomSelect();
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('¿Esta seguro de que desea cerrar sesion?')) {
        logoutAdmin();
    }
});

function setupCustomSelect() {
    const customSelect = document.getElementById('customUserRole');
    const hiddenInput = document.getElementById('userRole');
    const display = customSelect.querySelector('.select-display');
    const options = customSelect.querySelectorAll('.select-option');
    const optionsContainer = customSelect.querySelector('.select-options');

    display.addEventListener('click', (e) => {
        e.stopPropagation();
        optionsContainer.classList.toggle('show');
    });

    options.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = option.dataset.value;
            const icon = option.querySelector('svg').outerHTML;
            const text = option.textContent.trim();

            hiddenInput.value = value;
            display.innerHTML = `<span class="select-value">${icon}<span>${text}</span></span>`;

            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            optionsContainer.classList.remove('show');
        });
    });

    document.addEventListener('click', () => {
        optionsContainer.classList.remove('show');
    });

    options[0].classList.add('selected');
    hiddenInput.value = 'member';
}
