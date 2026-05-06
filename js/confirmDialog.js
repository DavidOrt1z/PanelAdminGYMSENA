function showDeleteConfirm(options = {}) {
    const {
        title = '¿Estás seguro?',
        message = '¡El registro será eliminado!',
        confirmText = 'Sí, eliminarlo',
        cancelText = 'Cancelar'
    } = options;

    return new Promise((resolve) => {
        const existing = document.getElementById('appConfirmOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'appConfirmOverlay';
        overlay.className = 'app-confirm-overlay';

        overlay.innerHTML = `
            <div class="app-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="appConfirmTitle">
                <div class="app-confirm-icon">!</div>
                <h3 id="appConfirmTitle">${title}</h3>
                <p>${message}</p>
                <div class="app-confirm-actions">
                    <button type="button" class="app-confirm-btn app-confirm-btn-danger" id="appConfirmOk">${confirmText}</button>
                    <button type="button" class="app-confirm-btn app-confirm-btn-cancel" id="appConfirmCancel">${cancelText}</button>
                </div>
            </div>
        `;

        const cleanup = (value) => {
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.remove();
                resolve(value);
            }, 180);
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false);
        });

        const okBtn = overlay.querySelector('#appConfirmOk');
        const cancelBtn = overlay.querySelector('#appConfirmCancel');

        okBtn?.addEventListener('click', () => cleanup(true));
        cancelBtn?.addEventListener('click', () => cleanup(false));

        const onKeyDown = (e) => {
            if (!document.body.contains(overlay)) {
                document.removeEventListener('keydown', onKeyDown);
                return;
            }
            if (e.key === 'Escape') {
                cleanup(false);
                document.removeEventListener('keydown', onKeyDown);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(overlay);
        okBtn?.focus();
    });
}

function showLogoutConfirm() {
    return new Promise((resolve) => {
        const existing = document.getElementById('logoutConfirmOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'logoutConfirmOverlay';
        overlay.className = 'logout-confirm-overlay';

        overlay.innerHTML = `
            <div class="logout-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logoutConfirmTitle">
                <div class="logout-confirm-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </div>
                <h3 id="logoutConfirmTitle">¿Cerrar sesión?</h3>
                <p>Se cerrará tu sesión en el panel de administrador</p>
                <div class="logout-confirm-actions">
                    <button type="button" class="logout-confirm-btn logout-confirm-btn-danger" id="logoutConfirmOk">Cerrar sesión</button>
                    <button type="button" class="logout-confirm-btn logout-confirm-btn-cancel" id="logoutConfirmCancel">Cancelar</button>
                </div>
            </div>
        `;

        const cleanup = (value) => {
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.remove();
                resolve(value);
            }, 180);
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false);
        });

        const okBtn = overlay.querySelector('#logoutConfirmOk');
        const cancelBtn = overlay.querySelector('#logoutConfirmCancel');

        okBtn?.addEventListener('click', () => cleanup(true));
        cancelBtn?.addEventListener('click', () => cleanup(false));

        const onKeyDown = (e) => {
            if (!document.body.contains(overlay)) {
                document.removeEventListener('keydown', onKeyDown);
                return;
            }
            if (e.key === 'Escape') {
                cleanup(false);
                document.removeEventListener('keydown', onKeyDown);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(overlay);
        cancelBtn?.focus();
    });
}
