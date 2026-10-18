import { config } from '../config/env.js';
import { logsRepository } from '../repositories/logsRepository.js';

/** URL canónica de un recurso, usada en la cabecera Location de las respuestas 201. */
export const urlRecurso = (...segmentos) => [config.prefijoApi, ...segmentos].join('/');

/** Guarda en MongoDB un evento de auditoría (qué se cambió, en qué recurso y en qué petición). */
export const auditar = (req, accion, entidad, id, cambios) => logsRepository.registrar('auditoria', {
    idPeticion: req.id,
    accion,
    entidad,
    id: String(id),
    ...(cambios && { cambios })
});
