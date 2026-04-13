/* ==================== DASHBOARD MODULE ====================
   Módulo JavaScript para la página de Dashboard
*/

async function loadDashboardData() {
    console.log('📊 Cargando datos del dashboard...');
    try {
        const stats = await getStatistics();

        // Actualizar métricas
        if (document.getElementById('totalUsers')) {
            document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        }
        if (document.getElementById('todayReservations')) {
            document.getElementById('todayReservations').textContent = stats.todayReservations || 0;
        }
        if (document.getElementById('totalSlots')) {
            document.getElementById('totalSlots').textContent = stats.totalSlots || 0;
        }

        // Cargar actividad reciente
        const tbody = document.getElementById('recentActivityTable');
        if (tbody) {
            const activities = stats.recentActivity || [];
            if (activities.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#91ADC9;">Sin actividad reciente</td></tr>';
            } else {
                tbody.innerHTML = activities.map(a => {
                    const dateValue = a.fecha ? new Date(a.fecha) : null;
                    const isSmallScreen = window.innerWidth <= 768;
                    const fecha = dateValue
                        ? dateValue.toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: isSmallScreen ? '2-digit' : 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                        : 'N/A';
                    const tipoBadge = a.tipo === 'Personal'
                        ? `<span style="background:#1273D4;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">${a.tipo}</span>`
                        : `<span style="background:#2E7D32;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">${a.tipo}</span>`;
                    return `
                        <tr>
                            <td>${tipoBadge}</td>
                            <td class="activity-description">${a.descripcion || 'N/A'}</td>
                            <td class="activity-user">${a.usuario || 'N/A'}</td>
                            <td class="activity-date">${fecha}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        console.log('✅ Dashboard cargado correctamente');
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
    }
}

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function filterDashboardActivityRows(query) {
    const tbody = document.getElementById('recentActivityTable');
    if (!tbody) return;

    const normalizedQuery = normalizeSearchText(query);
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.forEach((row) => {
        const isEmptyRow = row.children.length === 1;
        if (isEmptyRow) {
            row.style.display = '';
            return;
        }

        if (!normalizedQuery) {
            row.style.display = '';
            return;
        }

        const text = normalizeSearchText(row.textContent);
        row.style.display = text.includes(normalizedQuery) ? '' : 'none';
    });
}

function showError(message) {
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
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-weight: 500;
            border-left: 4px solid #b71c1c;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        document.body.appendChild(notification);
    }
    notification.innerHTML = '<span>' + message + '</span>';
    notification.style.display = 'flex';
    setTimeout(() => { notification.style.display = 'none'; }, 4500);
}

// Ejecutar cuando carga la página
document.addEventListener('DOMContentLoaded', () => {
    const user = checkAdminAuth();
    if (user) {
        loadDashboardData();
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterDashboardActivityRows(e.target.value);
        });
    }
});
