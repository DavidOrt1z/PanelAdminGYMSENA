// ==================== FUNCIONES DE API ====================

// Espera a que config.js cargue las credenciales antes de usarlas
const getAuthHeader = async () => {
    await window.configReady;
    // El panel admin usa su propio sistema de auth. Para las peticiones a Supabase
    // se usa la anon key como Bearer para aprovechar las políticas RLS del rol 'anon'
    // que permiten gestión completa de slots, staff, users, etc.
    return {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    };
};

const getAuthToken = async () => {
    await window.configReady;
    return window.SUPABASE_ANON_KEY;
};

// ==================== USUARIOS ====================

async function getUsers() {
    try {
        await window.configReady;
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/users?select=*&order=fecha_creacion.desc`,
            {
                method: 'GET',
                headers: await getAuthHeader()
            }
        );

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Error fetching users: ${response.status} ${err}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function createUser(userData) {
    try {
        await window.configReady;
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/users`,
            {
                method: 'POST',
                headers: await getAuthHeader(),
                body: JSON.stringify(userData)
            }
        );

        if (!response.ok) throw new Error('Error creating user');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function createAdminUser(userData) {
    try {
        // Crear usuario en Auth Y tabla personal vía servidor Node.js
        console.log('🔐 Creando usuario en Auth y tabla personal (vía servidor)...');
        console.log('📤 Datos enviados:', {
            email: userData.correo_electronico,
            nombre_completo: userData.nombre_completo,
            rol: userData.rol,
            telefono: userData.telefono,
            password: '***'
        });
        
        const authResponse = await fetch(
            `${window.API_BASE}/api/create-admin-user`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: userData.correo_electronico,
                    password: userData.password,
                    nombre_completo: userData.nombre_completo,
                    rol: userData.rol,
                    telefono: userData.telefono
                })
            }
        );

        console.log('📊 Auth response status:', authResponse.status);
        console.log('📊 Auth response headers:', authResponse.headers);
        
        // Primero intenta leer el texto para debuguear
        const authText = await authResponse.text();
        console.log('📊 Auth response raw text:', authText);
        console.log('📊 Auth response text length:', authText.length);
        
        if (!authText || authText.trim() === '') {
            console.error('❌ CRITICAL: Servidor no devolvió respuesta');
            console.error('❌ Status code:', authResponse.status);
            throw new Error('El servidor no respondió correctamente (respuesta vacía). Revisa que el servidor esté corriendo.');
        }
        
        let authData;
        try {
            authData = JSON.parse(authText);
        } catch (parseError) {
            console.error('❌ Error parsing JSON:', parseError.message);
            console.error('❌ Received text:', authText);
            throw new Error(`Error parsing server response: "${authText.substring(0, 100)}"`);
        }
        
        console.log('Auth response data:', authData);
        
        if (!authResponse.ok) {
            const errorMsg = authData.error || authData.message || 'Error desconocido en autenticación';
            console.error('❌ Error en Auth:', errorMsg);
            throw new Error(errorMsg);
        }

        if (!authData.user) {
            throw new Error('No se devolvió información del usuario creado');
        }

        console.log('✅ Usuario creado en Auth:', authData.user.id);
        
        // El servidor ya guardó en las tablas users y personal
        // Solo retornamos la respuesta del servidor
        if (authData.staff) {
            console.log('✅ Personal guardado en BD:', authData.staff.id);
        }
        
        return authData;
    } catch (error) {
        console.error('❌ Error en createAdminUser:', error);
        throw error;
    }
}

async function updateUser(userId, userData) {
    try {
        await window.configReady;
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
            {
                method: 'PATCH',
                headers: await getAuthHeader(),
                body: JSON.stringify(userData)
            }
        );

        if (!response.ok) throw new Error('Error updating user');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// ==================== RESERVAS ====================

async function getReservations(filter = null) {
    await window.configReady;

    const params = new URLSearchParams();
    if (filter && filter !== '') {
        params.set('estado', filter);
    }

    // Intento 1: backend local (service role)
    try {
        const backendUrl = `${window.API_BASE}/api/get-reservations${params.toString() ? `?${params.toString()}` : ''}`;
        const backendResponse = await fetch(backendUrl, { method: 'GET' });

        if (backendResponse.ok) {
            const backendData = await backendResponse.json();
            return Array.isArray(backendData) ? backendData : [];
        }

        console.warn('⚠️ Backend /api/get-reservations no disponible, usando fallback REST');
    } catch (backendError) {
        console.warn('⚠️ Backend local no responde, usando fallback REST:', backendError.message);
    }

    // Intento 2: REST directo a Supabase
    try {
        let url = `${window.SUPABASE_URL}/rest/v1/reservas?select=*&order=fecha_creacion.desc`;
        if (filter && filter !== '') {
            url += `&estado=eq.${filter}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: await getAuthHeader()
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Error fetching reservations: ${response.status} ${err}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function updateReservationStatus(reservationId, status) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?id=eq.${reservationId}`,
            {
                method: 'PATCH',
                headers: await getAuthHeader(),
                body: JSON.stringify({ estado: status })
            }
        );

        if (!response.ok) throw new Error('Error updating reservation');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function cancelReservation(reservationId) {
    return updateReservationStatus(reservationId, 'cancelled');
}

// ==================== HORARIOS (SLOTS) ====================

async function getSlots() {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/franjas_horarias?order=fecha.asc,hora_inicio.asc`,
            {
                method: 'GET',
                headers: await getAuthHeader()
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error('getSlots error:', response.status, err);
            throw new Error('Error fetching slots');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function createSlot(slotData) {
    try {
        const headers = await getAuthHeader();
        headers['Prefer'] = 'return=representation';
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/franjas_horarias`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(slotData)
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error('createSlot error:', err);
            throw new Error('Error creating slot');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function updateSlot(slotId, slotData) {
    try {
        const headers = await getAuthHeader();
        headers['Prefer'] = 'return=representation';
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/franjas_horarias?id=eq.${slotId}`,
            {
                method: 'PATCH',
                headers,
                body: JSON.stringify(slotData)
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error('updateSlot error:', err);
            throw new Error('Error updating slot');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function deleteSlot(slotId) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/franjas_horarias?id=eq.${slotId}`,
            {
                method: 'DELETE',
                headers: await getAuthHeader()
            }
        );

        if (!response.ok) throw new Error('Error deleting slot');
        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

// ==================== PERSONAL (STAFF) ====================

async function getStaff() {
    try {
        await window.configReady;
        console.log('📋 Obteniendo personal de Supabase...');
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/personal?order=fecha_creacion.desc`,
            {
                method: 'GET',
                headers: await getAuthHeader()
            }
        );

        if (!response.ok) {
            console.error('❌ Error fetching staff:', response.status);
            return [];
        }

        const data = await response.json();
        console.log('✅ Personal obtenido:', data.length);
        return data;
    } catch (error) {
        console.error('❌ Error en getStaff:', error);
        return [];
    }
}

async function createStaff(staffData) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/personal`,
            {
                method: 'POST',
                headers: await getAuthHeader(),
                body: JSON.stringify(staffData)
            }
        );

        if (!response.ok) throw new Error('Error creating staff');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function updateStaff(staffId, staffData) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/personal?id=eq.${staffId}`,
            {
                method: 'PATCH',
                headers: await getAuthHeader(),
                body: JSON.stringify(staffData)
            }
        );

        if (!response.ok) throw new Error('Error updating staff');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// ==================== EQUIPAMIENTO ====================

async function getEquipment() {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/equipment`,
            {
                method: 'GET',
                headers: await getAuthHeader()
            }
        );

        if (!response.ok) throw new Error('Error fetching equipment');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function createEquipment(equipmentData) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/equipment`,
            {
                method: 'POST',
                headers: await getAuthHeader(),
                body: JSON.stringify(equipmentData)
            }
        );

        if (!response.ok) throw new Error('Error creating equipment');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function updateEquipment(equipmentId, equipmentData) {
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/equipment?id=eq.${equipmentId}`,
            {
                method: 'PATCH',
                headers: await getAuthHeader(),
                body: JSON.stringify(equipmentData)
            }
        );

        if (!response.ok) throw new Error('Error updating equipment');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// ==================== ESTADÍSTICAS ====================

async function getStatistics() {
    try {
        await window.configReady;
        const headers = await getAuthHeader();

        // Fecha de hoy en formato ISO para filtrar reservas de hoy
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        // Llamar todo en paralelo directamente a Supabase
        const [usersRes, slotsRes, reservasHoyRes, recentStaffRes, recentReservasRes] = await Promise.all([
            fetch(`${window.SUPABASE_URL}/rest/v1/users?select=id`, { headers: { ...headers, 'Prefer': 'count=exact' } }),
            fetch(`${window.SUPABASE_URL}/rest/v1/franjas_horarias?select=id`, { headers: { ...headers, 'Prefer': 'count=exact' } }),
            fetch(`${window.SUPABASE_URL}/rest/v1/reservas?select=id&fecha_creacion=gte.${todayISO}`, { headers: { ...headers, 'Prefer': 'count=exact' } }),
            fetch(`${window.SUPABASE_URL}/rest/v1/personal?select=id,nombre_completo,rol,correo_electronico,fecha_creacion&order=fecha_creacion.desc&limit=5`, { headers }),
            fetch(`${window.SUPABASE_URL}/rest/v1/reservas?select=id,id_usuario,estado,fecha_creacion&order=fecha_creacion.desc&limit=5`, { headers })
        ]);

        // Extraer conteos del header Content-Range
        const parseCount = (res) => {
            const range = res.headers.get('Content-Range');
            if (!range) return 0;
            const parts = range.split('/');
            return parseInt(parts[1]) || 0;
        };

        const totalUsers       = parseCount(usersRes);
        const totalSlots       = parseCount(slotsRes);
        const todayReservations = parseCount(reservasHoyRes);
        const recentStaff      = usersRes.ok ? await recentStaffRes.json() : [];
        const recentReservas   = reservasHoyRes.ok ? await recentReservasRes.json() : [];

        // Construir actividad reciente
        const activities = [];
        (Array.isArray(recentStaff) ? recentStaff : []).forEach(s => {
            activities.push({
                tipo: 'Personal',
                descripcion: `Nuevo administrador: ${s.nombre_completo} (${s.rol})`,
                usuario: s.correo_electronico,
                fecha: s.fecha_creacion
            });
        });
        const mapReservationStatusToEs = (status) => {
            switch (String(status || '').toLowerCase().trim()) {
                case 'active':
                    return 'activa';
                case 'cancelled':
                    return 'cancelada';
                case 'completed':
                    return 'completada';
                case 'created':
                    return 'creada';
                default:
                    return status || 'creada';
            }
        };

        (Array.isArray(recentReservas) ? recentReservas : []).forEach(r => {
            activities.push({
                tipo: 'Reserva',
                descripcion: `Reserva ${mapReservationStatusToEs(r.estado)}`,
                usuario: r.id_usuario,
                fecha: r.fecha_creacion
            });
        });
        activities.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        return {
            totalUsers,
            todayReservations,
            totalSlots,
            recentActivity: activities.slice(0, 8)
        };
    } catch (error) {
        console.error('Error en getStatistics:', error);
        return { totalUsers: 0, todayReservations: 0, totalSlots: 0, recentActivity: [] };
    }
}
