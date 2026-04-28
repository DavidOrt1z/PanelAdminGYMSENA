// ==================== AUTENTICACIÓN ADMIN ====================

function normalizeRole(rawRole) {
    const value = String(rawRole || '').toLowerCase().trim();
    if (value === 'administrador') return 'admin';
    return value;
}

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
        const normalizedRole = normalizeRole(user.rol);
        if (normalizedRole !== 'admin') {
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
                role: normalizedRole
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

function setupMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const topBar = document.querySelector('.top-bar');
    if (!sidebar || !topBar) return;

    let menuButton = document.getElementById('mobileMenuBtn');
    if (!menuButton) {
        menuButton = document.createElement('button');
        menuButton.type = 'button';
        menuButton.id = 'mobileMenuBtn';
        menuButton.className = 'mobile-menu-btn';
        menuButton.setAttribute('aria-label', 'Abrir menu de navegacion');
        menuButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        `;
        topBar.prepend(menuButton);
    }

    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);
    }

    const closeSidebar = () => {
        sidebar.classList.remove('active');
        backdrop.classList.remove('show');
        document.body.classList.remove('sidebar-open');
    };

    const openSidebar = () => {
        sidebar.classList.add('active');
        backdrop.classList.add('show');
        document.body.classList.add('sidebar-open');
    };

    menuButton.addEventListener('click', () => {
        if (sidebar.classList.contains('active')) {
            closeSidebar();
            return;
        }
        openSidebar();
    });

    backdrop.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeSidebar();
        }
    });

    sidebar.querySelectorAll('.nav-item').forEach((item) => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                closeSidebar();
            }
        });
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
            closeSidebar();
        }
    });
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

document.addEventListener('DOMContentLoaded', () => {
    setupMobileSidebar();
});
