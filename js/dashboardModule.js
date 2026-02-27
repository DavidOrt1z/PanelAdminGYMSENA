/* ==================== DASHBOARD MODULE ====================
   Módulo JavaScript para la página de Dashboard
*/

async function loadDashboardData() {
    console.log('📊 Cargando datos del dashboard...');
    try {
        // Cargar estadísticas
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
        
        console.log('✅ Dashboard cargado correctamente');
        
        // Cargar actividad reciente
        await loadRecentActivity();
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        showError('Error al cargar el dashboard');
    }
}

async function loadRecentActivity() {
    console.log('📋 Cargando actividad reciente...');
    try {
        // Obtener reservas recientes como actividad
        const reservations = await getReservations();
        const tbody = document.getElementById('activityTable');
        
        if (!tbody) return;
        
        // Mostrar últimas 5 actividades
        const activities = reservations.slice(0, 5).map(r => `
            <tr>
                <td>Reserva</td>
                <td>${r.user_id}</td>
                <td>${r.user_email || 'N/A'}</td>
                <td>${new Date(r.created_at).toLocaleDateString('es-ES')}</td>
            </tr>
        `);
        
        tbody.innerHTML = activities.join('') || '<tr><td colspan="4" style="text-align:center; color:#91ADC9;">Sin actividad reciente</td></tr>';
        console.log('✅ Actividad reciente cargada');
    } catch (error) {
        console.error('❌ Error cargando actividad:', error);
    }
}

function showError(message) {
    alert(message);
}

// Ejecutar cuando carga la página
document.addEventListener('DOMContentLoaded', () => {
    const user = checkAdminAuth();
    if (user) {
        loadDashboardData();
    }
});
