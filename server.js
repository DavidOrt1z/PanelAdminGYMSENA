require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.ADMIN_PANEL_PORT || 5500;

console.log('🚀 Iniciando servidor GYM SENA Admin Panel...');
console.log(`📁 __dirname: ${__dirname}`);
console.log(`🔧 Variables de entorno cargadas`);

// Verificar variables críticas
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('❌ CRÍTICO: Faltan variables de Supabase');
    console.error(`   SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}`);
    console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅' : '❌'}`);
    console.error(`   SUPABASE_ANON_KEY: ${anonKey ? '✅' : '❌'}`);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
console.log('✅ Supabase inicializado correctamente');

// Middleware
app.use(express.json());

// CORS - Permitir requests desde cualquier origen
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ============================================
// RUTAS DE API
// ============================================

// Ruta de config - CRÍTICA para inicializar el frontend
app.get('/api/config', (req, res) => {
    console.log('📡 [GET /api/config] Solicitada');
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_ANON_KEY
    });
});

// Ruta para obtener personal
app.get('/api/get-staff', async (req, res) => {
    try {
        console.log(`\n📋 [GET /api/get-staff] Solicitud recibida`);
        
        const { data: staffData, error: staffError } = await supabase
            .from('personal')
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (staffError) {
            console.log(`❌ Error obteniendo personal: ${staffError.message}`);
            return res.status(400).json({
                error: staffError.message,
                data: []
            });
        }

        console.log(`✅ Personal obtenido: ${staffData?.length || 0} registros`);
        res.status(200).json(staffData || []);

    } catch (error) {
        console.error(`❌ ERROR en /api/get-staff:`, error.message);
        res.status(500).json({
            error: error.message,
            data: []
        });
    }
});

// Ruta para obtener reservas (usa service role para evitar bloqueos RLS del panel)
app.get('/api/get-reservations', async (req, res) => {
    try {
        const { estado } = req.query;

        let query = supabase
            .from('reservas')
            .select('id, id_usuario, id_franja_horaria, estado, fecha_creacion, token_qr')
            .order('fecha_creacion', { ascending: false });

        if (estado) {
            query = query.eq('estado', estado);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(400).json({ error: error.message, data: [] });
        }

        // Enriquecer reservas con datos de horario en una sola respuesta
        const reservationRows = data || [];
        const slotIds = [...new Set(reservationRows.map(r => r.id_franja_horaria).filter(Boolean))];
        let slotsMap = new Map();

        if (slotIds.length > 0) {
            const { data: slotsData, error: slotsError } = await supabase
                .from('franjas_horarias')
                .select('id, hora_inicio, hora_fin, fecha')
                .in('id', slotIds);

            if (!slotsError) {
                slotsMap = new Map((slotsData || []).map(s => [String(s.id), s]));
            } else {
                console.log('⚠️ No se pudieron enriquecer horarios en /api/get-reservations:', slotsError.message);
            }
        }

        const enrichedRows = reservationRows.map(r => {
            const slot = slotsMap.get(String(r.id_franja_horaria));
            return {
                ...r,
                hora_inicio: slot?.hora_inicio || null,
                hora_fin: slot?.hora_fin || null,
                fecha_horario: slot?.fecha || null
            };
        });

        return res.status(200).json(enrichedRows);
    } catch (error) {
        console.error('❌ ERROR en /api/get-reservations:', error.message);
        return res.status(500).json({ error: error.message, data: [] });
    }
});

function parseQrToken(rawToken) {
    const raw = String(rawToken || '').trim();
    if (!raw) return '';

    let token = raw;
    try {
        const parsedUrl = new URL(raw);
        token = parsedUrl.searchParams.get('token') || raw;
    } catch (_) {
        // No es URL valida; usar valor original.
    }

    token = String(token).trim();
    if (token.startsWith('resv:')) {
        token = token.slice(5).trim();
    }

    return token;
}

async function findReservationByTokenOrId(token) {
    let reservation = null;

    const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select('id, id_usuario, id_franja_horaria, estado, fecha_creacion, token_qr')
        .eq('token_qr', token)
        .order('fecha_creacion', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!reservasError && reservasData) {
        reservation = reservasData;
    }

    if (!reservation) {
        const { data: byIdData, error: byIdError } = await supabase
            .from('reservas')
            .select('id, id_usuario, id_franja_horaria, estado, fecha_creacion, token_qr')
            .eq('id', token)
            .order('fecha_creacion', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!byIdError && byIdData) {
            reservation = byIdData;
        }
    }

    return reservation;
}

async function completeReservationBySource(reservationId) {
    const nowIso = new Date().toISOString();

    const payloadCandidates = [
        { estado: 'completed', fecha_actualizacion: nowIso, completed_at: nowIso },
        { estado: 'completed', fecha_actualizacion: nowIso },
        { estado: 'completed' }
    ];

    let updateError = null;
    for (const payload of payloadCandidates) {
        const { error } = await supabase
            .from('reservas')
            .update(payload)
            .eq('id', reservationId);

        if (!error) {
            updateError = null;
            break;
        }

        updateError = error;
    }

    if (updateError) {
        return { ok: false, error: updateError.message };
    }

    const { data: verifyRow } = await supabase
        .from('reservas')
        .select('estado')
        .eq('id', reservationId)
        .maybeSingle();

    const completed = String(verifyRow?.estado || '').toLowerCase().trim() === 'completed';
    return { ok: completed, error: completed ? null : 'No se confirmo estado completed en reservas' };
}

async function setReservationStatusById(reservationId, nextStatus) {
    const validStatuses = new Set(['active', 'completed', 'cancelled']);
    const normalizedStatus = String(nextStatus || '').toLowerCase().trim();

    if (!validStatuses.has(normalizedStatus)) {
        return { ok: false, code: 400, message: 'Estado invalido' };
    }

    const { data: rowInReservas } = await supabase
        .from('reservas')
        .select('id')
        .eq('id', reservationId)
        .maybeSingle();

    if (rowInReservas?.id) {
        const nowIso = new Date().toISOString();
        const payloadCandidates = [
            { estado: normalizedStatus, fecha_actualizacion: nowIso },
            { estado: normalizedStatus }
        ];

        let updateError = null;
        for (const payload of payloadCandidates) {
            const { error } = await supabase
                .from('reservas')
                .update(payload)
                .eq('id', reservationId);

            if (!error) {
                updateError = null;
                break;
            }
            updateError = error;
        }

        if (updateError) {
            return { ok: false, code: 400, message: updateError.message };
        }

        const { data: verifyRow } = await supabase
            .from('reservas')
            .select('estado')
            .eq('id', reservationId)
            .maybeSingle();

        return {
            ok: String(verifyRow?.estado || '').toLowerCase().trim() === normalizedStatus,
            code: 200,
            source: 'reservas',
            status: String(verifyRow?.estado || '').toLowerCase().trim() || normalizedStatus,
            message: 'Estado actualizado'
        };
    }

    return { ok: false, code: 404, message: 'Reserva no encontrada' };
}

async function buildQrLookupPayload(rawToken, completeActiveReservation = false) {
    const token = parseQrToken(rawToken);
    if (!token) {
        return {
            code: 400,
            body: {
                found: false,
                valid: false,
                message: 'Token QR invalido'
            }
        };
    }

    const reservation = await findReservationByTokenOrId(token);

    if (!reservation) {
        return {
            code: 200,
            body: {
                found: false,
                valid: false,
                message: 'No tiene reserva registrada con ese QR'
            }
        };
    }

    const userId = reservation.id_usuario ? String(reservation.id_usuario) : '';
    const slotId = reservation.id_franja_horaria ? String(reservation.id_franja_horaria) : '';

    let user = null;
    if (userId) {
        const { data: userData } = await supabase
            .from('users')
            .select('id, id_autenticacion, nombre_completo, nombre, apellido, correo_electronico, email')
            .or(`id.eq.${userId},id_autenticacion.eq.${userId}`)
            .order('fecha_creacion', { ascending: false })
            .limit(1)
            .maybeSingle();
        user = userData || null;
    }

    let slot = null;
    if (slotId) {
        const { data: slotData } = await supabase
            .from('franjas_horarias')
            .select('id, fecha, hora_inicio, hora_fin')
            .eq('id', slotId)
            .maybeSingle();
        slot = slotData || null;
    }

    const estadoOriginal = String(reservation.estado || '').toLowerCase().trim();
    let estadoFinal = estadoOriginal;
    let message = 'Reserva encontrada';

    if (completeActiveReservation && estadoOriginal === 'active') {
        const completionResult = await completeReservationBySource(reservation.id);
        if (completionResult.ok) {
            estadoFinal = 'completed';
            message = 'Ingreso validado. Reserva completada automaticamente.';
        } else {
            message = 'Reserva valida, pero no se pudo actualizar a completada.';
            console.log('⚠️ No se pudo marcar la reserva como completada:', completionResult.error || 'sin detalle');
        }
    }

    const isValidReservation = estadoFinal === 'active' || estadoFinal === 'completed';

    let userName = user?.nombre_completo
        || [user?.nombre, user?.apellido].filter(Boolean).join(' ').trim()
        || null;
    let userEmail = user?.correo_electronico || user?.email || null;

    if (userId && (!userName || !userEmail)) {
        const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(userId);
        if (!authUserError && authUserData?.user) {
            const authUser = authUserData.user;
            const metadata = authUser.user_metadata || {};
            userName = userName
                || metadata.nombre_completo
                || metadata.full_name
                || metadata.name
                || null;
            userEmail = userEmail || authUser.email || null;
        }
    }

    if (userEmail && !userName) {
        const { data: userByEmailData, error: userByEmailError } = await supabase
            .from('users')
            .select('nombre_completo, nombre, apellido, correo_electronico, email')
            .or(`correo_electronico.eq.${userEmail},email.eq.${userEmail}`)
            .order('fecha_creacion', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!userByEmailError && userByEmailData) {
            userName = userName
                || userByEmailData.nombre_completo
                || [userByEmailData.nombre, userByEmailData.apellido].filter(Boolean).join(' ').trim()
                || null;
            userEmail = userEmail || userByEmailData.correo_electronico || userByEmailData.email || null;
        }
    }

    return {
        code: 200,
        body: {
            found: true,
            valid: isValidReservation,
            reservation_id: reservation.id,
            status: estadoFinal || 'unknown',
            message: isValidReservation
                ? message
                : 'La reserva no esta activa para ingreso',
            usuario_nombre: userName,
            usuario_email: userEmail,
            fecha_horario: slot?.fecha || null,
            hora_inicio: slot?.hora_inicio || null,
            hora_fin: slot?.hora_fin || null
        }
    };
}

// Ruta solo de consulta QR (sin efectos secundarios)
app.get('/api/qr-lookup', async (req, res) => {
    try {
        const result = await buildQrLookupPayload(req.query.token, false);
        return res.status(result.code).json(result.body);
    } catch (error) {
        console.error('❌ ERROR en /api/qr-lookup:', error.message);
        return res.status(500).json({
            found: false,
            valid: false,
            message: 'Error consultando QR',
            error: error.message
        });
    }
});

async function updateRowWithTimestampFallback(tableName, id, payload, timestampColumnCandidates = []) {
    const safePayload = { ...(payload || {}) };

    const attempts = [];
    if (timestampColumnCandidates.length > 0) {
        for (const tsColumn of timestampColumnCandidates) {
            attempts.push({ ...safePayload, [tsColumn]: new Date().toISOString() });
        }
    }
    attempts.push(safePayload);

    let lastError = null;
    for (const candidate of attempts) {
        const { error } = await supabase
            .from(tableName)
            .update(candidate)
            .eq('id', id);

        if (!error) {
            return { ok: true };
        }
        lastError = error;
    }

    return { ok: false, error: lastError };
}

app.patch('/api/users/:userId', async (req, res) => {
    try {
        const userId = String(req.params.userId || '').trim();
        if (!userId) return res.status(400).json({ ok: false, message: 'ID de usuario invalido' });

        const payload = req.body || {};
        const result = await updateRowWithTimestampFallback('users', userId, payload, ['fecha_actualizacion', 'updated_at']);
        if (!result.ok) {
            return res.status(400).json({ ok: false, message: result.error?.message || 'No se pudo actualizar usuario' });
        }

        return res.status(200).json({ ok: true, message: 'Usuario actualizado' });
    } catch (error) {
        console.error('❌ ERROR en PATCH /api/users/:userId:', error.message);
        return res.status(500).json({ ok: false, message: 'Error actualizando usuario' });
    }
});

app.delete('/api/users/:userId', async (req, res) => {
    try {
        const userId = String(req.params.userId || '').trim();
        if (!userId) return res.status(400).json({ ok: false, message: 'ID de usuario invalido' });

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            return res.status(400).json({ ok: false, message: error.message || 'No se pudo eliminar usuario' });
        }

        return res.status(200).json({ ok: true, message: 'Usuario eliminado' });
    } catch (error) {
        console.error('❌ ERROR en DELETE /api/users/:userId:', error.message);
        return res.status(500).json({ ok: false, message: 'Error eliminando usuario' });
    }
});

app.patch('/api/staff/:staffId', async (req, res) => {
    try {
        const staffId = String(req.params.staffId || '').trim();
        if (!staffId) return res.status(400).json({ ok: false, message: 'ID de personal invalido' });

        const payload = req.body || {};
        const result = await updateRowWithTimestampFallback('personal', staffId, payload, ['fecha_actualizacion', 'updated_at']);
        if (!result.ok) {
            return res.status(400).json({ ok: false, message: result.error?.message || 'No se pudo actualizar personal' });
        }

        return res.status(200).json({ ok: true, message: 'Personal actualizado' });
    } catch (error) {
        console.error('❌ ERROR en PATCH /api/staff/:staffId:', error.message);
        return res.status(500).json({ ok: false, message: 'Error actualizando personal' });
    }
});

app.delete('/api/staff/:staffId', async (req, res) => {
    try {
        const staffId = String(req.params.staffId || '').trim();
        if (!staffId) return res.status(400).json({ ok: false, message: 'ID de personal invalido' });

        const { error } = await supabase
            .from('personal')
            .delete()
            .eq('id', staffId);

        if (error) {
            return res.status(400).json({ ok: false, message: error.message || 'No se pudo eliminar personal' });
        }

        return res.status(200).json({ ok: true, message: 'Personal eliminado' });
    } catch (error) {
        console.error('❌ ERROR en DELETE /api/staff/:staffId:', error.message);
        return res.status(500).json({ ok: false, message: 'Error eliminando personal' });
    }
});

app.patch('/api/slots/:slotId', async (req, res) => {
    try {
        const slotId = String(req.params.slotId || '').trim();
        if (!slotId) return res.status(400).json({ ok: false, message: 'ID de horario invalido' });

        const payload = req.body || {};
        const result = await updateRowWithTimestampFallback('franjas_horarias', slotId, payload, ['fecha_actualizacion', 'updated_at']);
        if (!result.ok) {
            return res.status(400).json({ ok: false, message: result.error?.message || 'No se pudo actualizar horario' });
        }

        return res.status(200).json({ ok: true, message: 'Horario actualizado' });
    } catch (error) {
        console.error('❌ ERROR en PATCH /api/slots/:slotId:', error.message);
        return res.status(500).json({ ok: false, message: 'Error actualizando horario' });
    }
});

app.delete('/api/slots/:slotId', async (req, res) => {
    try {
        const slotId = String(req.params.slotId || '').trim();
        if (!slotId) return res.status(400).json({ ok: false, message: 'ID de horario invalido' });

        const { error } = await supabase
            .from('franjas_horarias')
            .delete()
            .eq('id', slotId);

        if (error) {
            return res.status(400).json({ ok: false, message: error.message || 'No se pudo eliminar horario' });
        }

        return res.status(200).json({ ok: true, message: 'Horario eliminado' });
    } catch (error) {
        console.error('❌ ERROR en DELETE /api/slots/:slotId:', error.message);
        return res.status(500).json({ ok: false, message: 'Error eliminando horario' });
    }
});

app.delete('/api/reservations/:reservationId', async (req, res) => {
    try {
        const reservationId = String(req.params.reservationId || '').trim();
        if (!reservationId) return res.status(400).json({ ok: false, message: 'ID de reserva invalido' });

        const { error } = await supabase
            .from('reservas')
            .delete()
            .eq('id', reservationId);

        if (error) {
            return res.status(400).json({ ok: false, message: error.message || 'No se pudo eliminar reserva' });
        }

        return res.status(200).json({ ok: true, message: 'Reserva eliminada' });
    } catch (error) {
        console.error('❌ ERROR en DELETE /api/reservations/:reservationId:', error.message);
        return res.status(500).json({ ok: false, message: 'Error eliminando reserva' });
    }
});

app.patch('/api/equipment/:equipmentId', async (req, res) => {
    try {
        const equipmentId = String(req.params.equipmentId || '').trim();
        if (!equipmentId) return res.status(400).json({ ok: false, message: 'ID de equipo invalido' });

        const payload = req.body || {};
        const result = await updateRowWithTimestampFallback('equipment', equipmentId, payload, ['fecha_actualizacion', 'updated_at']);
        if (!result.ok) {
            return res.status(400).json({ ok: false, message: result.error?.message || 'No se pudo actualizar equipo' });
        }

        return res.status(200).json({ ok: true, message: 'Equipo actualizado' });
    } catch (error) {
        console.error('❌ ERROR en PATCH /api/equipment/:equipmentId:', error.message);
        return res.status(500).json({ ok: false, message: 'Error actualizando equipo' });
    }
});

app.delete('/api/equipment/:equipmentId', async (req, res) => {
    try {
        const equipmentId = String(req.params.equipmentId || '').trim();
        if (!equipmentId) return res.status(400).json({ ok: false, message: 'ID de equipo invalido' });

        const { error } = await supabase
            .from('equipment')
            .delete()
            .eq('id', equipmentId);

        if (error) {
            return res.status(400).json({ ok: false, message: error.message || 'No se pudo eliminar equipo' });
        }

        return res.status(200).json({ ok: true, message: 'Equipo eliminado' });
    } catch (error) {
        console.error('❌ ERROR en DELETE /api/equipment/:equipmentId:', error.message);
        return res.status(500).json({ ok: false, message: 'Error eliminando equipo' });
    }
});

// Ruta de validacion + completado automatico al escanear QR
app.post('/api/qr-validate-and-complete', async (req, res) => {
    try {
        const result = await buildQrLookupPayload(req.body?.token, true);
        return res.status(result.code).json(result.body);
    } catch (error) {
        console.error('❌ ERROR en /api/qr-validate-and-complete:', error.message);
        return res.status(500).json({
            found: false,
            valid: false,
            message: 'Error validando QR',
            error: error.message
        });
    }
});

// Ruta segura para actualizar estado de reserva desde panel
app.post('/api/reservations/:reservationId/status', async (req, res) => {
    try {
        const reservationId = String(req.params.reservationId || '').trim();
        const nextStatus = req.body?.status;

        if (!reservationId) {
            return res.status(400).json({ ok: false, message: 'ID de reserva invalido' });
        }

        const result = await setReservationStatusById(reservationId, nextStatus);
        return res.status(result.code || 500).json({
            ok: !!result.ok,
            source: result.source || null,
            status: result.status || null,
            message: result.message || 'No se pudo actualizar estado'
        });
    } catch (error) {
        console.error('❌ ERROR en /api/reservations/:reservationId/status:', error.message);
        return res.status(500).json({ ok: false, message: 'Error actualizando estado de reserva' });
    }
});

// ============================================
// RUTA PARA ESTADÍSTICAS DEL DASHBOARD
// ============================================
app.get('/api/get-dashboard-stats', async (req, res) => {
    try {
        console.log(`\n📊 [GET /api/get-dashboard-stats] Solicitud recibida`);

        // Obtener conteos en paralelo
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            { count: totalUsers },
            { count: totalSlots },
            { count: todayReservations },
            { data: recentActivity }
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('franjas_horarias').select('*', { count: 'exact', head: true }),
            supabase.from('reservas')
                .select('*', { count: 'exact', head: true })
                .gte('fecha_creacion', today.toISOString()),
            supabase.from('reservas')
                .select('id, id_usuario, estado, fecha_creacion')
                .order('fecha_creacion', { ascending: false })
                .limit(10)
        ]);

        // Actividad reciente: últimos personal creados
        const { data: recentStaff } = await supabase
            .from('personal')
            .select('id, nombre_completo, rol, correo_electronico, fecha_creacion')
            .order('fecha_creacion', { ascending: false })
            .limit(5);

        // Combinar actividades
        const activities = [];

        (recentStaff || []).forEach(s => {
            activities.push({
                tipo: 'Personal',
                descripcion: `Nuevo administrador: ${s.nombre_completo} (${s.rol})`,
                usuario: s.correo_electronico,
                fecha: s.fecha_creacion
            });
        });

        (recentActivity || []).forEach(r => {
            activities.push({
                tipo: 'Reserva',
                descripcion: `Reserva ${r.estado || 'creada'}`,
                usuario: r.id_usuario,
                fecha: r.fecha_creacion
            });
        });

        // Ordenar por fecha más reciente
        activities.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        res.status(200).json({
            totalUsers: totalUsers || 0,
            todayReservations: todayReservations || 0,
            totalSlots: totalSlots || 0,
            recentActivity: activities.slice(0, 8)
        });

    } catch (error) {
        console.error(`❌ ERROR en /api/get-dashboard-stats:`, error.message);
        res.status(500).json({ totalUsers: 0, todayReservations: 0, totalSlots: 0, recentActivity: [] });
    }
});

// ============================================
// RUTA PARA CREAR ADMINISTRADOR
// ============================================
app.post('/api/create-admin-user', async (req, res) => {
    try {
        const { email, password, nombre_completo, rol, telefono } = req.body;

        console.log(`\n📝 [POST /api/create-admin-user] Solicitud recibida`);
        console.log(`   Email: ${email}`);
        console.log(`   Nombre: ${nombre_completo}`);

        if (!email || !password) {
            console.log(`❌ Validación fallida: faltan campos`);
            return res.status(400).json({ 
                error: 'Email y password son requeridos' 
            });
        }

        // 1. Crear usuario en Supabase Auth
        console.log(`🔐 Creando usuario en Auth...`);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                nombre_completo: nombre_completo,
            }
        });

        if (authError) {
            console.log(`❌ Error en Auth: ${authError.message}`);
            
            // Detectar email duplicado
            if (authError.message && authError.message.toLowerCase().includes('already')) {
                return res.status(409).json({
                    error: `El correo "${email}" ya está registrado`,
                    code: 'email_exists'
                });
            }
            
            return res.status(400).json({
                error: authError.message,
                code: 'auth_error'
            });
        }

        if (!authData?.user?.id) {
            console.log(`❌ No se creó usuario en Auth`);
            return res.status(500).json({ 
                error: 'Error al crear usuario en Auth' 
            });
        }

        console.log(`✅ Usuario Auth creado: ${authData.user.id}`);

        // 2. Guardar en tabla personal
        console.log(`💾 Guardando en tabla personal...`);
        const { data: staffData, error: staffError } = await supabase
            .from('personal')
            .insert({
                nombre_completo: nombre_completo,
                rol: rol || 'Instructor',
                correo_electronico: email,
                teléfono: telefono || '',
                estado: 'active'
            })
            .select()
            .single();

        if (staffError) {
            console.log(`⚠️  Error guardando en personal: ${staffError.message}`);
            // No fallar, el usuario en Auth se creó
        } else {
            console.log(`✅ Personal guardado: ${staffData?.id}`);
        }

        // 3. Enviar respuesta
        const response = {
            user: {
                id: authData.user.id,
                email: authData.user.email,
                nombre_completo: nombre_completo
            },
            staff: staffData || null
        };

        console.log(`📤 Enviando respuesta 200 OK`);
        res.status(200).json(response);

    } catch (error) {
        console.error(`❌ ERROR en /api/create-admin-user:`, error.message);
        res.status(500).json({
            error: error.message || 'Error desconocido',
            type: error.name
        });
    }
});

// Servir archivos estáticos desde la carpeta actual
console.log(`📂 Sirviendo archivos estáticos desde: ${__dirname}`);
app.use(express.static(path.join(__dirname)));

// Redirigir raíz al login
app.get('/', (req, res) => {
    console.log('🔄 Redireccionando / a /login.html');
    res.redirect('/login.html');
});

// Catch-all para otras rutas - sirve login.html como SPA
app.get('*', (req, res) => {
    console.log(`📝 Catch-all: Sirviendo login.html para ruta: ${req.path}`);
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Iniciar servidor - con error handling
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log('✅ GYM SENA Admin Panel - SERVIDOR INICIADO');
    console.log(`${'='.repeat(50)}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📧 Login: http://localhost:${PORT}/login.html`);
    console.log(`👥 Personal: http://localhost:${PORT}/personal.html`);
    console.log(`📋 Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`${'='.repeat(50)}\n`);
});

server.on('error', (err) => {
    console.error('❌ Error del servidor:', err);
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('📛 SIGTERM recibido - cerrando servidor');
    server.close(() => process.exit(0));
});
