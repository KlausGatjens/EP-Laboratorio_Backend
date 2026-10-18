import { pool, sql } from '../db/sqlserver.js';

/**
 * Acceso a datos de las reservas.
 * - Lecturas: vista dbo.vw_ReservasDetalle (JOIN con Mesas, Zonas y Usuarios).
 * - Escrituras: SOLO mediante procedimientos almacenados transaccionales, que
 *   aplican las reglas del negocio (horario, capacidad, cruces de horario):
 *   dbo.RegistrarReserva, dbo.ActualizarReserva y dbo.CancelarReserva.
 */
const COLUMNAS = `idReserva, idMesa, numeroMesa, zona, idUsuario, cliente, correoCliente,
                  fechaInicio, fechaFin, numeroPersonas, observaciones, fechaCreacion`;

const parametrosReserva = (request, { idMesa, idUsuario, fechaInicio, fechaFin, numeroPersonas, observaciones }) => request
    .input('idMesa', sql.Int, idMesa)
    .input('idUsuario', sql.Int, idUsuario)
    .input('fechaInicio', sql.DateTime2(0), new Date(fechaInicio))
    .input('fechaFin', sql.DateTime2(0), new Date(fechaFin))
    .input('numeroPersonas', sql.Int, numeroPersonas)
    .input('observaciones', sql.NVarChar(200), observaciones ?? null);

export const reservasRepository = {
    async listar({ idMesa, idUsuario, desde, hasta } = {}) {
        const request = pool.request();
        const condiciones = [];
        if (idMesa !== undefined) {
            request.input('idMesa', sql.Int, idMesa);
            condiciones.push('idMesa = @idMesa');
        }
        if (idUsuario !== undefined) {
            request.input('idUsuario', sql.Int, idUsuario);
            condiciones.push('idUsuario = @idUsuario');
        }
        if (desde) {
            request.input('desde', sql.DateTime2(0), new Date(desde));
            condiciones.push('fechaFin > @desde');
        }
        if (hasta) {
            request.input('hasta', sql.DateTime2(0), new Date(hasta));
            condiciones.push('fechaInicio < @hasta');
        }
        const filtro = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
        const { recordset } = await request.query(
            `SELECT ${COLUMNAS} FROM dbo.vw_ReservasDetalle ${filtro} ORDER BY fechaInicio`
        );
        return recordset;
    },

    async obtener(id) {
        const { recordset } = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT ${COLUMNAS} FROM dbo.vw_ReservasDetalle WHERE idReserva = @id`);
        return recordset[0] ?? null;
    },

    /** Ejecuta el procedimiento almacenado que valida las reglas y registra la reserva. */
    async crear(datos) {
        const { recordset } = await parametrosReserva(pool.request(), datos)
            .execute('dbo.RegistrarReserva');
        return recordset[0];
    },

    async actualizar(id, datos) {
        const { recordset } = await parametrosReserva(pool.request().input('idReserva', sql.Int, id), datos)
            .execute('dbo.ActualizarReserva');
        return recordset[0];
    },

    /** El procedimiento lanza 50011 si no existe y 50012 si ya empezó. */
    async cancelar(id) {
        await pool.request()
            .input('idReserva', sql.Int, id)
            .execute('dbo.CancelarReserva');
    }
};
