import { pool, sql } from '../db/sqlserver.js';
import { ErrorHttp } from '../utils/ErrorHttp.js';

const parametros = (request, datos) => request
    .input('idMesa', sql.Int, datos.idMesa)
    .input('idCliente', sql.Int, datos.idCliente)
    .input('fechaInicio', sql.DateTime2(0), new Date(datos.fechaInicio))
    .input('fechaFin', sql.DateTime2(0), new Date(datos.fechaFin))
    .input('numeroPersonas', sql.Int, datos.numeroPersonas)
    .input('observaciones', sql.NVarChar(200), datos.observaciones ?? null);

export const reservasRepository = {
    async listar() {
        const { recordset } = await pool.request().query('SELECT * FROM dbo.Reservas ORDER BY fechaInicio');
        return recordset;
    },
    async obtener(id) {
        const { recordset } = await pool.request().input('id', sql.Int, id)
            .query('SELECT * FROM dbo.Reservas WHERE idReserva = @id');
        return recordset[0] ?? null;
    },
    async crear(datos) {
        const { recordset } = await parametros(pool.request(), datos).execute('dbo.RegistrarReserva');
        return recordset[0];
    },
    async actualizar(id, datos) {
        const { recordset } = await parametros(pool.request().input('idReserva', sql.Int, id), datos)
            .execute('dbo.ActualizarReserva');
        return recordset[0];
    },
    async cancelar(id) {
        const { rowsAffected } = await pool.request().input('id', sql.Int, id)
            .query('DELETE FROM dbo.Reservas WHERE idReserva = @id');
        if (!rowsAffected[0]) throw ErrorHttp.noEncontrado('La reserva no existe');
    }
};
