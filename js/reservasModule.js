/* ==================== RESERVAS MODULE ====================
   Módulo JavaScript para la página de Reservas
*/

let allReservations = [];
let filteredReservations = [];

async function loadReservations() {
    console.log('📅 Cargando reservas...');
    try {
        allReservations = await getReservations();
        filteredReservations = allReservations;
        displayReservations(filteredReservations);
        console.log('✅ Reservas cargadas:', allReservations.length);
    } catch (error) {
        console.error('❌ Error cargando reservas:', error);
        showError('Error al cargar reservas');
    }
}

function displayReservations(reservations) {
    const tbody = document.getElementById('reservationsTable');
    if (!tbody) return;
    
    const rows = reservations.map(r => {
        const status = r.estado || 'pending';
        const badgeClass = `badge-${status}`;
        
        return `
            <tr>
                <td>${r.id.substring(0, 8)}...</td>
                <td>${r.usuario_email || 'N/A'}</td>
                <td>${new Date(r.fecha_creacion).toLocaleDateString('es-ES')}</td>
                <td>${r.id_franja_horaria?.substring(0, 8) || 'N/A'}...</td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
                <td>
                    <button class="btn btn-secondary" style="padding:6px 12px;margin-right:4px;" onclick="showQRCode('${r.id}')">QR</button>
                    <button class="btn btn-secondary" style="padding:6px 12px;margin-right:4px;" onclick="changeStatus('${r.id}')">Estado</button>
                    <button class="btn btn-danger" style="padding:6px 12px;" onclick="confirmCancelReservation('${r.id}')"><img src="assets/icons/delete.svg" alt="Eliminar" style="width:16px;height:16px;"></button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = rows.join('') || '<tr><td colspan="6" style="text-align:center;color:#91ADC9;">No hay reservas</td></tr>';
}

function filterReservations(status) {
    if (status === 'all') {
        filteredReservations = allReservations;
    } else {
        filteredReservations = allReservations.filter(r => r.estado === status);
    }
    displayReservations(filteredReservations);
    console.log('📊 Reservas filtradas:', filteredReservations.length);
}

function showQRCode(reservationId) {
    const modal = document.getElementById('qrModal');
    const qrContainer = document.getElementById('qrContainer');
    
    // Generar código QR (en la práctica, usarías una librería como qrcode.js)
    qrContainer.innerHTML = `
        <div style="text-align:center;">
            <h3 style="color:#FFFFFF; margin:0 0 20px 0;">Código QR Reserva</h3>
            <div style="background:white; padding:20px; border-radius:8px; display:inline-block;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reservationId)}" 
                     alt="QR Code" style="width:200px; height:200px;">
            </div>
            <p style="color:#91ADC9; margin-top:15px;">ID: ${reservationId.substring(0, 8)}...</p>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeQRModal() {
    document.getElementById('qrModal').classList.remove('show');
}

function changeStatus(reservationId) {
    const newStatus = prompt('Nuevo estado (pending, confirmed, completed, cancelled):');
    if (!newStatus) return;
    
    updateReservationStatus(reservationId, newStatus);
}

async function updateReservationStatus(reservationId, newStatus) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?id=eq.${reservationId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'apikey': window.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ estado: newStatus })
            }
        );
        
        if (response.ok) {
            console.log('✅ Estado actualizado');
            await loadReservations();
            showSuccess('Estado actualizado correctamente');
        } else {
            throw new Error('Error actualizando estado');
        }
    } catch (error) {
        console.error('❌ Error actualizando estado:', error);
        showError('Error al actualizar estado: ' + error.message);
    }
}

function confirmCancelReservation(reservationId) {
    if (confirm('¿Cancelar esta reserva?')) {
        updateReservationStatus(reservationId, 'cancelled');
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
    loadReservations();
    
    const closeBtn = document.querySelector('#qrModal .close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeQRModal);
    
    const modal = document.getElementById('qrModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeQRModal();
    });
    
    const filterSelect = document.querySelector('select');
    if (filterSelect) filterSelect.addEventListener('change', (e) => filterReservations(e.target.value));
});
