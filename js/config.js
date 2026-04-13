// ⚙️ CONFIGURACIÓN DE SUPABASE - GYM SENA

// URL base del servidor Node.js.
// En desarrollo local usa localhost:5500; en produccion usa el mismo dominio.
const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
window.API_BASE = isLocalHost ? 'http://localhost:5500' : window.location.origin;

// Promesa global que resuelve cuando las credenciales están listas
window.configReady = (async () => {
    try {
        const res = await fetch(`${window.API_BASE}/api/config`);
        if (!res.ok) throw new Error('Fallback a credenciales locales');
        const { supabaseUrl, supabaseKey } = await res.json();
        window.SUPABASE_URL = supabaseUrl;
        window.SUPABASE_ANON_KEY = supabaseKey;
    } catch {
        // Fallback: valores directos para desarrollo con Live Server
        window.SUPABASE_URL = 'https://zvcsywnmscnjlxvmtkqb.supabase.co';
        window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2Y3N5d25tc2Nuamx4dm10a3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwODcwNzYsImV4cCI6MjA4MTY2MzA3Nn0.d2n0Drx9aMlOUzBK4gmI7lT4Vw_OAtuAkgJ1T9f56KM';
    }
})();

// ✅ Uso en otros módulos:
//   await window.configReady;
//   const url = window.SUPABASE_URL;
//   const api = window.API_BASE;  → 'http://localhost:5500'
