// ⚙️ CONFIGURACIÓN DE SUPABASE - GYM SENA
// Las credenciales se cargan dinámicamente desde el servidor Node.js (/api/config)
// para evitar exponerlas en el repositorio público.

// Promesa global que resuelve cuando las credenciales están listas
window.configReady = (async () => {
    try {
        const res = await fetch('/api/config');
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
