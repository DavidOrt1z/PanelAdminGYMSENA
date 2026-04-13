// ==================== AUTENTICACIÓN ADMIN ====================

async function adminLogin(email, password) {
    try {
        await window.configReady;
        console.log('Iniciando login para:', email);
        
        // Paso 1: Autenticación en Supabase Auth
        const authResponse = await fetch(`${window.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': window.SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const authData = await authResponse.json();
        console.log('Auth Response:', authResponse.status, authData);

        if (!authResponse.ok) {
            console.error('Error de autenticación:', authData);
            return {
                success: false,
                message: 'Email o contraseña incorrectos'
            };
        }

        const token = authData.access_token;
        console.log('Token obtenido:', token.substring(0, 20) + '...');

        // Paso 2: Obtener datos del usuario de la tabla public.users
        const userResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/users?correo_electronico=eq.${email}&select=*`,
            {
                method: 'GET',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const users = await userResponse.json();
        console.log('Users Response:', userResponse.status, users);

        if (!users || users.length === 0) {
            console.error('Usuario no encontrado en la BD');
            return {
                success: false,
                message: 'Usuario no encontrado en la base de datos'
            };
        }

        const user = users[0];
        console.log('Usuario encontrado:', user);

        // Paso 3: Verificar que sea administrador
        if (user.rol !== 'admin') {
            console.error('El usuario no tiene rol admin. Rol actual:', user.rol);
            return {
                success: false,
                message: 'No tienes permisos de administrador'
            };
        }

        console.log('✅ Login exitoso para:', user.correo_electronico);
        return {
            success: true,
            token: token,
            user: {
                id: user.id,
                email: user.correo_electronico,
                name: user.nombre_completo || 'Administrador',
                role: user.rol
            }
        };
    } catch (error) {
        console.error('❌ Error en login:', error);
        return {
            success: false,
            message: 'Error: ' + error.message
        };
    }
}

function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');

    if (!token || !user) {
        window.location.href = 'login.html';
        return null;
    }

    return JSON.parse(user);
}

function logoutAdmin() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'login.html';
}

// ==================== VERIFICACIÓN INICIAL ====================

document.addEventListener('DOMContentLoaded', () => {
    // Solo en index.html (dashboard)
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        const user = checkAdminAuth();
        
        if (user) {
            // Llenar datos del usuario
            document.getElementById('adminName').textContent = user.name || 'Administrador';
            document.getElementById('adminEmail').textContent = user.email;
            document.querySelector('.admin-avatar').textContent = user.name ? user.name.charAt(0).toUpperCase() : 'A';

            // Cargar datos
            loadDashboardData();
        }
    }
});

// Logout
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('¿Está seguro de que desea cerrar sesión?')) {
                logoutAdmin();
            }
        });
    }
});
