const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');

function ensureGymLoader(submitButton) {
    if (!submitButton) return null;
    let loader = submitButton.querySelector('.gym-loader');
    if (loader) return loader;

    loader = document.createElement('div');
    loader.className = 'gym-loader';
    loader.innerHTML = `
        <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle class="dumbbell-weight" cx="20" cy="40" r="14"></circle>
            <rect class="dumbbell-bar" x="40" y="36" width="40" height="8" rx="4"></rect>
            <circle class="dumbbell-weight" cx="100" cy="40" r="14"></circle>
        </svg>
    `;
    submitButton.appendChild(loader);
    return loader;
}

togglePasswordBtn?.addEventListener('click', () => {
    if (!passwordInput) return;

    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    togglePasswordBtn.classList.toggle('is-visible', !isVisible);
    togglePasswordBtn.setAttribute('aria-pressed', String(!isVisible));
    togglePasswordBtn.setAttribute('aria-label', isVisible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    passwordInput.focus();
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitButton = document.getElementById('submitButton');
    const errorMessage = document.getElementById('errorMessage');
    const gymLoader = ensureGymLoader(submitButton);
    const legacySpinner = submitButton?.querySelector('.spinner');

    submitButton.classList.add('is-loading');
    if (legacySpinner) legacySpinner.style.display = 'none';
    if (gymLoader) gymLoader.style.display = 'block';
    submitButton.disabled = true;

    try {
        const result = await adminLogin(email, password);

        if (result.success) {
            localStorage.setItem('adminToken', result.token);
            localStorage.setItem('adminUser', JSON.stringify(result.user));
            window.location.href = 'dashboard.html';
        } else {
            errorMessage.textContent = result.message || 'Error en la autenticacion';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'Error: ' + error.message;
        errorMessage.style.display = 'block';
    } finally {
        submitButton.classList.remove('is-loading');
        if (gymLoader) gymLoader.style.display = 'none';
        submitButton.disabled = false;
    }
});
