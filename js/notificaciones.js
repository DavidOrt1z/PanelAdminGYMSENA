/* ==================== NOTIFICACIONES API ====================
   Funciones para enviar notificaciones desde el panel admin
   Inserta directamente en BD y Supabase Realtime las propaga a usuarios
*/

/**
 * Tipos de notificaciones disponibles
 */
const TIPOS_NOTIFICACION = {
    RESERVA_CONFIRMADA: 'reserva_confirmada',
    RECORDATORIO: 'recordatorio_reserva',
    ALERTA_EQUIPAMIENTO: 'alerta_equipamiento',
    CAMBIO_HORARIO: 'cambio_horario'
};

/**
 * Enviar notificación a usuario específico
 * @param {string} usuarioId - ID del usuario
 * @param {string} titulo - Título de la notificación
 * @param {string} cuerpo - Cuerpo del mensaje
 * @param {string} tipo - Tipo de notificación
 * @param {object} datos - Datos adicionales
 */
async function enviarNotificacionAUsuario(usuarioId, titulo, cuerpo, tipo, datos = {}) {
    try {
        console.log('📤 Enviando notificación al usuario:', usuarioId);
        
        // Insertar directamente en BD - Supabase Realtime la propagará
        const { data, error } = await supabase
            .from('notificaciones_historial')
            .insert([
                {
                    usuario_id: usuarioId,
                    titulo: titulo,
                    cuerpo: cuerpo,
                    tipo: tipo,
                    datos: datos,
                    entregada: true,
                    abierta: false
                }
            ])
            .select();

        if (error) throw error;

        console.log('✅ Notificación enviada correctamente');
        return data;
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        throw error;
    }
}

/**
 * Enviar notificación a múltiples usuarios (broadcast)
 * @param {array} usuariosIds - Array de IDs de usuarios
 * @param {string} titulo - Título de la notificación
 * @param {string} cuerpo - Cuerpo del mensaje
 * @param {string} tipo - Tipo de notificación
 */
async function enviarNotificacionBroadcast(usuariosIds, titulo, cuerpo, tipo) {
    try {
        console.log('📤 Enviando notificación broadcast a', usuariosIds.length, 'usuarios');
        
        // Crear registro para cada usuario
        const registros = usuariosIds.map(usuarioId => ({
            usuario_id: usuarioId,
            titulo: titulo,
            cuerpo: cuerpo,
            tipo: tipo,
            datos: {},
            entregada: true,
            abierta: false
        }));

        const { data, error } = await supabase
            .from('notificaciones_historial')
            .insert(registros)
            .select();

        if (error) throw error;

        console.log('✅ Notificaciones enviadas correctamente');
        return data;
    } catch (error) {
        console.error('❌ Error enviando notificaciones:', error);
        throw error;
    }
}

/**
 * Enviar notificación a topic (para admins/personal)
 * @param {string} topic - Nombre del topic (ej: 'admins', 'personal')
 * @param {string} titulo - Título de la notificación
 * @param {string} cuerpo - Cuerpo del mensaje
 * @param {string} tipo - Tipo de notificación
 */
async function enviarNotificacionATopic(topic, titulo, cuerpo, tipo) {
    try {
        console.log('📤 Enviando notificación al topic:', topic);
        
        // Obtener todos los usuarios suscritos al topic
        const { data: suscripciones, error: errorSuscripciones } = await supabase
            .from('notif_suscripciones_topic')
            .select('usuario_id')
            .eq('topic', topic);

        if (errorSuscripciones) throw errorSuscripciones;

        if (!suscripciones || suscripciones.length === 0) {
            console.log('⚠️ No hay usuarios suscritos al topic:', topic);
            return [];
        }

        const usuariosIds = suscripciones.map(s => s.usuario_id);
        return await enviarNotificacionBroadcast(usuariosIds, titulo, cuerpo, tipo);
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        throw error;
    }
}

/**
 * Enviar notificación de confirmación de reserva
 */
async function enviarConfirmacionReserva(usuarioId, detallesReserva) {
    try {
        const titulo = '✅ Reserva Confirmada';
        const cuerpo = `Tu reserva para el ${detallesReserva.fecha} a las ${detallesReserva.hora} ha sido confirmada.`;
        
        await enviarNotificacionAUsuario(
            usuarioId,
            titulo,
            cuerpo,
            TIPOS_NOTIFICACION.RESERVA_CONFIRMADA,
            {
                reservaId: detallesReserva.id,
                fecha: detallesReserva.fecha,
                hora: detallesReserva.hora
            }
        );
    } catch (error) {
        console.error('❌ Error enviando confirmación:', error);
    }
}

/**
 * Enviar recordatorio de reserva (30 minutos antes)
 */
async function enviarRecordatorioReserva(usuarioId, detallesReserva) {
    try {
        const titulo = '⏰ Recordatorio de Reserva';
        const cuerpo = `Tu reserva para GYM SENA es en 30 minutos. ¡No olvides tu DNI!`;
        
        await enviarNotificacionAUsuario(
            usuarioId,
            titulo,
            cuerpo,
            TIPOS_NOTIFICACION.RECORDATORIO,
            {
                reservaId: detallesReserva.id,
                fecha: detallesReserva.fecha,
                hora: detallesReserva.hora
            }
        );
    } catch (error) {
        console.error('❌ Error enviando recordatorio:', error);
    }
}

/**
 * Enviar alerta de equipamiento (mantenimiento/rotura)
 */
async function enviarAlertaEquipamiento(titulo, problema) {
    try {
        const cuerpo = `El equipamiento requiere mantenimiento: ${problema}`;
        
        // Enviar a admins y personal
        await enviarNotificacionATopic(
            'admins',
            '🔧 ' + titulo,
            cuerpo,
            TIPOS_NOTIFICACION.ALERTA_EQUIPAMIENTO
        );

        await enviarNotificacionATopic(
            'personal',
            '🔧 ' + titulo,
            cuerpo,
            TIPOS_NOTIFICACION.ALERTA_EQUIPAMIENTO
        );
    } catch (error) {
        console.error('❌ Error enviando alerta:', error);
    }
}

/**
 * Enviar notificación de cambio de horario
 */
async function enviarNotificacionCambioHorario(usuarios, nuevoHorario) {
    try {
        const titulo = '📅 Cambio de Horario';
        const cuerpo = `Tu horario ha sido modificado a: ${nuevoHorario}`;
        
        for (const usuarioId of usuarios) {
            await enviarNotificacionAUsuario(
                usuarioId,
                titulo,
                cuerpo,
                TIPOS_NOTIFICACION.CAMBIO_HORARIO,
                { nuevoHorario: nuevoHorario }
            );
        }
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
    }
}
