/* ==================== USUARIOS MODULE ====================
   Módulo JavaScript para la página de Usuarios
*/

let currentUserId = null;
let allUsers = [];
let currentSearchQuery = '';

let documentTypes = [];
let currentDocumentTypeId = null;

function slugPart(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '');
}

function buildSyntheticEmail(name, lastName, documentNumber) {
    const first = slugPart(name) || 'usuario';
    const last = slugPart(lastName) || 'gym';
    const doc = String(documentNumber || '').replace(/\D/g, '').slice(-6) || '000000';
    return `${first}.${last}.${doc}@gymapp.local`;
}

function normalizeDocumentName(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getDefaultDocumentTypeId() {
    const cc = documentTypes.find((type) => normalizeDocumentName(type.nombre).includes('ciudadania'));
    return (cc || documentTypes[0])?.id ?? null;
}

async function loadDocumentTypes() {
    if (documentTypes.length) return documentTypes;

    const response = await fetch(`${window.SUPABASE_URL}/rest/v1/tipo_documentos?select=id,nombre&order=id.asc`, {
        headers: {
            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
            'apikey': window.SUPABASE_ANON_KEY
        }
    });

    if (!response.ok) throw new Error('No se pudieron cargar los tipos de documento');
    documentTypes = await response.json();
    renderDocumentOptions();
    setDocumentType(getDefaultDocumentTypeId());
    return documentTypes;
}

function renderDocumentOptions() {
    const options = document.getElementById('documentTypeOptions');
    if (!options) return;

    options.innerHTML = documentTypes.map((type) => `
        <button type="button" class="document-option" data-id="${escapeHtml(type.id)}">
            ${escapeHtml(type.nombre)}
        </button>
    `).join('');

    options.querySelectorAll('.document-option').forEach((option) => {
        option.addEventListener('click', () => {
            setDocumentType(option.dataset.id);
            closeDocumentOptions();
        });
    });
}

function setDocumentType(value) {
    const numericValue = Number(value);
    const fallbackId = getDefaultDocumentTypeId();
    currentDocumentTypeId = documentTypes.some((type) => Number(type.id) === numericValue)
        ? numericValue
        : fallbackId;

    const selected = documentTypes.find((type) => Number(type.id) === Number(currentDocumentTypeId));
    const label = selected?.nombre || 'Cédula de Ciudadanía';

    const hidden = document.getElementById('documentTypeId');
    const display = document.getElementById('documentTypeLabel');
    const numberLabel = document.getElementById('documentNumberLabel');
    const numberInput = document.getElementById('userDocumentNumber');

    if (hidden) hidden.value = currentDocumentTypeId ?? '';
    if (display) display.textContent = label;
    if (numberLabel) numberLabel.textContent = label;
    if (numberInput) {
        numberInput.placeholder = label;
        numberInput.setAttribute('aria-label', label);
    }

    document.querySelectorAll('.document-option').forEach((option) => {
        option.classList.toggle('selected', Number(option.dataset.id) === Number(currentDocumentTypeId));
    });
}

function closeDocumentOptions() {
    const options = document.getElementById('documentTypeOptions');
    const trigger = document.getElementById('documentTypeTrigger');
    options?.classList.remove('show');
    trigger?.setAttribute('aria-expanded', 'false');
}

function setupDocumentTypeSelect() {
    const trigger = document.getElementById('documentTypeTrigger');
    const options = document.getElementById('documentTypeOptions');
    if (!trigger || !options) return;

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = options.classList.toggle('show');
        trigger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', closeDocumentOptions);
}

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
    return 'Usuario';
}

function getRoleBadgeClass(role) {
    return 'badge-member';
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
            u.nombre,
            u.apellido,
            u.cedula,
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

        // Mostrar "No completado" si el email está vacío o es un email sintético
        const emailDisplay = u.correo_electronico && u.correo_electronico.includes('@') 
            ? (u.correo_electronico.includes('@gymapp.local') ? 'No completado' : escapeHtml(u.correo_electronico))
            : 'No completado';

        return `
            <tr>
                <td>${escapeHtml(String(u.id || '').substring(0, 8))}...</td>
                <td>${escapeHtml(u.nombre || 'N/A')}</td>
                <td>${escapeHtml(u.apellido || 'N/A')}</td>
                <td>${escapeHtml(u.numero_documento || 'N/A')}</td>
                <td>${emailDisplay}</td>
                <td><span class="badge ${roleClass}">${escapeHtml(roleLabel)}</span></td>
                <td><span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span></td>
                <td>
                    <button class="btn btn-secondary" style="padding:6px 12px;margin-right:8px;" onclick="editUser('${escapeHtml(u.id)}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="btn btn-danger" style="padding:6px 12px;" onclick="confirmDeleteUser('${escapeHtml(u.id)}')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows.join('') || `<tr><td colspan="8" style="text-align:center;color:#CFCFCF;">${escapeHtml(emptyMessage)}</td></tr>`;
}

async function loadUsers() {
    console.log('👥 Cargando usuarios...');
    try {
        await window.configReady;
        await loadDocumentTypes();
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
    const roleSelect = document.getElementById('userRole');
    
    if (userId) {
        title.textContent = 'Editar Usuario';
        const user = allUsers.find(u => u.id === userId);
        if (user) {
            document.getElementById('userName').value = user.nombre || '';
            document.getElementById('userLastName').value = user.apellido || '';
            document.getElementById('userDocumentNumber').value = user.numero_documento || '';
            setDocumentType(user.tipo_documento_id || getDefaultDocumentTypeId());
            if (roleSelect) roleSelect.value = 'member';
        }
    } else {
        title.textContent = 'Añadir Usuario';
        form.reset();
        document.getElementById('userLastName').value = '';
        document.getElementById('userDocumentNumber').value = '';
        setDocumentType(getDefaultDocumentTypeId());
        if (roleSelect) roleSelect.value = 'member';
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
    const lastName = document.getElementById('userLastName').value.trim();
    const documentNumber = document.getElementById('userDocumentNumber').value.trim();
    const tipoDocumentoId = document.getElementById('documentTypeId').value;
    const rol = document.getElementById('userRole').value;

    if (!name || !lastName || !documentNumber || !tipoDocumentoId || !rol) {
        showError('Por favor, complete todos los campos.');
        return;
    }

    const userData = {
        nombre: name,
        apellido: lastName,
        tipo_documento_id: Number(tipoDocumentoId),
        cedula: documentNumber,
        rol: rol,
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="dot-triangle-loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';

    const url = currentUserId
        ? `${window.API_BASE}/api/users/${encodeURIComponent(currentUserId)}`
        : `${window.SUPABASE_URL}/rest/v1/users`;

    fetch(url, {
        method: currentUserId ? 'PATCH' : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
            'apikey': window.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(userData),
    })
        .then(async (response) => {
            if (!response.ok) {
                let errorMessage = 'Error al guardar el usuario';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // Si no es JSON, mantenemos el mensaje por defecto
                }
                throw new Error(errorMessage);
            }
            // Solo intentamos parsear JSON si hay contenido (POST/PATCH en Supabase pueden devolver vacío)
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        })
        .then(() => {
            showSuccess(currentUserId ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
            setTimeout(() => {
                location.reload();
            }, 1000);
        })
        .catch((error) => {
            console.error('Error guardando usuario:', error);
            showError(`Error al guardar usuario: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        });
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
        const response = await fetch(`${window.API_BASE}/api/users/${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
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
    setupDocumentTypeSelect();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentSearchQuery = searchInput.value || '';
        searchInput.addEventListener('input', (e) => searchUsers(e.target.value));
    }
});
