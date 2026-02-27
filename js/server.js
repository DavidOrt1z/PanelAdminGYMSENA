// =====================================================
// SERVIDOR LOCAL PARA PANEL ADMIN
// Ejecutar en terminal: node js/server.js (desde admin-panel/)
// O: node admin-panel/js/server.js (desde raíz del proyecto)
// Luego ir a: http://localhost:3000
// =====================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Permitir CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Ruta predeterminada (sube un nivel porque está en /js)
    let filePath = req.url === '/' ? '/login.html' : req.url;
    filePath = path.join(__dirname, '..', filePath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - Archivo no encontrado</h1>');
            return;
        }

        const extname = path.extname(filePath);
        const contentType = MIME_TYPES[extname] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('\n✅ Servidor iniciado en http://localhost:3000');
    console.log('📱 Abre tu navegador en: http://localhost:3000');
    console.log('🔴 Presiona Ctrl+C para detener\n');
});
