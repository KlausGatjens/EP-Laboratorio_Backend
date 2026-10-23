import { pool, sql } from '../db/sqlserver.js';

/** Acceso a datos de la tabla dbo.Clientes: los clientes del restaurante (patrón Repository). */
const COLUMNAS = 'idCliente, nombres, apellidos, correo, telefono, fechaRegistro';
const INSERTADAS = COLUMNAS.split(', ').map((columna) => `INSERTED.${columna}`).join(', ');

const parametrosCliente = (request, { nombres, apellidos, correo, telefono }) => request
    .input('nombres', sql.NVarChar(60), nombres)
    .input('apellidos', sql.NVarChar(60), apellidos)
    .input('correo', sql.NVarChar(150), correo)
    .input('telefono', sql.VarChar(15), telefono);

export const clientesRepository = {
    async listar() {
        const { recordset } = await pool.request()
            .query(`SELECT ${COLUMNAS} FROM dbo.Clientes ORDER BY apellidos, nombres`);
        return recordset;
    },

    async obtener(id) {
        const { recordset } = await pool.request()
            .input('id', sql.Int, id)
            .query(`SELECT ${COLUMNAS} FROM dbo.Clientes WHERE idCliente = @id`);
        return recordset[0] ?? null;
    },

    async crear(datos) {
        const { recordset } = await parametrosCliente(pool.request(), datos)
            .query(`INSERT INTO dbo.Clientes (nombres, apellidos, correo, telefono)
                    OUTPUT ${INSERTADAS}
                    VALUES (@nombres, @apellidos, @correo, @telefono)`);
        return recordset[0];
    },

    async actualizar(id, datos) {
        const { recordset } = await parametrosCliente(pool.request().input('id', sql.Int, id), datos)
            .query(`UPDATE dbo.Clientes
                    SET nombres = @nombres, apellidos = @apellidos, correo = @correo, telefono = @telefono
                    OUTPUT ${INSERTADAS}
                    WHERE idCliente = @id`);
        return recordset[0] ?? null;
    },

    async eliminar(id) {
        const { rowsAffected } = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dbo.Clientes WHERE idCliente = @id');
        return rowsAffected[0] > 0;
    }
};
