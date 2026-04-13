document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitButton = document.getElementById('submitButton');
    const errorMessage = document.getElementById('errorMessage');

    submitButton.querySelector('.text').style.display = 'none';
    submitButton.querySelector('.spinner').style.display = 'block';
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
        submitButton.querySelector('.text').style.display = 'inline';
        submitButton.querySelector('.spinner').style.display = 'none';
        submitButton.disabled = false;
    }
});
