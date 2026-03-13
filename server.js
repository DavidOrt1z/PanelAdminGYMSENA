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
