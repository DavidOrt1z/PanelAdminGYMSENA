/* ==================== NOTIFICACIONES PAGE ==================== */

let serviceNoticeHistory = [];
let currentHistorySearchQuery = '';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizeNoticeType(rawType) {
    const safe = String(rawType || '').toLowerCase().trim();
    if (safe === 'habilitacion' || safe === 'habilitación') return 'habilitacion';
    return 'cierre_temporal';
}

function getNoticeTypeLabel(type) {
    return normalizeNoticeType(type) === 'habilitacion' ? 'Habilitación' : 'Cierre temporal';
}

function formatDateForView(isoDate) {
    if (!isoDate) return '—';
    const parsed = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return isoDate;
    return parsed.toLocaleDateString('es-CO');
}

function formatDateTimeForView(isoDateTime) {
    if (!isoDateTime) return '—';
    const parsed = new Date(isoDateTime);
    if (Number.isNaN(parsed.getTime())) return String(isoDateTime);
    return parsed.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatHourRange(start, end) {
    const safeStart = String(start || '').substring(0, 5);
    const safeEnd = String(end || '').substring(0, 5);
    if (!safeStart || !safeEnd) return '—';
    return `${safeStart} - ${safeEnd}`;
}

function showError(msg) {
    showToast(msg, 'error');
}

function showSuccess(msg) {
    showToast(msg, 'success');
}

function showToast(msg, type = 'success') {
    const existing = document.querySelectorAll('.toast-notification');
    existing.forEach((item) => item.remove());

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed; bottom: 28px; right: 28px; z-index: 9999;
        padding: 14px 22px; border-radius: 8px; font-size: 14px; font-weight: 500;
        color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        animation: slideUp 0.3s ease;
        background: ${type === 'success' ? '#1a7a3a' : '#c0392b'};
        border-left: 4px solid ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        max-width: 360px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    const icon = document.createElement('img');
    icon.src = type === 'success' ? 'assets/icons/exito.svg' : 'assets/icons/error.svg';
    icon.style.cssText = 'width: 20px; height: 20px; flex-shrink: 0;';
    icon.style.filter = 'brightness(0) invert(1)';

    const text = document.createElement('span');
    text.textContent = msg;

    toast.appendChild(icon);
    toast.appendChild(text);
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3600);
}

function updateMessageCounter() {
    const messageInput = document.getElementById('noticeMessage');
    const counter = document.getElementById('messageCounter');
    if (!messageInput || !counter) return;

    const length = messageInput.value.length;
    counter.textContent = `${length} / 240`;
}

function setSendButtonLoading(loading) {
    const button = document.getElementById('sendNoticeBtn');
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? 'Enviando...' : 'Enviar';
}

function validateNoticeForm(data) {
    if (!data.tipo) return 'Selecciona el tipo de aviso';
    if (!data.fecha) return 'Selecciona la fecha del aviso';
    if (!data.hora_inicio || !data.hora_fin) return 'Completa hora inicio y hora fin';
    if (data.hora_inicio >= data.hora_fin) return 'La hora inicio debe ser menor que la hora fin';
    return '';
}

async function sendServiceNotice(payload) {
    const response = await fetch(`${window.API_BASE}/api/notifications/service-notices`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'No se pudo enviar el aviso');
    }

    return data;
}

async function fetchServiceNoticeHistory() {
    const response = await fetch(`${window.API_BASE}/api/notifications/service-notices?limit=100`, {
        method: 'GET'
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'No se pudo cargar el historial');
    }

    return Array.isArray(data.data) ? data.data : [];
}

function applyHistoryFilter() {
    const tbody = document.getElementById('noticeHistoryTable');
    if (!tbody) return;

    const query = normalizeSearchText(currentHistorySearchQuery);

    const rows = serviceNoticeHistory.filter((notice) => {
        if (!query) return true;

        const haystack = [
            notice.tipo,
            getNoticeTypeLabel(notice.tipo),
            notice.fecha,
            notice.hora_inicio,
            notice.hora_fin,
            notice.mensaje,
            notice.cuerpo,
            notice.destinatarios
        ]
            .map((item) => normalizeSearchText(item))
            .join(' ');

        return haystack.includes(query);
    });

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#CFCFCF;">No hay avisos para mostrar</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map((notice) => {
        const normalizedType = normalizeNoticeType(notice.tipo);
        const pillClass = normalizedType === 'habilitacion' ? 'type-habilitacion' : 'type-cierre';
        const message = notice.mensaje || notice.cuerpo || '—';
        const range = formatHourRange(notice.hora_inicio, notice.hora_fin);
        const recipients = Number(notice.destinatarios || 0);

        return `
            <tr>
                <td><span class="type-pill ${pillClass}">${escapeHtml(getNoticeTypeLabel(normalizedType))}</span></td>
                <td>${escapeHtml(formatDateForView(notice.fecha))}</td>
                <td>${escapeHtml(range)}</td>
                <td class="message-cell">${escapeHtml(message)}</td>
                <td>${escapeHtml(recipients > 0 ? `${recipients} usuarios` : 'Sin destinatarios')}</td>
                <td>${escapeHtml(formatDateTimeForView(notice.created_at))}</td>
            </tr>
        `;
    }).join('');
}

async function loadHistory() {
    const tbody = document.getElementById('noticeHistoryTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#CFCFCF;">Cargando historial...</td></tr>';

    try {
        serviceNoticeHistory = await fetchServiceNoticeHistory();
        applyHistoryFilter();
    } catch (error) {
        console.error('❌ Error cargando historial:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#FF8E8E;">Error cargando historial</td></tr>';
        showError(error.message || 'Error cargando historial');
    }
}

async function onSubmitNotice(event) {
    event.preventDefault();

    const payload = {
        tipo: String(document.getElementById('noticeType')?.value || '').trim(),
        fecha: String(document.getElementById('noticeDate')?.value || '').trim(),
        hora_inicio: String(document.getElementById('noticeStartTime')?.value || '').trim(),
        hora_fin: String(document.getElementById('noticeEndTime')?.value || '').trim(),
        mensaje: String(document.getElementById('noticeMessage')?.value || '').trim()
    };

    const validationError = validateNoticeForm(payload);
    if (validationError) {
        showError(validationError);
        return;
    }

    try {
        setSendButtonLoading(true);
        const result = await sendServiceNotice(payload);
        showSuccess(result?.message || 'Aviso enviado correctamente');

        const form = document.getElementById('serviceNoticeForm');
        if (form) form.reset();
        updateMessageCounter();

        await loadHistory();
    } catch (error) {
        console.error('❌ Error enviando aviso:', error);
        showError(error.message || 'No se pudo enviar el aviso');
    } finally {
        setSendButtonLoading(false);
    }
}

function wirePageEvents() {
    document.getElementById('serviceNoticeForm')?.addEventListener('submit', onSubmitNotice);

    document.getElementById('noticeMessage')?.addEventListener('input', updateMessageCounter);

    document.getElementById('refreshHistoryBtn')?.addEventListener('click', async () => {
        await loadHistory();
        showSuccess('Historial actualizado');
    });

    document.getElementById('historySearchInput')?.addEventListener('input', (event) => {
        currentHistorySearchQuery = event.target.value || '';
        applyHistoryFilter();
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (confirm('¿Está seguro de que desea cerrar sesión?')) {
            logoutAdmin();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = checkAdminAuth();
    if (!user) return;

    const adminName = document.getElementById('adminName');
    const adminEmail = document.getElementById('adminEmail');
    const avatar = document.querySelector('.admin-avatar');

    if (adminName) adminName.textContent = user.name || 'Administrador';
    if (adminEmail) adminEmail.textContent = user.email;
    if (avatar) avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'A';

    wirePageEvents();
    updateMessageCounter();
    await loadHistory();
});
