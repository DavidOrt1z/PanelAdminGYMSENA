// ==================== FUNCIONALIDAD DEL DASHBOARD ====================

// Navegación entre secciones
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navigateTo(section);
        });
    });
});

function navigateTo(section) {
    // Remover clase active de todos los items y secciones
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    
    // Agregar clase active a item y sección seleccionada
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    document.getElementById(`${section}-section`).classList.add('active');
    
    // Actualizar títulos
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Bienvenido al panel de administración' },
        usuarios: { title: 'Gestión de Usuarios', subtitle: 'Administra todos los usuarios del sistema' },
        reservas: { title: 'Gestión de Reservas', subtitle: 'Controla todas las reservas' },
        horarios: { title: 'Gestión de Horarios', subtitle: 'Crea y administra horarios disponibles' },
        personal: { title: 'Gestión de Personal', subtitle: 'Administra el personal del gimnasio' },
        equipamiento: { title: 'Gestión de Equipamiento', subtitle: 'Controla el equipamiento disponible' }
    };
    
    const config = titles[section] || titles.dashboard;
    document.getElementById('pageTitle').textContent = config.title;
    document.getElementById('pageSubtitle').textContent = config.subtitle;
    
    // Cargar datos según la sección
    if (section === 'usuarios') {
        loadUsers();
    } else if (section === 'reservas') {
        loadReservations();
    } else if (section === 'horarios') {
        loadSlots();
    } else if (section === 'personal') {
        loadStaff();
    } else if (section === 'equipamiento') {
        loadEquipment();
    }
}

// ==================== DASHBOARD ====================

async function loadDashboardData() {
    const stats = await getStatistics();
    
    if (stats) {
        document.getElementById('metricUsers').textContent = stats.totalUsers || 0;
        document.getElementById('metricReservations').textContent = stats.todayReservations || 0;
        document.getElementById('metricSlots').textContent = stats.totalSlots || 0;
        document.getElementById('metricEquipment').textContent = stats.totalEquipment || 0;
        
        // Cargar actividad reciente
        loadRecentActivity();
    }
}

async function loadRecentActivity() {
    try {
        const reservations = await getReservations();
        const activityList = document.getElementById('activityList');
        
        if (!reservations || reservations.length === 0) {
            activityList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Sin actividad reciente</p>';
            return;
        }
        
        // Ordenar por fecha descendente y mostrar últimas 5
        const recent = reservations.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        ).slice(0, 5);
        
        activityList.innerHTML = recent.map(r => `
            <div class="activity-item">
                <div><strong>Reserva #${r.id.substring(0, 8)}</strong></div>
                <div class="activity-time">${new Date(r.created_at).toLocaleString('es-ES')}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// ==================== USUARIOS ====================

async function loadUsers() {
    const users = await getUsers();
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hay usuarios</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id.substring(0, 8)}</td>
            <td>${user.first_name} ${user.last_name}</td>
            <td>${user.email}</td>
            <td>${user.role || 'usuario'}</td>
            <td><span class="badge badge-success">Activo</span></td>
            <td>
                <button class="btn" onclick="editUser('${user.id}')">Editar</button>
                <button class="btn" onclick="deleteUser('${user.id}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function openUserModal() {
    document.getElementById('userModal').classList.add('show');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('show');
}

function editUser(userId) {
    alert('Funcionalidad de edición en desarrollo');
}

function deleteUser(userId) {
    if (confirm('¿Estás seguro?')) {
        alert('Funcionalidad de eliminación en desarrollo');
    }
}

// ==================== RESERVAS ====================

async function loadReservations(filter = null) {
    const reservations = await getReservations(filter);
    const tbody = document.getElementById('reservationsTableBody');
    
    if (!reservations || reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No hay reservas</td></tr>';
        return;
    }
    
    tbody.innerHTML = reservations.map(res => `
        <tr>
            <td>${res.id.substring(0, 8)}</td>
            <td>${res.user_id.substring(0, 8)}</td>
            <td>${new Date(res.reservation_date).toLocaleDateString('es-ES')}</td>
            <td>${res.time_slot || 'N/A'}</td>
            <td><span class="badge badge-success">${res.status || 'pendiente'}</span></td>
            <td><button class="btn" onclick="showQRCode('${res.qr_token}')">Ver QR</button></td>
            <td>
                <button class="btn" onclick="updateReservationStatus('${res.id}', 'completed')">Completar</button>
                <button class="btn" onclick="cancelReservation('${res.id}')">Cancelar</button>
            </td>
        </tr>
    `).join('');
}

function filterReservations(filter) {
    loadReservations(filter);
}

function showQRCode(qrToken) {
    alert('QR Token: ' + qrToken);
}

// ==================== HORARIOS ====================

async function loadSlots() {
    const slots = await getSlots();
    const tbody = document.getElementById('slotsTableBody');
    
    if (!slots || slots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No hay horarios</td></tr>';
        return;
    }
    
    tbody.innerHTML = slots.map(slot => `
        <tr>
            <td>${slot.id.substring(0, 8)}</td>
            <td>${slot.day_of_week || 'N/A'}</td>
            <td>${slot.start_time}</td>
            <td>${slot.capacity}</td>
            <td>${slot.reserved_count || 0}</td>
            <td>
                ${slot.capacity - (slot.reserved_count || 0) > 0 
                    ? '<span class="badge badge-success">Disponible</span>' 
                    : '<span class="badge badge-error">Lleno</span>'
                }
            </td>
            <td>
                <button class="btn" onclick="editSlot('${slot.id}')">Editar</button>
                <button class="btn" onclick="deleteSlot('${slot.id}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function openSlotModal() {
    alert('Crear nuevo horario - Funcionalidad en desarrollo');
}

function editSlot(slotId) {
    alert('Editar horario - Funcionalidad en desarrollo');
}

// ==================== PERSONAL ====================

async function loadStaff() {
    const staff = await getStaff();
    const tbody = document.getElementById('staffTableBody');
    
    if (!staff || staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hay personal</td></tr>';
        return;
    }
    
    tbody.innerHTML = staff.map(member => `
        <tr>
            <td>${member.id.substring(0, 8)}</td>
            <td>${member.name}</td>
            <td>${member.position}</td>
            <td>${member.email}</td>
            <td><span class="badge badge-success">Activo</span></td>
            <td>
                <button class="btn" onclick="editStaff('${member.id}')">Editar</button>
                <button class="btn" onclick="deleteStaff('${member.id}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function openStaffModal() {
    alert('Agregar personal - Funcionalidad en desarrollo');
}

function editStaff(staffId) {
    alert('Editar personal - Funcionalidad en desarrollo');
}

function deleteStaff(staffId) {
    if (confirm('¿Estás seguro?')) {
        alert('Funcionalidad de eliminación en desarrollo');
    }
}

// ==================== EQUIPAMIENTO ====================

async function loadEquipment() {
    const equipment = await getEquipment();
    const tbody = document.getElementById('equipmentTableBody');
    
    if (!equipment || equipment.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hay equipamiento</td></tr>';
        return;
    }
    
    tbody.innerHTML = equipment.map(item => `
        <tr>
            <td>${item.id.substring(0, 8)}</td>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>
                ${item.status === 'maintenance' 
                    ? '<span class="badge badge-warning">Mantenimiento</span>' 
                    : '<span class="badge badge-success">Operativo</span>'
                }
            </td>
            <td>${new Date(item.last_review).toLocaleDateString('es-ES')}</td>
            <td>
                <button class="btn" onclick="editEquipment('${item.id}')">Editar</button>
                <button class="btn" onclick="markMaintenance('${item.id}')">Mantenimiento</button>
            </td>
        </tr>
    `).join('');
}

function openEquipmentModal() {
    alert('Nuevo equipamiento - Funcionalidad en desarrollo');
}

function editEquipment(equipmentId) {
    alert('Editar equipamiento - Funcionalidad en desarrollo');
}

function markMaintenance(equipmentId) {
    if (confirm('¿Marcar este equipo como en mantenimiento?')) {
        alert('Funcionalidad en desarrollo');
    }
}

// Cerrar modales al hacer clic afuera
window.addEventListener('click', (event) => {
    const modal = document.getElementById('userModal');
    if (event.target === modal) {
        modal.classList.remove('show');
    }
});
