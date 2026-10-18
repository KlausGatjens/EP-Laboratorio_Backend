import { STATUS_CODES } from 'node:http';
import { logsRepository } from '../repositories/logsRepository.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';
import { mapearErrorSql } from '../utils/erroresSql.js';

/** Errores de los drivers cuando la base de datos no responde o no hay conexión. */
const ERRORES_CONEXION = new Set([
    'ConnectionError',          // mssql
    'MongoServerSelectionError',
    'MongoNetworkError',
    'MongoNotConnectedError',
    'MongoTopologyClosedError'
]);

const MONGO_VALIDACION_FALLIDA = 121;

/** Ruta inexistente: se ejecuta cuando ningún router respondió. */
export const rutaNoEncontrada = (req, res, next) => {
    next(ErrorHttp.noEncontrado(`No existe la ruta ${req.method} ${req.originalUrl}`));
};

/** Responde 405 e indica en la cabecera Allow los métodos que sí acepta la ruta. */
export const metodoNoPermitido = (metodos) => (req, res, next) => {
    res.set('Allow', metodos.join(', '));
    next(new ErrorHttp(405, `El método ${req.method} no está permitido en esta ruta`));
};

const clasificar = (error) => {
    if (error instanceof ErrorHttp) {
        return { estado: error.estado, mensaje: error.message, detalles: error.detalles };
    }
    if (error.type === 'entity.parse.failed') {
        return { estado: 400, mensaje: 'El cuerpo debe contener un JSON válido' };
    }
    if (error.type === 'entity.too.large') {
        return { estado: 413, mensaje: 'El cuerpo de la petición es demasiado grande' };
    }
    if (ERRORES_CONEXION.has(error.name)) {
        return { estado: 503, mensaje: 'La base de datos no está disponible en este momento' };
    }
    if (error.code === MONGO_VALIDACION_FALLIDA) {
        return { estado: 400, mensaje: 'El documento no cumple el esquema de MongoDB' };
    }
    const sql = mapearErrorSql(error);
    if (sql) return sql;
    return { estado: 500, mensaje: 'Error interno del servidor' };
};

/**
 * Manejador global de errores (4 parámetros => Express lo reconoce como tal).
 * Todas las respuestas de error tienen la misma forma:
 * { estado, error, mensaje, detalles?, idPeticion }
 */
export const manejoErrores = (error, req, res, next) => {
    if (res.headersSent) return next(error);

    const { estado, mensaje, detalles } = clasificar(error);

    // Error inesperado: traza completa. Base no disponible: una línea basta.
    if (estado === 500) console.error(`[${req.id}]`, error);
    else if (estado === 503) console.error(`[${req.id}] ${error.message}`);

    void logsRepository.registrar('error', {
        idPeticion: req.id,
        metodo: req.method,
        ruta: req.originalUrl,
        estado,
        mensaje,
        ...(detalles && { detalles }),
        ...(estado >= 500 && { causa: error.message })
    }, estado >= 500 ? 'error' : 'warn');

    res.status(estado).json({
        estado,
        error: STATUS_CODES[estado],
        mensaje,
        ...(detalles && { detalles }),
        idPeticion: req.id
    });
};
