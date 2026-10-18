import { ObjectId } from 'mongodb';
import { COLECCIONES, coleccion } from '../db/mongodb.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

/**
 * Reseñas de las visitas (colección `comentarios` de MongoDB).
 * Los datos de la mesa y del autor se guardan embebidos (desnormalizados a
 * propósito) para leer las reseñas sin consultar SQL Server.
 */
const comentarios = () => coleccion(COLECCIONES.comentarios);

const CLAVE_DUPLICADA = 11000;

const redondear = (campo) => ({ $round: [campo, 2] });

export const comentariosRepository = {
    async listar({ idMesa, idUsuario, calificacionMinima, buscar, pagina = 1, limite = 20 } = {}) {
        const filtro = {};
        if (idMesa !== undefined) filtro['mesa.idMesa'] = idMesa;
        if (idUsuario !== undefined) filtro['autor.idUsuario'] = idUsuario;
        if (calificacionMinima !== undefined) filtro.calificacion = { $gte: calificacionMinima };
        if (buscar) filtro.$text = { $search: buscar }; // índice de texto en español

        const [datos, total] = await Promise.all([
            comentarios().find(filtro).sort({ fecha: -1 }).skip((pagina - 1) * limite).limit(limite).toArray(),
            comentarios().countDocuments(filtro)
        ]);
        return { pagina, limite, total, datos };
    },

    async obtener(id) {
        return comentarios().findOne({ _id: new ObjectId(id) });
    },

    async existeParaReserva(idReserva) {
        return (await comentarios().countDocuments({ idReserva }, { limit: 1 })) > 0;
    },

    async crear(documento) {
        try {
            const { insertedId } = await comentarios().insertOne(documento);
            return { _id: insertedId, ...documento };
        } catch (error) {
            // El índice único ux_reserva garantiza una reseña por reserva aunque lleguen dos a la vez.
            if (error.code === CLAVE_DUPLICADA) throw ErrorHttp.conflicto('La reserva ya tiene una reseña');
            throw error;
        }
    },

    async eliminar(id) {
        const { deletedCount } = await comentarios().deleteOne({ _id: new ObjectId(id) });
        return deletedCount > 0;
    },

    /** Promedio de calificación y total de reseñas de una mesa. */
    async resumenMesa(idMesa) {
        const [resumen] = await comentarios().aggregate([
            { $match: { 'mesa.idMesa': idMesa } },
            { $group: { _id: null, promedio: { $avg: '$calificacion' }, total: { $sum: 1 } } },
            { $project: { _id: 0, promedio: redondear('$promedio'), total: 1 } }
        ]).toArray();
        return resumen ?? { promedio: null, total: 0 };
    },

    /** Pipeline de agregación: promedio general y por aspecto de cada zona. */
    async resumenPorZona() {
        return comentarios().aggregate([
            {
                $group: {
                    _id: '$mesa.zona',
                    resenas: { $sum: 1 },
                    general: { $avg: '$calificacion' },
                    comida: { $avg: '$aspectos.comida' },
                    servicio: { $avg: '$aspectos.servicio' },
                    ambiente: { $avg: '$aspectos.ambiente' }
                }
            },
            {
                $project: {
                    _id: 0,
                    zona: '$_id',
                    resenas: 1,
                    general: redondear('$general'),
                    comida: redondear('$comida'),
                    servicio: redondear('$servicio'),
                    ambiente: redondear('$ambiente')
                }
            },
            { $sort: { general: -1, zona: 1 } }
        ]).toArray();
    }
};
