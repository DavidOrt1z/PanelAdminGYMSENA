/* ==================== USUARIOS MODULE ====================
   Módulo JavaScript para la página de Usuarios
*/

let currentUserId = null;
let allUsers = [];
let currentSearchQuery = '';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeRole(role) {
    const raw = String(role || 'member').toLowerCase().trim();
    if (raw === 'usuario' || raw === 'user' || raw === 'miembro') return 'member';
    if (raw === 'administrador') return 'admin';
    return raw;
}

function getRoleLabel(role) {
    const normalized = normalizeRole(role);
    switch (normalized) {
        case 'admin':
            return 'Administrador';
        case 'member':
            return 'Usuario';
        default:
            return 'Usuario';
    }
}

function getRoleBadgeClass(role) {
    const normalized = normalizeRole(role);
    return normalized === 'admin' ? 'badge-admin' : 'badge-member';
}

function normalizeStatus(status) {
    const raw = String(status || 'active').toLowerCase().trim();
    const map = {
        activo: 'active',
        inactivo: 'inactive',
        suspendido: 'suspended',
        bloqueado: 'blocked'
    };
    return map[raw] || raw;
}

function getStatusLabel(status) {
    const normalized = normalizeStatus(status);
    switch (normalized) {
        case 'active':
            return 'Activo';
        case 'inactive':
            return 'Inactivo';
        case 'suspended':
            return 'Suspendido';
        case 'blocked':
            return 'Bloqueado';
        default:
            return 'Activo';
    }
}

function getStatusBadgeClass(status) {
    const normalized = normalizeStatus(status);
    if (normalized === 'inactive') return 'badge-inactive';
    if (normalized === 'suspended' || normalized === 'blocked') return 'badge-warning';
    return 'badge-active';
}

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function applyUsersSearchFilter() {
    const normalizedQuery = normalizeSearchText(currentSearchQuery);
    if (!normalizedQuery) {
        renderUsersTable(allUsers, 'No hay usuarios');
        return;
    }

    const filtered = allUsers.filter((u) => {
        const haystack = [
            u.id,
            u.nombre_completo,
            u.correo_electronico,
            getRoleLabel(u.rol),
            getStatusLabel(u.estado)
        ]
            .map((value) => normalizeSearchText(value))
            .join(' ');

        return haystack.includes(normalizedQuery);
    });

    renderUsersTable(filtered, 'No se encontraron usuarios');
}

function renderUsersTable(users, emptyMessage) {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;

    const rows = users.map(u => {
        const roleValue = normalizeRole(u.rol);
        const roleLabel = getRoleLabel(roleValue);
        const roleClass = getRoleBadgeClass(roleValue);

        const statusValue = normalizeStatus(u.estado);
        const statusLabel = getStatusLabel(statusValue);
        const statusClass = getStatusBadgeClass(statusValue);

        return `
            <tr>
                <td>${escapeHtml(String(u.id || '').substring(0, 8))}...</td>
                <td>${escapeHtml(u.nombre_completo || 'N/A')}</td>
                <td>${escapeHtml(u.correo_electronico || 'N/A')}</td>
                <td><span class="badge ${roleClass}">${escapeHtml(roleLabel)}</span></td>
                <td><span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span></td>
                <td>
                    <button class="btn btn-secondary" style="padding:6px 12px;margin-right:8px;" onclick="editUser('${escapeHtml(u.id)}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="btn btn-danger" style="padding:6px 12px;" onclick="confirmDeleteUser('${escapeHtml(u.id)}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows.join('') || `<tr><td colspan="6" style="text-align:center;color:#91ADC9;">${escapeHtml(emptyMessage)}</td></tr>`;
}

async function loadUsers() {
    console.log('👥 Cargando usuarios...');
    try {
        await window.configReady;
        const users = await getUsers();
        allUsers = users;
        
        applyUsersSearchFilter();
        console.log('✅ Usuarios cargados:', users.length);
    } catch (error) {
        console.error('❌ Error cargando usuarios:', error);
        showError('Error al cargar usuarios');
    }
}

function openUserModal(userId = null) {
    currentUserId = userId;
    const modal = document.getElementById('userModal');
    const title = document.querySelector('#userModal .modal-header h2');
    const form = document.getElementById('userForm');
    const display = document.querySelector('.select-display');
    const customSelect = document.getElementById('customUserRole');
    const hiddenInput = document.getElementById('userRole');
    
    if (userId) {
        title.textContent = 'Editar Usuario';
        const user = allUsers.find(u => u.id === userId);
        if (user) {
            document.getElementById('userName').value = user.nombre_completo || '';
            document.getElementById('userEmail').value = user.correo_electronico || '';
            document.getElementById('userEmail').disabled = true; // No permitir cambiar email
            
            // Actualizar custom select
            const role = normalizeRole(user.rol);
            hiddenInput.value = role;
            
            // Actualizar display
            const options = customSelect.querySelectorAll('.select-option');
            options.forEach(opt => {
                if (opt.dataset.value === role) {
                    const icon = opt.querySelector('svg').outerHTML;
                    const text = opt.textContent.trim();
                    display.innerHTML = `<span class="select-value">${icon}<span>${text}</span></span>`;
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
        }
    } else {
        title.textContent = 'Nuevo Usuario';
        form.reset();
        document.getElementById('userEmail').disabled = false;
        
        // Resetear custom select al estado inicial
        hiddenInput.value = 'member';
        display.innerHTML = `<span class="select-value"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span>Usuario</span></span>`;
        
        const options = customSelect.querySelectorAll('.select-option');
        options.forEach(opt => opt.classList.remove('selected'));
        options[0].classList.add('selected');
    }
    
    modal.classList.add('show');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('show');
    currentUserId = null;
}

async function submitUserForm(e) {
    e.preventDefault();
    await window.configReady;
    
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const role = normalizeRole(document.getElementById('userRole').value);
    
    if (!name || !email || !role) {
        showError('Por favor completa todos los campos');
        return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Por favor ingresa un email válido');
        return;
    }
    
    try {
        if (currentUserId) {
            // Editar usuario existente
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/users?id=eq.${currentUserId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'apikey': window.SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify({ 
                        nombre_completo: name, 
                        rol,
                        fecha_actualizacion: new Date().toISOString()
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error actualizando usuario');
            }
            console.log('✅ Usuario actualizado');
        } else {
            // Crear nuevo usuario
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/users`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'apikey': window.SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify({ 
                        nombre_completo: name, 
                        correo_electronico: email, 
                        rol,
                        fecha_creacion: new Date().toISOString()
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error creando usuario');
            }
            console.log('✅ Usuario creado');
        }
        
        closeUserModal();
        await loadUsers();
        
        if (currentUserId) {
            showSuccess('Usuario editado correctamente');
        } else {
            showSuccess('Usuario creado correctamente');
        }
    } catch (error) {
        console.error('❌ Error guardando usuario:', error);
        showError('Error al guardar usuario: ' + error.message);
    }
}

function editUser(userId) {
    openUserModal(userId);
}

async function confirmDeleteUser(userId) {
    const confirmed = await showDeleteConfirm({
        title: '¿Estás seguro?',
        message: '¡El registro será eliminado!',
        confirmText: 'Sí, eliminarlo',
        cancelText: 'Cancelar'
    });

    if (confirmed) {
        deleteUser(userId);
    }
}

async function deleteUser(userId) {
    try {
        await window.configReady;
        const response = await fetch(`${window.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'apikey': window.SUPABASE_ANON_KEY
            }
        });
        
        if (response.ok) {
            console.log('✅ Usuario eliminado');
            await loadUsers();
            showSuccess('Usuario eliminado correctamente');
        } else {
            throw new Error('Error eliminando usuario');
        }
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        showError('Error al eliminar usuario: ' + error.message);
    }
}

function searchUsers(query) {
    currentSearchQuery = query || '';
    applyUsersSearchFilter();
}

function showError(msg) {
    // Crear notificación visual si no existe
    let notification = document.getElementById('errorNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'errorNotification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #D32F2F;
            color: white;
            padding: 16px 24px;
            border-radius: 6px;
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-weight: 500;
            border-left: 4px solid #b71c1c;
            font-size: 14px;
            line-height: 1.4;
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        document.body.appendChild(notification);
    }
    
    const iconHtml = '<img src="assets/icons/error.svg" style="width: 20px; height: 20px; flex-shrink: 0; filter: brightness(0) invert(1) saturate(2);" />';
    notification.innerHTML = iconHtml + '<span>' + msg + '</span>';
    notification.style.display = 'block';
    notification.style.animation = 'slideIn 0.3s ease-out';
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 4500);
}

function showSuccess(msg) {
    // Crear notificación visual si no existe
    let notification = document.getElementById('successNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'successNotification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 16px 24px;
            border-radius: 6px;
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-weight: 500;
            border-left: 4px solid #45a049;
            font-size: 14px;
            line-height: 1.4;
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        document.body.appendChild(notification);
    }
    
    const iconHtml = '<img src="assets/icons/exito.svg" style="width: 20px; height: 20px; flex-shrink: 0; filter: brightness(0) invert(1) saturate(1);" />';
    notification.innerHTML = iconHtml + '<span>' + msg + '</span>';
    notification.style.display = 'block';
    notification.style.animation = 'slideIn 0.3s ease-out';
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3500);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadUsers();
    
    const form = document.getElementById('userForm');
    if (form) form.addEventListener('submit', submitUserForm);
    
    const closeBtn = document.querySelector('#userModal .close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeUserModal);
    
    const modal = document.getElementById('userModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeUserModal();
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentSearchQuery = searchInput.value || '';
        searchInput.addEventListener('input', (e) => searchUsers(e.target.value));
    }
});
