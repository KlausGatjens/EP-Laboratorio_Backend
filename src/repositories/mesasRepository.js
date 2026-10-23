import { pool, sql } from '../db/sqlserver.js';

const COLUMNAS = 'idMesa, numero, capacidad, activa, fechaCreacion';
const parametros = (request, { numero, capacidad, activa = true }) => request
    .input('numero', sql.Int, numero)
    .input('capacidad', sql.Int, capacidad)
    .input('activa', sql.Bit, activa);

export const mesasRepository = {
    async listar() {
        const { recordset } = await pool.request().query(`SELECT ${COLUMNAS} FROM dbo.Mesas ORDER BY numero`);
        return recordset;
    },
    async obtener(id) {
        const { recordset } = await pool.request().input('id', sql.Int, id)
            .query(`SELECT ${COLUMNAS} FROM dbo.Mesas WHERE idMesa = @id`);
        return recordset[0] ?? null;
    },
    async crear(datos) {
        const { recordset } = await parametros(pool.request(), datos)
            .query(`INSERT INTO dbo.Mesas (numero, capacidad, activa)
                OUTPUT INSERTED.* VALUES (@numero, @capacidad, @activa)`);
        return recordset[0];
    },
    async actualizar(id, datos) {
        const { recordset } = await parametros(pool.request().input('id', sql.Int, id), datos)
            .query(`UPDATE dbo.Mesas SET numero = @numero, capacidad = @capacidad, activa = @activa
                OUTPUT INSERTED.* WHERE idMesa = @id`);
        return recordset[0] ?? null;
    },
    async eliminar(id) {
        const { rowsAffected } = await pool.request().input('id', sql.Int, id)
            .query('DELETE FROM dbo.Mesas WHERE idMesa = @id');
        return rowsAffected[0] > 0;
    }
};
