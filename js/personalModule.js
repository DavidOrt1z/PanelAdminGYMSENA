/* ==================== PERSONAL MODULE ====================
   Módulo JavaScript para la página de Personal
*/

let allStaff = [];

async function loadStaff() {
    console.log('👨‍💼 Cargando personal...');
    try {
        allStaff = await getStaff();
        
        const tbody = document.getElementById('staffTable');
        if (!tbody) return;
        
        const rows = allStaff.map(s => `
            <tr>
                <td>${s.full_name || 'N/A'}</td>
                <td>${s.position || 'N/A'}</td>
                <td>${s.email || 'N/A'}</td>
                <td>${s.phone || 'N/A'}</td>
                <td><span class="badge badge-active">Activo</span></td>
                <td>
                    <button class="btn btn-secondary" style="padding:6px 12px;margin-right:8px;" onclick="editStaff('${s.id}')"><img src="assets/icons/edit.svg" alt="Editar" style="width:16px;height:16px;"></button>
                    <button class="btn btn-danger" style="padding:6px 12px;" onclick="confirmDeleteStaff('${s.id}')"><img src="assets/icons/delete.svg" alt="Eliminar" style="width:16px;height:16px;"></button>
                </td>
            </tr>
        `);
        
        tbody.innerHTML = rows.join('') || '<tr><td colspan="6" style="text-align:center;color:#91ADC9;">No hay personal</td></tr>';
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
    
    if (staffId) {
        title.textContent = 'Editar Personal';
        const staff = allStaff.find(s => s.id === staffId);
        if (staff) {
            document.getElementById('staffName').value = staff.full_name || '';
            document.getElementById('staffRole').value = staff.position || '';
            document.getElementById('staffEmail').value = staff.email || '';
            document.getElementById('staffPhone').value = staff.phone || '';
        }
    } else {
        title.textContent = 'Nuevo Personal';
        form.reset();
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
    
    if (!name || !position || !email) {
        showError('Por favor completa los campos requeridos');
        return;
    }
    
    try {
        if (currentStaffId) {
            // Editar
            await updateStaff(currentStaffId, {
                full_name: name,
                position,
                email,
                phone
            });
            console.log('✅ Personal actualizado');
        } else {
            // Crear
            await createStaff({
                full_name: name,
                position,
                email,
                phone
            });
            console.log('✅ Personal creado');
        }
        
        closeStaffModal();
        await loadStaff();
        showSuccess('Personal guardado correctamente');
    } catch (error) {
        console.error('❌ Error guardando personal:', error);
        showError('Error al guardar personal');
    }
}

function editStaff(staffId) {
    openStaffModal(staffId);
}

function confirmDeleteStaff(staffId) {
    if (confirm('¿Estás seguro de que deseas eliminar este personal?')) {
        deleteStaff(staffId);
    }
}

async function deleteStaff(staffId) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/staff?id=eq.${staffId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.ok) {
            console.log('✅ Personal eliminado');
            await loadStaff();
            showSuccess('Personal eliminado correctamente');
        }
    } catch (error) {
        console.error('❌ Error eliminando personal:', error);
        showError('Error al eliminar personal');
    }
}

function showError(msg) {
    alert('❌ ' + msg);
}

function showSuccess(msg) {
    alert('✅ ' + msg);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadStaff();
    
    const form = document.getElementById('staffForm');
    if (form) form.addEventListener('submit', submitStaffForm);
    
    const closeBtn = document.querySelector('#staffModal .close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeStaffModal);
    
    const modal = document.getElementById('staffModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeStaffModal();
    });
});
