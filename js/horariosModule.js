/* ==================== HORARIOS MODULE ====================
   Módulo JavaScript para la página de Horarios
*/

let allSlots = [];
let currentSearchQuery = '';

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function matchesSlotSearch(slot, query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;

    const [year, month, day] = String(slot.fecha || '').split('-');
    const dateFormatted = (day && month && year) ? `${day}/${month}/${year}` : '';
    const start = String(slot.hora_inicio || '').substring(0, 5);
    const end = String(slot.hora_fin || '').substring(0, 5);

    const haystack = [
        slot.id,
        slot.fecha,
        dateFormatted,
        start,
        end,
        `${start}-${end}`,
        slot.capacidad,
        slot.cantidad_reservada
    ]
        .map((item) => normalizeSearchText(item))
        .join(' ');

    return haystack.includes(normalizedQuery);
}

async function loadSlots() {
    console.log('⏰ Cargando horarios...');
    const tbody = document.getElementById('slotsTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#91ADC9;">Cargando...</td></tr>';

    try {
        await window.configReady;

        // Cargar slots y reservas confirmadas en paralelo
        const [slots, reservations] = await Promise.all([
            getSlots(),
            getReservations()
        ]);

        allSlots = slots;

        // Contar reservas activas y completadas por slot_id
        const reservedBySlot = {};
        reservations.forEach(r => {
            if (r.estado === 'active' || r.estado === 'completed') {
                reservedBySlot[r.id_franja_horaria] = (reservedBySlot[r.id_franja_horaria] || 0) + 1;
            }
        });

        if (!allSlots.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#91ADC9;">No hay horarios registrados</td></tr>';
            return;
        }

        const visibleSlots = allSlots.filter((slot) => matchesSlotSearch(slot, currentSearchQuery));

        const rows = visibleSlots.map(s => {
            // s.fecha = '2026-03-10', s.hora_inicio = '08:00:00', s.hora_fin = '09:00:00'
            const [y, m, d]   = (s.fecha || '').split('-');
            const dateStr     = s.fecha
                ? `${d}/${m}/${y}`
                : '—';
            const startHour   = (s.hora_inicio || '').substring(0, 5);  // '08:00'
            const endHour     = (s.hora_fin   || '').substring(0, 5);  // '09:00'
            const capacity    = s.capacidad || 0;
            const reserved    = reservedBySlot[s.id] ?? s.cantidad_reservada ?? 0;
            const free        = Math.max(0, capacity - reserved);
            const pct         = capacity > 0 ? Math.round((reserved / capacity) * 100) : 0;
            const badgeClass  = pct >= 100 ? 'full' : pct >= 80 ? 'almost-full' : 'available';
            const badgeText   = pct >= 100 ? 'Lleno' : `${free} libre${free !== 1 ? 's' : ''}`;

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td>${startHour}</td>
                    <td>${endHour}</td>
                    <td>${capacity}</td>
                    <td>${reserved}</td>
                    <td><span class="availability ${badgeClass}">${badgeText}</span></td>
                    <td class="action-btns">
                        <button class="btn btn-secondary action-btn" onclick="editSlot('${s.id}')">
                            <img src="assets/icons/edit.svg" alt="Editar" style="width:15px;height:15px;">
                        </button>
                        <button class="btn btn-danger action-btn" onclick="confirmDeleteSlot('${s.id}')">
                            <img src="assets/icons/delete.svg" alt="Eliminar" style="width:15px;height:15px;">
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = rows.join('') || '<tr><td colspan="7" style="text-align:center;color:#91ADC9;">No se encontraron horarios</td></tr>';
        console.log(`✅ Horarios cargados: ${allSlots.length}, visibles: ${visibleSlots.length}, Reservas: ${reservations.length}`);
    } catch (error) {
        console.error('❌ Error cargando horarios:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#FF6B6B;">Error al cargar horarios</td></tr>';
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
            document.getElementById('slotDate').value      = slot.fecha;              // 'YYYY-MM-DD'
            document.getElementById('slotStartTime').value = slot.hora_inicio.substring(0, 5); // 'HH:MM'
            document.getElementById('slotEndTime').value   = slot.hora_fin.substring(0, 5);
            document.getElementById('slotCapacity').value  = slot.capacidad ?? slot.capacity ?? '';
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

    if (startTime >= endTime) {
        showError('La hora de inicio debe ser menor que la hora de fin');
        return;
    }

    try {
        const form = document.getElementById('slotForm');
        const slotId = form.dataset.slotId;

        // La BD espera: fecha DATE, hora_inicio TIME, hora_fin TIME
        const payload = {
            fecha: date,
            hora_inicio: startTime + ':00',   // '08:00' → '08:00:00'
            hora_fin:   endTime   + ':00',
            capacidad: capacity
        };
        
        if (slotId) {
            const result = await updateSlot(slotId, payload);
            if (!result) throw new Error('updateSlot devolvió nulo');
            console.log('✅ Horario actualizado');
        } else {
            const result = await createSlot({ ...payload, cantidad_reservada: 0 });
            if (!result) throw new Error('createSlot devolvió nulo');
            console.log('✅ Horario creado');
        }
        
        closeSlotModal();
        await loadSlots();
        
        if (slotId) {
            showSuccess('Horario editado correctamente');
        } else {
            showSuccess('Horario creado correctamente');
        }
    } catch (error) {
        console.error('❌ Error guardando horario:', error);
        showError('Error al guardar horario: ' + error.message);
    }
}

function editSlot(slotId) {
    openSlotModal(slotId);
}

async function confirmDeleteSlot(slotId) {
    const confirmed = await showDeleteConfirm({
        title: '¿Estás seguro?',
        message: '¡El registro será eliminado!',
        confirmText: 'Sí, eliminarlo',
        cancelText: 'Cancelar'
    });

    if (confirmed) {
        deleteSlot(slotId);
    }
}

async function deleteSlot(slotId) {
    try {
        await window.configReady;
        const response = await fetch(
            `${window.API_BASE}/api/slots/${encodeURIComponent(slotId)}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.ok) {
            console.log('✅ Horario eliminado');
            await loadSlots();
            showSuccess('Horario eliminado correctamente');
        } else {
            throw new Error('Error eliminando horario');
        }
    } catch (error) {
        console.error('❌ Error eliminando horario:', error);
        showError('Error al eliminar horario: ' + error.message);
    }
}

function showError(msg) {
    showToast(msg, 'error');
}

function showSuccess(msg) {
    showToast(msg, 'success');
}

function showToast(msg, type = 'success') {
    const existing = document.querySelectorAll('.toast-notification');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed; bottom: 28px; right: 28px; z-index: 9999;
        padding: 14px 22px; border-radius: 8px; font-size: 14px; font-weight: 500;
        color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        animation: slideUp 0.3s ease;
        background: ${type === 'success' ? '#1a7a3a' : '#c0392b'};
        border-left: 4px solid ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        max-width: 340px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    const icon = document.createElement('img');
    icon.src = type === 'success' ? 'assets/icons/exito.svg' : 'assets/icons/error.svg';
    icon.style.cssText = 'width: 20px; height: 20px; flex-shrink: 0;';
    if (type === 'success') {
        icon.style.filter = 'brightness(0) invert(1) saturate(1)';
    } else {
        icon.style.filter = 'brightness(0) invert(1) saturate(2)';
    }
    
    const text = document.createElement('span');
    text.textContent = msg;
    
    toast.appendChild(icon);
    toast.appendChild(text);
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSlots();

    document.getElementById('addSlotBtn')?.addEventListener('click', () => openSlotModal());

    const form = document.getElementById('slotForm');
    if (form) form.addEventListener('submit', submitSlotForm);

    document.getElementById('closeSlotModal')?.addEventListener('click', closeSlotModal);
    document.getElementById('cancelSlotBtn')?.addEventListener('click', closeSlotModal);

    const modal = document.getElementById('slotModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSlotModal();
    });

    document.getElementById('searchInput')?.addEventListener('input', async (e) => {
        currentSearchQuery = e.target.value || '';
        await loadSlots();
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (confirm('¿Está seguro de que desea cerrar sesión?')) logoutAdmin();
    });
});
