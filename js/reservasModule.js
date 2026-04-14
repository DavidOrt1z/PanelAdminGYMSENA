/* ==================== RESERVAS MODULE ====================
   Módulo JavaScript para la página de Reservas
*/

let allReservations = [];
let filteredReservations = [];
let reservationsRefreshTimer = null;
let reservationsLoadingInProgress = false;
let currentStatusFilter = '';
let currentSearchQuery = '';
let qrStream = null;
let qrScanIntervalId = null;
let qrDecodeCanvas = null;
let qrDecodeContext = null;
let isQrValidationInProgress = false;

const STATUS_OPTIONS = ['active', 'completed', 'cancelled'];

function normalizeStatus(status) {
    const raw = String(status || 'active').toLowerCase().trim();
    const map = {
        activa: 'active',
        confirmado: 'active',
        confirmada: 'active',
        pendiente: 'active',
        completada: 'completed',
        completado: 'completed',
        cancelada: 'cancelled',
        cancelado: 'cancelled',
        'no asistio': 'no_show',
        'no asistió': 'no_show'
    };
    return map[raw] || raw;
}

function getStatusLabel(status) {
    const normalized = normalizeStatus(status);
    switch (normalized) {
        case 'active':
            return 'Activo';
        case 'completed':
            return 'Completada';
        case 'cancelled':
            return 'Cancelada';
        case 'no_show':
            return 'No asistió';
        default:
            return 'Desconocido';
    }
}

function buildStatusOptions(currentStatus) {
    const normalizedCurrent = normalizeStatus(currentStatus);

    return STATUS_OPTIONS.map((statusValue) => {
        const selected = normalizedCurrent === statusValue ? 'selected' : '';
        return `<option value="${statusValue}" ${selected}>${getStatusLabel(statusValue)}</option>`;
    }).join('');
}

function formatTimeValue(timeValue) {
    if (!timeValue) return '';
    const time = String(timeValue).slice(0, 5);
    const [hourStr, minute] = time.split(':');
    const hour24 = Number(hourStr);

    if (Number.isNaN(hour24)) return time;

    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12}:${minute} ${period}`;
}

function buildSlotDisplay(slot) {
    if (!slot) return null;
    const start = formatTimeValue(slot.hora_inicio);
    const end = formatTimeValue(slot.hora_fin);

    if (start && end) return `${start} - ${end}`;
    return start || end || null;
}

function buildSlotDisplayFromReservation(reservation) {
    if (!reservation) return null;
    const start = formatTimeValue(reservation.hora_inicio);
    const end = formatTimeValue(reservation.hora_fin);

    if (start && end) return `${start} - ${end}`;

    if (reservation.fecha_creacion) {
        const created = new Date(reservation.fecha_creacion);
        if (!Number.isNaN(created.getTime())) {
            return created.toLocaleTimeString('es-CO', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
    }

    return 'Sin horario';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildUserDisplay(user) {
    if (!user) return null;
    const fullName = user.nombre_completo || [user.nombre, user.apellido].filter(Boolean).join(' ').trim();
    if (fullName && user.correo_electronico) {
        return `${fullName} (${user.correo_electronico})`;
    }
    return fullName || user.correo_electronico || null;
}

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function applyReservationFilters() {
    const selectedFilter = document.getElementById('filterStatus')?.value ?? currentStatusFilter;
    const searchValue = document.getElementById('searchInput')?.value ?? currentSearchQuery;
    const normalizedQuery = normalizeSearchText(searchValue);

    currentStatusFilter = selectedFilter || '';
    currentSearchQuery = searchValue || '';

    filteredReservations = allReservations.filter((reservation) => {
        const matchesStatus = !selectedFilter || selectedFilter === 'all'
            ? true
            : normalizeStatus(reservation.estado) === normalizeStatus(selectedFilter);

        if (!matchesStatus) return false;
        if (!normalizedQuery) return true;

        const userText = normalizeSearchText(reservation.usuario_display);
        const emailText = normalizeSearchText(reservation.usuario_email || reservation.correo_electronico);
        const rawNameText = normalizeSearchText(reservation.nombre_completo || reservation.nombre_usuario);
        const idText = normalizeSearchText(reservation.id);
        const statusText = normalizeSearchText(getStatusLabel(reservation.estado));
        const slotText = normalizeSearchText(reservation.horario_display);

        return (
            userText.includes(normalizedQuery)
            || emailText.includes(normalizedQuery)
            || rawNameText.includes(normalizedQuery)
            || idText.includes(normalizedQuery)
            || statusText.includes(normalizedQuery)
            || slotText.includes(normalizedQuery)
        );
    });

    displayReservations(filteredReservations);
}

async function loadReservations() {
    if (reservationsLoadingInProgress) return;
    reservationsLoadingInProgress = true;

    console.log('📅 Cargando reservas...');
    try {
        const [reservations, users, slots] = await Promise.all([
            getReservations(),
            getUsers(),
            getSlots()
        ]);

        const usersById = new Map();
        const usersByAuthId = new Map();
        const slotsById = new Map();

        for (const user of users || []) {
            if (user?.id) usersById.set(String(user.id), user);
            if (user?.id_autenticacion) usersByAuthId.set(String(user.id_autenticacion), user);
        }

        for (const slot of slots || []) {
            if (slot?.id) {
                slotsById.set(String(slot.id), slot);
            }
        }

        allReservations = (reservations || []).map((reservation) => {
            const userId = String(reservation.id_usuario || '');
            const matchedUser = usersById.get(userId) || usersByAuthId.get(userId) || null;
            const userDisplay = buildUserDisplay(matchedUser);
            const matchedSlot = slotsById.get(String(reservation.id_franja_horaria || '')) || null;
            const slotDisplay = buildSlotDisplayFromReservation(reservation) || buildSlotDisplay(matchedSlot);

            return {
                ...reservation,
                estado: normalizeStatus(reservation.estado),
                usuario_display: userDisplay || reservation.usuario_email || null,
                horario_display: slotDisplay || 'Sin horario'
            };
        });

        applyReservationFilters();
        console.log('✅ Reservas cargadas:', allReservations.length);
    } catch (error) {
        console.error('❌ Error cargando reservas:', error);
        showError('Error al cargar reservas');
    } finally {
        reservationsLoadingInProgress = false;
    }
}

function displayReservations(reservations) {
    const tbody = document.getElementById('reservationsTable');
    if (!tbody) return;
    
    const rows = reservations.map(r => {
        const status = normalizeStatus(r.estado);
        const statusClass = `status-${status}`;
        const statusLabel = getStatusLabel(status);
        const userDisplay = r.usuario_display || 'N/A';
        const slotDisplay = r.horario_display || 'Sin horario';
        const reservationId = String(r.id || '');
        
        return `
            <tr>
                <td>${escapeHtml(reservationId.substring(0, 8))}...</td>
                <td>${escapeHtml(userDisplay)}</td>
                <td>${new Date(r.fecha_creacion).toLocaleDateString('es-ES')}</td>
                <td>${escapeHtml(slotDisplay)}</td>
                <td class="status-cell">
                    <span class="status-pill ${statusClass}">
                        ${escapeHtml(statusLabel)}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn btn-secondary" style="padding:6px 12px;margin-right:6px;" onclick="showQRCode('${escapeHtml(reservationId)}')">QR</button>
                    <select
                        class="status-editor-select"
                        aria-label="Cambiar estado"
                        onchange="changeStatus('${escapeHtml(reservationId)}', this.value)">
                        ${buildStatusOptions(status)}
                    </select>
                    <button class="btn btn-danger" style="padding:6px 12px;margin-left:6px;" onclick="confirmCancelReservation('${escapeHtml(reservationId)}')"><img src="assets/icons/delete.svg" alt="Eliminar" style="width:16px;height:16px;"></button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = rows.join('') || '<tr><td colspan="6" style="text-align:center;color:#91ADC9;">No hay reservas</td></tr>';
}

function filterReservations(status) {
    const filterSelect = document.getElementById('filterStatus');
    if (filterSelect && typeof status === 'string') {
        filterSelect.value = status;
    }
    currentStatusFilter = status || '';
    applyReservationFilters();
    console.log('📊 Reservas filtradas:', filteredReservations.length);
}

function searchReservations(query) {
    currentSearchQuery = query || '';
    applyReservationFilters();
}

function startReservationsAutoRefresh() {
    if (reservationsRefreshTimer) return;

    // Sincroniza cambios hechos desde la app (cancelaciones, confirmaciones, etc.).
    reservationsRefreshTimer = setInterval(() => {
        loadReservations();
    }, 5000);
}

function stopReservationsAutoRefresh() {
    if (!reservationsRefreshTimer) return;
    clearInterval(reservationsRefreshTimer);
    reservationsRefreshTimer = null;
}

function showQRCode(reservationId) {
    const modal = document.getElementById('qrModal');
    const qrContainer = document.getElementById('qrContainer');
    const qrPayload = String(reservationId || '').trim();
    
    // Generar código QR (en la práctica, usarías una librería como qrcode.js)
    qrContainer.innerHTML = `
        <div style="text-align:center;">
            <h3 style="color:#FFFFFF; margin:0 0 20px 0;">Código QR Reserva</h3>
            <div style="background:white; padding:20px; border-radius:8px; display:inline-block;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}" 
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

function parseQrToken(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) return '';

    try {
        const parsedUrl = new URL(raw);
        const urlToken = parsedUrl.searchParams.get('token');
        if (urlToken) return urlToken;
    } catch (error) {
        // No es URL, seguir con otras estrategias.
    }

    if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
            const obj = JSON.parse(raw);
            if (obj?.token) return String(obj.token).trim();
        } catch (error) {
            // No es JSON valido, devolver texto crudo.
        }
    }

    return raw;
}

function setQrScannerStatus(message, isError = false) {
    const statusEl = document.getElementById('qrScannerStatus');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#FF8E8E' : '#91ADC9';
}

function extractTokenFromDecodedQr(decodedValue) {
    const parsed = parseQrToken(decodedValue);
    if (!parsed) return '';

    if (parsed.startsWith('resv:')) {
        return parsed.slice(5).trim();
    }

    return parsed;
}

function openQrValidatorModal() {
    const modal = document.getElementById('qrValidatorModal');
    if (!modal) {
        showError('No se encontro el modal de escaner QR');
        return;
    }

    modal.classList.add('show');
    setQrScannerStatus('Iniciando camara...');
    startQrScanner();
}

function closeQrValidatorModal() {
    const modal = document.getElementById('qrValidatorModal');
    if (modal) {
        modal.classList.remove('show');
    }
    stopQrScanner();
}

function openQrResultModal(html) {
    const container = document.getElementById('qrValidationResultContainer');
    const modal = document.getElementById('qrValidationResultModal');
    if (!container || !modal) return;

    container.innerHTML = html;
    modal.classList.add('show');
}

function closeQrResultModal() {
    const modal = document.getElementById('qrValidationResultModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function stopQrScanner() {
    if (qrScanIntervalId) {
        clearInterval(qrScanIntervalId);
        qrScanIntervalId = null;
    }

    if (qrStream) {
        qrStream.getTracks().forEach((track) => track.stop());
        qrStream = null;
    }

    const video = document.getElementById('qrVideo');
    if (video) {
        video.pause();
        video.srcObject = null;
    }

    qrDecodeCanvas = null;
    qrDecodeContext = null;
    isQrValidationInProgress = false;
}

async function startQrScanner() {
    const video = document.getElementById('qrVideo');
    if (!video) return;

    stopQrScanner();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setQrScannerStatus('Tu navegador no permite camara. Usa token manual.', true);
        return;
    }

    try {
        qrStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
        });

        video.srcObject = qrStream;
        await video.play();
        setQrScannerStatus('Camara activa. Apunta al codigo QR.');

        if ('BarcodeDetector' in window) {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            qrScanIntervalId = setInterval(async () => {
                try {
                    if (video.readyState < 2) return;
                    const codes = await detector.detect(video);
                    if (!codes || !codes.length) return;

                    const rawValue = String(codes[0].rawValue || '').trim();
                    if (!rawValue) return;

                    const token = extractTokenFromDecodedQr(rawValue);
                    if (!token || isQrValidationInProgress) return;
                    stopQrScanner();
                    setQrScannerStatus('QR detectado. Validando token...');
                    await validateQRToken(token);
                } catch (error) {
                    // Ignorar errores intermitentes del detector.
                }
            }, 550);
        } else if (window.jsQR) {
            setQrScannerStatus('Camara activa. Escaneo automatico habilitado (jsQR).');

            qrDecodeCanvas = document.createElement('canvas');
            qrDecodeContext = qrDecodeCanvas.getContext('2d', { willReadFrequently: true });

            qrScanIntervalId = setInterval(async () => {
                try {
                    if (isQrValidationInProgress) return;
                    if (!video.videoWidth || !video.videoHeight) return;

                    qrDecodeCanvas.width = video.videoWidth;
                    qrDecodeCanvas.height = video.videoHeight;
                    qrDecodeContext.drawImage(video, 0, 0, qrDecodeCanvas.width, qrDecodeCanvas.height);

                    const imageData = qrDecodeContext.getImageData(0, 0, qrDecodeCanvas.width, qrDecodeCanvas.height);
                    const qrCode = window.jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'attemptBoth'
                    });

                    if (!qrCode || !qrCode.data) return;

                    const token = extractTokenFromDecodedQr(qrCode.data);
                    if (!token) return;

                    stopQrScanner();
                    setQrScannerStatus('QR detectado. Validando token...');
                    await validateQRToken(token);
                } catch (error) {
                    // Ignorar fallos de frame intermitentes.
                }
            }, 320);
        } else {
            setQrScannerStatus('Escaneo automatico no soportado. Usa token manual.');
        }
    } catch (error) {
        console.error('❌ Error iniciando camara QR:', error);
        setQrScannerStatus('No se pudo abrir la camara. Revisa permisos o usa token manual.', true);
    }
}

async function validateManualTokenInput() {
    const input = document.getElementById('manualQrToken');
    if (!input) return;

    const token = parseQrToken(input.value);
    if (!token) {
        showError('Ingresa un token QR valido');
        return;
    }

    await validateQRToken(token);
}

function changeStatus(reservationId, selectedStatus = null) {
    const rawStatus = selectedStatus ?? prompt('Nuevo estado (active, completed, cancelled):');
    const newStatus = normalizeStatus(rawStatus);
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

async function confirmCancelReservation(reservationId) {
    const confirmed = await showDeleteConfirm({
        title: '¿Estás seguro?',
        message: '¡El registro será eliminado!',
        confirmText: 'Sí, eliminarlo',
        cancelText: 'Cancelar'
    });

    if (confirmed) {
        deleteReservation(reservationId);
    }
}

async function deleteReservation(reservationId) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?id=eq.${encodeURIComponent(reservationId)}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Prefer': 'return=representation'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Error eliminando reserva');
        }

        // Con return=representation esperamos filas borradas para confirmar la eliminacion.
        if (response.status !== 204) {
            const bodyText = await response.text();
            const deletedRows = bodyText ? JSON.parse(bodyText) : [];
            if (Array.isArray(deletedRows) && deletedRows.length === 0) {
                throw new Error('La reserva no se eliminó. Revisa permisos RLS en Supabase.');
            }
        }

        await loadReservations();
        showSuccess('Reserva eliminada correctamente');
    } catch (error) {
        console.error('❌ Error eliminando reserva:', error);
        showError('Error al eliminar reserva: ' + (error?.message || error));
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

function getReservationUserFallback(reservationId) {
    if (!reservationId) return { name: '', email: '' };

    const match = allReservations.find((reservation) => String(reservation.id || '') === String(reservationId));
    if (!match) return { name: '', email: '' };

    const rawDisplay = String(match.usuario_display || '').trim();
    const directEmail = String(match.usuario_email || match.correo_electronico || '').trim();

    let extractedName = rawDisplay;
    let extractedEmail = directEmail;

    const emailInDisplay = rawDisplay.match(/\(([^)]+@[^)]+)\)/);
    if (emailInDisplay) {
        extractedEmail = extractedEmail || emailInDisplay[1].trim();
        extractedName = rawDisplay.replace(emailInDisplay[0], '').trim();
    }

    if (!extractedEmail && /@/.test(rawDisplay)) {
        extractedEmail = rawDisplay;
        extractedName = '';
    }

    return {
        name: extractedName,
        email: extractedEmail
    };
}

async function validateQRToken(token) {
    if (isQrValidationInProgress) return;

    isQrValidationInProgress = true;
    const parsedToken = parseQrToken(token);
    if (!parsedToken) {
        showError('Token QR vacio o invalido');
        isQrValidationInProgress = false;
        return;
    }

    console.log('🔍 Validando token QR:', parsedToken);
    setQrScannerStatus('Buscando reserva...');

    try {
        const response = await fetch(
            `${window.API_BASE}/api/qr-lookup?token=${encodeURIComponent(parsedToken)}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            throw new Error('Error en la validación del token QR');
        }

        const payload = await response.json();
        const result = Array.isArray(payload) ? (payload[0] || {}) : (payload || {});
        console.log('✅ Resultado de validación:', result);

        closeQrValidatorModal();

        const reservationDate = result.fecha_horario
            ? new Date(`${result.fecha_horario}T00:00:00`).toLocaleDateString('es-CO')
            : '';
        const reservationSlot = [result.hora_inicio, result.hora_fin]
            .filter(Boolean)
            .map((value) => formatTimeValue(value))
            .join(' - ');
        const slotLine = reservationSlot
            ? `${reservationDate ? `${reservationDate} · ` : ''}${reservationSlot}`
            : 'Horario no disponible';

        if (result.found && result.valid) {
            const fallbackUser = getReservationUserFallback(result.reservation_id);
            const userName = escapeHtml(result.usuario_nombre || fallbackUser.name || 'Sin nombre');
            const userEmail = escapeHtml(result.usuario_email || fallbackUser.email || 'Sin correo');
            const serverMessage = escapeHtml(result.message || 'Reserva valida');

            openQrResultModal(`
                <div style="padding:8px 4px 0; text-align:center;">
                    <img src="assets/icons/qr-valid.svg" alt="Reserva valida" style="width:56px;height:56px;display:block;margin:0 auto 10px;"/>
                    <h3 style="color:#7fd885; margin:0 0 8px 0;">Reserva valida</h3>
                    <p style="color:#D7E6F5; margin:0 0 10px 0;">${serverMessage}</p>
                    <p style="color:#D7E6F5; margin:0 0 6px 0;"><strong>Usuario:</strong> ${userName}</p>
                    <p style="color:#D7E6F5; margin:0 0 6px 0;"><strong>Correo:</strong> ${userEmail}</p>
                    <p style="color:#D7E6F5; margin:0;"><strong>Horario:</strong> ${escapeHtml(slotLine)}</p>
                </div>
            `);
            await loadReservations();
            showSuccess(result.status === 'completed'
                ? 'Ingreso validado y reserva completada'
                : 'QR escaneado correctamente');
            return;
        }

        if (result.found && !result.valid) {
            const reason = escapeHtml(result.message || 'La reserva no esta activa para ingreso');
            openQrResultModal(`
                <div style="padding:8px 4px 0; text-align:center;">
                    <div style="font-size:48px; line-height:1; margin-bottom:10px;">⚠️</div>
                    <h3 style="color:#FFB86C; margin:0 0 8px 0;">Reserva encontrada</h3>
                    <p style="color:#D7E6F5; margin:0;">${reason}</p>
                </div>
            `);
            showError('La reserva no esta activa para ingreso');
            return;
        }

        const reason = escapeHtml(result.message || result.error || 'No tiene reserva registrada');
        openQrResultModal(`
            <div style="padding:8px 4px 0; text-align:center;">
                <div style="font-size:48px; line-height:1; margin-bottom:10px;">❌</div>
                <h3 style="color:#FF8E8E; margin:0 0 8px 0;">Sin reserva activa</h3>
                <p style="color:#D7E6F5; margin:0;">${reason}</p>
            </div>
        `);
        showError('No tiene reserva registrada');
    } catch (error) {
        console.error('❌ Error validando token QR:', error);
        closeQrValidatorModal();
        openQrResultModal(`
            <div style="padding:8px 4px 0; text-align:center;">
                <div style="font-size:48px; line-height:1; margin-bottom:10px;">⚠️</div>
                <h3 style="color:#FF8E8E; margin:0 0 8px 0;">Error de validacion</h3>
                <p style="color:#D7E6F5; margin:0;">No se pudo validar el QR en este momento.</p>
            </div>
        `);
        showError('Error validando token QR');
    } finally {
        isQrValidationInProgress = false;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadReservations();
    startReservationsAutoRefresh();
    
    const closeBtn = document.querySelector('#qrModal .close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeQRModal);
    
    const modal = document.getElementById('qrModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeQRModal();
    });

    const scanQrBtn = document.getElementById('scanQrBtn');
    if (scanQrBtn) {
        scanQrBtn.addEventListener('click', openQrValidatorModal);
    } else {
        console.warn('⚠️ No se encontro #scanQrBtn en la pagina de reservas');
    }

    const closeQrValidatorBtn = document.getElementById('closeQrValidatorModal');
    if (closeQrValidatorBtn) {
        closeQrValidatorBtn.addEventListener('click', closeQrValidatorModal);
    }

    const qrValidatorModal = document.getElementById('qrValidatorModal');
    if (qrValidatorModal) {
        qrValidatorModal.addEventListener('click', (e) => {
            if (e.target === qrValidatorModal) closeQrValidatorModal();
        });
    }

    const validateManualTokenBtn = document.getElementById('validateManualTokenBtn');
    if (validateManualTokenBtn) {
        validateManualTokenBtn.addEventListener('click', validateManualTokenInput);
    }

    const manualQrTokenInput = document.getElementById('manualQrToken');
    if (manualQrTokenInput) {
        manualQrTokenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                validateManualTokenInput();
            }
        });
    }

    const closeQrResultBtn = document.getElementById('closeQrResultModal');
    if (closeQrResultBtn) {
        closeQrResultBtn.addEventListener('click', closeQrResultModal);
    }

    const qrResultModal = document.getElementById('qrValidationResultModal');
    if (qrResultModal) {
        qrResultModal.addEventListener('click', (e) => {
            if (e.target === qrResultModal) closeQrResultModal();
        });
    }
    
    const filterSelect = document.getElementById('filterStatus');
    if (filterSelect) {
        currentStatusFilter = filterSelect.value || '';
        filterSelect.addEventListener('change', (e) => filterReservations(e.target.value));
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentSearchQuery = searchInput.value || '';
        searchInput.addEventListener('input', (e) => searchReservations(e.target.value));
    }

    // Evita que el auto-refresh interrumpa la seleccion en filtros/edicion de estado.
    document.addEventListener('focusin', (event) => {
        const target = event.target;
        if (target instanceof Element && target.matches('#filterStatus, .status-editor-select')) {
            stopReservationsAutoRefresh();
        }
    });

    document.addEventListener('focusout', (event) => {
        const target = event.target;
        if (target instanceof Element && target.matches('#filterStatus, .status-editor-select')) {
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    startReservationsAutoRefresh();
                }
            }, 150);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadReservations();
            startReservationsAutoRefresh();
        } else {
            stopReservationsAutoRefresh();
            stopQrScanner();
        }
    });

    window.addEventListener('beforeunload', () => {
        stopReservationsAutoRefresh();
        stopQrScanner();
    });
});
