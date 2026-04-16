/* ==================== PERSONAL MODULE ====================
   Módulo JavaScript para la página de Personal
*/

let allStaff = [];
let currentSearchQuery = '';

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function applyStaffSearchFilter() {
    const tbody = document.getElementById('staffTable');
    if (!tbody) return;

    const normalizedQuery = normalizeSearchText(currentSearchQuery);
    const visibleStaff = !normalizedQuery
        ? allStaff
        : allStaff.filter((staff) => {
            const haystack = [
                staff.id,
                staff.nombre_completo,
                staff.rol,
                staff.correo_electronico,
                staff.telefono,
                staff.teléfono,
                getStaffStatusLabel(staff.estado)
            ]
                .map((value) => normalizeSearchText(value))
                .join(' ');

            return haystack.includes(normalizedQuery);
        });

    const rows = visibleStaff.map((s) => {
        const statusLabel = getStaffStatusLabel(s.estado);
        const statusClass = getStaffStatusClass(s.estado);

        return `
            <tr>
                <td>${s.nombre_completo || 'N/A'}</td>
                <td>${s.rol || 'N/A'}</td>
                <td>${s.correo_electronico || 'N/A'}</td>
                <td>${s.teléfono || 'N/A'}</td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="staff-actions">
                        <button class="btn btn-secondary" style="padding:6px 12px;" onclick="editStaff('${s.id}')"><img src="assets/icons/edit.svg" alt="Editar" style="width:16px;height:16px;"></button>
                        <button class="btn btn-danger" style="padding:6px 12px;" onclick="confirmDeleteStaff('${s.id}')"><img src="assets/icons/delete.svg" alt="Eliminar" style="width:16px;height:16px;"></button>
                    </div>
                </td>
            </tr>
        `;
    });

    const emptyMessage = normalizedQuery ? 'No se encontro personal para la busqueda' : 'No hay personal';
    tbody.innerHTML = rows.join('') || `<tr><td colspan="6" style="text-align:center;color:#91ADC9;">${emptyMessage}</td></tr>`;
}

function normalizeStaffStatus(status) {
    const raw = String(status || 'active').toLowerCase().trim();
    const map = {
        activo: 'active',
        inactivo: 'inactive',
        suspendido: 'suspended',
        bloqueado: 'blocked',
        cancelado: 'cancelled',
        cancelada: 'cancelled',
        completado: 'completed',
        completada: 'completed'
    };
    return map[raw] || raw;
}

function getStaffStatusLabel(status) {
    switch (normalizeStaffStatus(status)) {
        case 'active':
            return 'Activo';
        case 'inactive':
            return 'Inactivo';
        case 'suspended':
            return 'Suspendido';
        case 'blocked':
            return 'Bloqueado';
        case 'completed':
            return 'Completado';
        case 'cancelled':
            return 'Cancelado';
        default:
            return 'Activo';
    }
}

function getStaffStatusClass(status) {
    switch (normalizeStaffStatus(status)) {
        case 'active':
            return 'badge-active';
        case 'completed':
            return 'badge-completed';
        case 'inactive':
            return 'badge-inactive';
        case 'cancelled':
            return 'badge-cancelled';
        case 'suspended':
        case 'blocked':
            return 'badge-warning';
        default:
            return 'badge-active';
    }
}

async function loadStaff() {
    console.log('👨‍💼 Cargando personal...');
    try {
        allStaff = await getStaff();
        
        applyStaffSearchFilter();
        console.log('✅ Personal cargado:', allStaff.length);
    } catch (error) {
        console.error('❌ Error cargando personal:', error);
        showError('Error al cargar personal');
    }
}

let currentStaffId = null;

function openStaffModal(staffId = null) {
    currentStaffId = staffId;
    const modal = document.getElementById('staffModal');
    const title = document.querySelector('#staffModal .modal-header h2');
    const form = document.getElementById('staffForm');
    const passwordGroup = document.getElementById('passwordGroupWrapper');
    const passwordInput = document.getElementById('staffPassword');
    
    if (staffId) {
        title.textContent = 'Editar Personal';
        passwordGroup.style.display = 'none';
        const staff = allStaff.find(s => s.id === staffId);
        if (staff) {
            document.getElementById('staffName').value = staff.nombre_completo || '';
            document.getElementById('staffRole').value = staff.rol || '';
            document.getElementById('staffEmail').value = staff.correo_electronico || '';
            document.getElementById('staffPhone').value = staff.teléfono || '';
        }
    } else {
        title.textContent = 'Nuevo Personal (Administrador)';
        passwordGroup.style.display = 'block';
        form.reset();
        passwordInput.value = '';
    }
    
    modal.classList.add('show');
}

function closeStaffModal() {
    document.getElementById('staffModal').classList.remove('show');
    currentStaffId = null;
}

async function submitStaffForm(e) {
    e.preventDefault();
    
    const name = document.getElementById('staffName').value.trim();
    const position = document.getElementById('staffRole').value.trim();
    const email = document.getElementById('staffEmail').value.trim();
    const phone = document.getElementById('staffPhone').value.trim();
    const password = document.getElementById('staffPassword').value.trim();
    
    if (!name || !position || !email) {
        showError('Por favor completa los campos requeridos');
        return;
    }
    
    if (!currentStaffId && !password) {
        showError('Por favor proporciona una contraseña para el administrador');
        return;
    }
    
    try {
        if (currentStaffId) {
            // Editar solo en la tabla personal
            await updateStaff(currentStaffId, {
                nombre_completo: name,
                rol: position,
                correo_electronico: email,
                teléfono: phone
            });
            console.log('✅ Personal actualizado');
        } else {
            // Crear nuevo personal y usuario administrador
            console.log('📝 Iniciando creación de nuevo administrador...');
            
            // El servidor se encargará de:
            // 1. Crear usuario en Supabase Auth
            // 2. Guardar en tabla personal
            try {
                console.log('🔐 Creando administrador (Auth + Personal)...');
                const adminResponse = await createAdminUser({
                    nombre_completo: name,
                    correo_electronico: email,
                    password: password,
                    rol: position || 'Instructor',
                    telefono: phone
                });
                
                if (!adminResponse) {
                    throw new Error('No se recibió respuesta del servidor');
                }
                
                console.log('✅ Administrador creado exitosamente');
                console.log('📊 Auth ID:', adminResponse.user?.id);
                console.log('📊 Staff ID:', adminResponse.staff?.id);
            } catch (error) {
                const errorMsg = error.message || 'Error desconocido al guardar personal';
                console.error('❌ Error en submitStaffForm:', error);
                throw new Error(errorMsg);
            }
        }
        
        closeStaffModal();
        await loadStaff();
        
        if (currentStaffId) {
            showSuccess('Personal editado correctamente');
        } else {
            showSuccess(`✅ Administrador creado correctamente\n📧 Email: ${email}\n🔑 Puede loguearse con estas credenciales`);
        }
    } catch (error) {
        console.error('❌ Error en submitStaffForm:', error);
        const errorMsg = error.message || 'Error desconocido al guardar personal';
        showError(`Error al guardar personal:\n${errorMsg}`);
    }
}

function editStaff(staffId) {
    openStaffModal(staffId);
}

async function confirmDeleteStaff(staffId) {
    const confirmed = await showDeleteConfirm({
        title: '¿Estás seguro?',
        message: '¡El registro será eliminado!',
        confirmText: 'Sí, eliminarlo',
        cancelText: 'Cancelar'
    });

    if (confirmed) {
        deleteStaff(staffId);
    }
}

async function deleteStaff(staffId) {
    try {
        const response = await fetch(
            `${window.API_BASE}/api/staff/${encodeURIComponent(staffId)}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.ok) {
            console.log('✅ Personal eliminado');
            await loadStaff();
            showSuccess('Personal eliminado correctamente');
        } else {
            throw new Error('Error eliminando personal');
        }
    } catch (error) {
        console.error('❌ Error eliminando personal:', error);
        showError('Error al eliminar personal: ' + error.message);
    }
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
            max-width: 450px;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-weight: 500;
            border-left: 4px solid #b71c1c;
            font-size: 14px;
            line-height: 1.5;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        `;
        document.body.appendChild(notification);
    }
    
    const iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10" style="fill: white;"/><text x="50%" y="55%" text-anchor="middle" dy=".3em" style="font-size: 14px; font-weight: bold; fill: #D32F2F;">!</text></svg>';
    const messageHtml = msg.replace(/\n/g, '<br>');
    notification.innerHTML = iconHtml + '<span>' + messageHtml + '</span>';
    notification.style.display = 'flex';
    notification.style.animation = 'slideIn 0.3s ease-out';
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 5000);
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
            max-width: 450px;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-weight: 500;
            border-left: 4px solid #45a049;
            font-size: 14px;
            line-height: 1.5;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        `;
        document.body.appendChild(notification);
    }
    
    const iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; flex-shrink: 0; color: white; margin-top: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    const messageHtml = msg.replace(/\n/g, '<br>');
    notification.innerHTML = iconHtml + '<span>' + messageHtml + '</span>';
    notification.style.display = 'flex';
    notification.style.animation = 'slideIn 0.3s ease-out';
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 4000);
}

function generateRandomPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

function copyPasswordToClipboard() {
    const passwordInput = document.getElementById('staffPassword');
    const password = passwordInput.value;
    
    if (!password) {
        showError('No hay contraseña para copiar');
        return;
    }
    
    navigator.clipboard.writeText(password).then(() => {
        showSuccess('Contraseña copiada al portapapeles');
        
        const copyBtn = document.getElementById('copyPasswordBtn');
        copyBtn.style.background = '#4CAF50';
        copyBtn.style.borderColor = '#4CAF50';
        copyBtn.style.color = 'white';
        
        setTimeout(() => {
            copyBtn.style.background = '';
            copyBtn.style.borderColor = '';
            copyBtn.style.color = '';
        }, 2000);
    }).catch(() => {
        showError('Error al copiar la contraseña');
    });
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('staffPassword');
    const toggleBtn = document.getElementById('togglePasswordVisibilityBtn');
    
    if (passwordInput.type === 'password') {
        // Mostrar la contraseña
        passwordInput.type = 'text';
        toggleBtn.style.color = '#1273D4';
    } else {
        // Ocultar la contraseña
        passwordInput.type = 'password';
        toggleBtn.style.color = '';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadStaff();
    
    const addStaffBtn = document.getElementById('addStaffBtn');
    if (addStaffBtn) addStaffBtn.addEventListener('click', () => openStaffModal());
    
    const form = document.getElementById('staffForm');
    if (form) form.addEventListener('submit', submitStaffForm);
    
    const closeBtn = document.querySelector('#staffModal .close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeStaffModal);
    
    const cancelBtn = document.getElementById('cancelStaffBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeStaffModal);
    
    const modal = document.getElementById('staffModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeStaffModal();
    });
    
    const generateBtn = document.getElementById('generatePasswordBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const newPassword = generateRandomPassword();
            document.getElementById('staffPassword').value = newPassword;
        });
    }
    
    const copyBtn = document.getElementById('copyPasswordBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            copyPasswordToClipboard();
        });
    }
    
    const toggleBtn = document.getElementById('togglePasswordVisibilityBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            togglePasswordVisibility();
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentSearchQuery = searchInput.value || '';
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value || '';
            applyStaffSearchFilter();
        });
    }
});
