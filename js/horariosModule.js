/* ==================== HORARIOS MODULE ====================
   Módulo JavaScript para la página de Horarios
*/

let allSlots = [];

async function loadSlots() {
    console.log('⏰ Cargando horarios...');
    try {
        allSlots = await getSlots();
        
        const tbody = document.getElementById('slotsTable');
        if (!tbody) return;
        
        const rows = allSlots.map(s => {
            const startHour = new Date(s.start_time).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const endHour = new Date(s.end_time).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const date = new Date(s.start_time).toLocaleDateString('es-ES');
            const capacity = s.capacity || 0;
            const reserved = s.reserved_count || 0;
            const availability = capacity > 0 ? Math.round((reserved / capacity) * 100) : 0;
            const availabilityClass = availability >= 80 ? 'full' : 'available';
            const availabilityText = availability >= 80 ? 'Lleno' : `${100 - availability}% disponible`;
            
            return `
                <tr>
                    <td>${date}</td>
                    <td>${startHour}</td>
                    <td>${endHour}</td>
                    <td>${capacity}</td>
                    <td>${reserved}</td>
                    <td><span class="availability ${availabilityClass}">${availabilityText}</span></td>
                    <td>
                        <button class="btn btn-secondary" style="padding:6px 12px;margin-right:8px;" onclick="editSlot('${s.id}')"><img src="assets/icons/edit.svg" alt="Editar" style="width:16px;height:16px;"></button>
                        <button class="btn btn-danger" style="padding:6px 12px;" onclick="confirmDeleteSlot('${s.id}')"><img src="assets/icons/delete.svg" alt="Eliminar" style="width:16px;height:16px;"></button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = rows.join('') || '<tr><td colspan="7" style="text-align:center;color:#91ADC9;">No hay horarios</td></tr>';
        console.log('✅ Horarios cargados:', allSlots.length);
    } catch (error) {
        console.error('❌ Error cargando horarios:', error);
        showError('Error al cargar horarios');
    }
}

function openSlotModal(slotId = null) {
    const modal = document.getElementById('slotModal');
    const title = document.querySelector('#slotModal .modal-header h2');
    const form = document.getElementById('slotForm');
    
    if (slotId) {
        title.textContent = 'Editar Horario';
        const slot = allSlots.find(s => s.id === slotId);
        if (slot) {
            const startDate = new Date(slot.start_time).toISOString().split('T')[0];
            const startTime = new Date(slot.start_time).toTimeString().substring(0, 5);
            const endTime = new Date(slot.end_time).toTimeString().substring(0, 5);
            
            document.getElementById('slotDate').value = startDate;
            document.getElementById('slotStartTime').value = startTime;
            document.getElementById('slotEndTime').value = endTime;
            document.getElementById('slotCapacity').value = slot.capacity;
            form.dataset.slotId = slotId;
        }
    } else {
        title.textContent = 'Nuevo Horario';
        form.reset();
        delete form.dataset.slotId;
    }
    
    modal.classList.add('show');
}

function closeSlotModal() {
    document.getElementById('slotModal').classList.remove('show');
}

async function submitSlotForm(e) {
    e.preventDefault();
    
    const date = document.getElementById('slotDate').value;
    const startTime = document.getElementById('slotStartTime').value;
    const endTime = document.getElementById('slotEndTime').value;
    const capacity = parseInt(document.getElementById('slotCapacity').value);
    
    if (!date || !startTime || !endTime || !capacity) {
        showError('Por favor completa todos los campos');
        return;
    }
    
    try {
        const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
        const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();
        
        const form = document.getElementById('slotForm');
        const slotId = form.dataset.slotId;
        
        if (slotId) {
            // Editar
            await updateSlot(slotId, {
                start_time: startDateTime,
                end_time: endDateTime,
                capacity
            });
            console.log('✅ Horario actualizado');
        } else {
            // Crear
            await createSlot({
                start_time: startDateTime,
                end_time: endDateTime,
                capacity
            });
            console.log('✅ Horario creado');
        }
        
        closeSlotModal();
        await loadSlots();
        showSuccess('Horario guardado correctamente');
    } catch (error) {
        console.error('❌ Error guardando horario:', error);
        showError('Error al guardar horario');
    }
}

function editSlot(slotId) {
    openSlotModal(slotId);
}

function confirmDeleteSlot(slotId) {
    if (confirm('¿Estás seguro de que deseas eliminar este horario?')) {
        deleteSlot(slotId);
    }
}

async function deleteSlot(slotId) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/slots?id=eq.${slotId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.ok) {
            console.log('✅ Horario eliminado');
            await loadSlots();
            showSuccess('Horario eliminado correctamente');
        }
    } catch (error) {
        console.error('❌ Error eliminando horario:', error);
        showError('Error al eliminar horario');
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
    loadSlots();
    
    const form = document.getElementById('slotForm');
    if (form) form.addEventListener('submit', submitSlotForm);
    
    const closeBtn = document.querySelector('#slotModal .close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeSlotModal);
    
    const modal = document.getElementById('slotModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSlotModal();
    });
});
