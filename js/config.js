// ⚙️ CONFIGURACIÓN DE SUPABASE - GYM SENA

// URL base del servidor Node.js.
// En desarrollo local usa localhost:5500; en produccion usa el mismo dominio.
const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
window.API_BASE = isLocalHost ? 'http://localhost:5500' : window.location.origin;

// Promesa global que resuelve cuando las credenciales están listas
window.configReady = (async () => {
    try {
        const res = await fetch(`${window.API_BASE}/api/config`);
        if (!res.ok) throw new Error('No se pudo cargar /api/config');
        const { supabaseUrl, supabaseKey } = await res.json();
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Configuracion incompleta recibida desde /api/config');
        }
        window.SUPABASE_URL = supabaseUrl;
        window.SUPABASE_ANON_KEY = supabaseKey;
    } catch (error) {
        console.error('❌ Error cargando configuración:', error?.message || error);
        throw error;
    }
})();

// ✅ Uso en otros módulos:
//   await window.configReady;
//   const url = window.SUPABASE_URL;
//   const api = window.API_BASE;  → 'http://localhost:5500'
