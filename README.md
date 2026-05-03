# Panel Admin JACEK GYM

Panel web administrativo para JACEK GYM con backend Node.js + Express y conexión a Supabase.

## Requisitos

- Node.js 18+
- npm 9+

## Ejecutar en local

1. Instalar dependencias:

```bash
npm install
```

2. Crear archivo `.env` en la raíz de `admin-panel/` con:

```env
SUPABASE_URL=TU_SUPABASE_URL
SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SUPABASE_SERVICE_ROLE_KEY
ADMIN_PANEL_PORT=5500
```

3. Iniciar servidor:

```bash
npm start
```

4. Abrir:

- `http://localhost:5500/login.html`

## Deploy en Render

### Variables de entorno requeridas

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PANEL_PORT` (opcional)

### Comandos en Render

- Build Command:

```bash
npm install
```

- Start Command:

```bash
npm start
```

## Seguridad

- No subir `.env` al repositorio.
- No hardcodear claves en frontend.
- Las credenciales de Supabase se sirven desde `/api/config` del backend.

## Checklist automatizable QR/Reservas

Puedes validar rápido el flujo crítico de reservas y QR con un script:

```bash
npm run check:qr-reservas
```

Variables opcionales para pruebas más completas:

```bash
API_BASE=http://localhost:5500
TEST_RESERVATION_ID=<uuid_reserva>
TEST_QR_TOKEN=<token_o_id_qr>
ALLOW_MUTATION=true
```

Notas:
- Sin `TEST_RESERVATION_ID` o `TEST_QR_TOKEN`, el script ejecuta checks no destructivos.
- Con `ALLOW_MUTATION=true`, también prueba el endpoint que completa la reserva al validar QR.
