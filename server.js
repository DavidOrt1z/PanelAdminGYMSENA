require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || process.env.ADMIN_PANEL_PORT || 3000;

// Redirigir la raíz explícitamente al login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Servir archivos estáticos del panel admin
app.use(express.static(path.join(__dirname)));

// Endpoint seguro para exponer solo las variables necesarias al frontend
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_ANON_KEY
    });
});

// Redirigir rutas desconocidas al login
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, () => {
    console.log(`✅ GYM SENA Admin Panel corriendo en http://localhost:${PORT}`);
});
