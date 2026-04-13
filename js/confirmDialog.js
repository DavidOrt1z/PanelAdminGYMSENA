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
